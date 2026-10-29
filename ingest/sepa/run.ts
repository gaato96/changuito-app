// Ingesta de SEPA (datos oficiales): Vea, Jumbo y La Anónima en el Gran San Miguel de Tucumán.
//   node ingest/sepa/run.ts                 procesa el archivo más nuevo de CKAN si no se procesó antes
//   node ingest/sepa/run.ts --file=x.zip    procesa un ZIP local (pruebas)
//   node ingest/sepa/run.ts --force         procesa aunque ya se haya procesado
import { parseArgs } from 'node:util';
import { createWriteStream, mkdirSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { connect } from '../shared/db.ts';
import { categoryIds, finishRun, markMissingUnavailable, startRun, upsertPrices, upsertProducts, type ProductRecord } from '../shared/store.ts';
import { loadCategoryConfig, makeKeywordClassifier } from '../shared/categories.ts';
import { parseSepaPromo } from '../shared/promos.ts';
import type { Entry } from 'yauzl';
import { entries, openBuffer, openFile, openStream, readAll } from './zip.ts';
import { csvParser, pickSucursales, readRecords, toRow, type SepaRow, type Sucursal } from './parse.ts';

const CKAN = 'https://datos.produccion.gob.ar/api/3/action/package_show?id=sepa-precios';
const { values: args } = parseArgs({ options: { file: { type: 'string' }, force: { type: 'boolean', default: false } } });
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

type Resource = { name: string; url: string; last_modified: string | null; created: string };

/** El archivo diario más nuevo (sepa_lunes.zip … sepa_domingo.zip). */
async function latestResource(): Promise<Resource> {
  const res = await fetch(CKAN, { signal: AbortSignal.timeout(60_000) });
  const data = (await res.json()) as { result: { resources: Resource[] } };
  const days = data.result.resources.filter(r => /sepa_[a-záéíóú]+\.zip$/i.test(r.url));
  if (!days.length) throw new Error('CKAN: no se encontraron los archivos diarios de SEPA');
  return days.sort((a, b) => (b.last_modified ?? b.created).localeCompare(a.last_modified ?? a.created))[0];
}

async function download(url: string, dest: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15 * 60_000) });
  if (!res.ok || !res.body) throw new Error(`Descarga SEPA HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
}

/** Recorre el ZIP y devuelve sucursales del Gran SMT y sus filas de productos. */
async function extract(path: string, stats: Record<string, unknown>) {
  const outer = await openFile(path);
  const sucursales: Sucursal[] = [];
  const rows: SepaRow[] = [];
  const skipped: string[] = [];
  for await (const entry of entries(outer)) {
    if (!entry.fileName.toLowerCase().endsWith('.zip')) continue;
    let inner;
    try {
      inner = await openBuffer(await readAll(outer, entry));
    } catch {
      skipped.push(entry.fileName);   // Fase 0: algunos días vienen ZIP internos vacíos
      continue;
    }
    // Primero se listan las entradas; después se leen en el orden que conviene
    const files = new Map<string, Entry>();
    for await (const e of entries(inner)) files.set(e.fileName.toLowerCase().split('/').pop()!, e);
    const zip = inner;
    const read = async (name: string) => {
      const e = files.get(name);
      return e ? openStream(zip, e) : null;
    };
    const com = await read('comercio.csv'), suc = await read('sucursales.csv');
    if (!com || !suc) continue;
    const picked = pickSucursales(await readRecords(com), await readRecords(suc));
    if (!picked.length) continue;
    sucursales.push(...picked);
    const keys = new Set(picked.map(s => s.key));
    const prod = await read('productos.csv');
    if (!prod) continue;
    for await (const r of prod.pipe(csvParser())) {
      const rec = r as Record<string, string>;
      if (!keys.has(`${rec.id_comercio}-${rec.id_bandera}-${rec.id_sucursal}`)) continue;
      const row = toRow(rec);
      if (row) rows.push(row);
    }
    log(`${entry.fileName.split('/').pop()}: ${picked.length} sucursales, ${rows.length} filas acumuladas`);
  }
  outer.close();
  stats.skippedZips = skipped;
  return { sucursales, rows };
}

const sql = connect();
const stats: Record<string, unknown> = {};
const runId = await startRun(sql, 'sepa', null, null);
try {
  let path = args.file;
  if (!path) {
    const res = await latestResource();
    stats.resource = { name: res.name, lastModified: res.last_modified };
    const [prev] = await sql<{ lm: string | null }[]>`
      select stats->'resource'->>'lastModified' as lm from ingest_runs
      where source = 'sepa' and status = 'ok' order by started_at desc limit 1`;
    if (!args.force && prev?.lm && prev.lm === res.last_modified) {
      log(`sin archivo nuevo (${res.name}, ${res.last_modified})`);
      await finishRun(sql, runId, 'skipped', { stats });
      await sql.end();
      process.exit(0);
    }
    mkdirSync('.tmp', { recursive: true });
    path = '.tmp/sepa.zip';
    log(`descargando ${res.name} (${res.last_modified})`);
    await download(res.url, path);
    stats.bytes = statSync(path).size;
  }

  const { sucursales, rows } = await extract(path, stats);
  const chains = await sql<{ id: number; slug: string; zone: number }[]>`
    select c.id, c.slug, z.id as zone from chains c join price_zones z on z.chain_id = c.id and z.is_default where c.source = 'sepa'`;
  const cats = await categoryIds(sql);
  const classify = makeKeywordClassifier(loadCategoryConfig().keywords);
  const captured = new Date();
  let written = 0;
  const perChain: Record<string, unknown> = {};
  const failures: string[] = [];

  for (const chain of chains) {
    const stores = sucursales.filter(s => s.chainSlug === chain.slug);
    if (!stores.length) { failures.push(`${chain.slug}: sin sucursales en el archivo`); continue; }
    for (const s of stores) {
      await sql`insert into stores (chain_id, zone_id, external_id, name, address, locality, lat, lng)
        values (${chain.id}, ${chain.zone}, ${s.key}, ${s.name}, ${s.address}, ${s.locality}, ${s.lat}, ${s.lng})
        on conflict (chain_id, external_id) do update set name = excluded.name, address = excluded.address,
          locality = excluded.locality, lat = excluded.lat, lng = excluded.lng, active = true`;
    }
    const keys = new Set(stores.map(s => s.key));
    const chainRows = rows.filter(r => keys.has(r.storeKey));
    // Precio de la zona: el más repetido entre sucursales; se mide cuántos productos difieren (Fase 0: 0%)
    const byProduct = new Map<string, SepaRow[]>();
    for (const r of chainRows) {
      if (!byProduct.has(r.idProducto)) byProduct.set(r.idProducto, []);
      byProduct.get(r.idProducto)!.push(r);
    }
    let divergent = 0;
    const chosen: SepaRow[] = [];
    for (const list of byProduct.values()) {
      const freq = new Map<number, number>();
      for (const r of list) freq.set(r.listPrice, (freq.get(r.listPrice) ?? 0) + 1);
      if (freq.size > 1) divergent++;
      const top = [...freq].sort((a, b) => b[1] - a[1])[0][0];
      chosen.push(list.find(r => r.listPrice === top)!);
    }
    if (!chosen.length) { failures.push(`${chain.slug}: sin productos`); continue; }

    const records: ProductRecord[] = chosen.map(r => ({
      sku: r.idProducto, ean: r.ean, name: r.name, brand: r.brand, size: r.size,
      categorySlug: classify(r.name), imageUrl: null, weighed: r.weighed, externalPath: null, url: null,
      measurementUnit: r.weighed ? 'kg' : 'un', unitMultiplier: null,
    }));
    const ids = await upsertProducts(sql, chain, records, cats, { trustCategory: false });
    const prices = chosen.map(r => {
      const { unitPrice, promo } = parseSepaPromo(r.promoLegend, r.listPrice, r.promoPrice);
      return {
        sku: r.idProducto, productId: ids.get(r.idProducto)!, price: unitPrice, listPrice: r.listPrice, promo,
        loyalty: null, available: true, size: r.size, weighed: r.weighed,
      };
    });
    written += await upsertPrices(sql, chain.zone, 'sepa', captured, prices);
    const unavailable = await markMissingUnavailable(sql, chain.zone, [...new Set(prices.map(p => p.productId))]);
    const promoKinds: Record<string, number> = {};
    for (const p of prices) promoKinds[p.promo.kind] = (promoKinds[p.promo.kind] ?? 0) + 1;
    perChain[chain.slug] = {
      stores: stores.length, products: chosen.length, divergentAcrossStores: divergent,
      divergentShare: Math.round((divergent / chosen.length) * 1000) / 1000, promos: promoKinds, markedUnavailable: unavailable,
    };
    log(`${chain.slug}: ${stores.length} sucursales, ${chosen.length} productos, ${divergent} con precio distinto entre sucursales`);
  }
  stats.chains = perChain;
  if (failures.length) {
    stats.failures = failures;
    await finishRun(sql, runId, 'failed', { read: rows.length, written, stats, error: failures.join('; ') });
    process.exitCode = 1;
  } else {
    await finishRun(sql, runId, 'ok', { read: rows.length, written, stats });
  }
  log('listo', JSON.stringify(stats));
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  log('ERROR', msg);
  await finishRun(sql, runId, 'failed', { stats, error: msg });
  process.exitCode = 1;
} finally {
  await sql.end();
}
