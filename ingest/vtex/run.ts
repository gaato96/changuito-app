// Ingesta de una cadena VTEX (Carrefour, ChangoMás, Comodín).
//   node ingest/vtex/run.ts --chain=carrefour --mode=full     catálogo completo + precios (1 vez por día)
//   node ingest/vtex/run.ts --chain=carrefour --mode=prices   solo re-simula precios de productos conocidos
// Opciones de prueba: --max-categories=N (recorre solo N categorías), --dry-run (no escribe en la base),
//   --validate=N (compara N productos simulados de a uno contra el resultado en lotes)
import { parseArgs } from 'node:util';
import { connect, type Sql } from '../shared/db.ts';
import { loadCategoryConfig, makeCategoryResolver, topLevelPaths } from '../shared/categories.ts';
import { categoryIds, finishRun, markMissingUnavailable, refreshProductCards, startRun, upsertPrices, upsertProducts, type PriceRecord } from '../shared/store.ts';
import { norm } from '../shared/text.ts';
import { brandKey, isolatedBatches, VtexClient, type CategoryNode, type SimItem } from './client.ts';
import { fromCatalog, fromSimulation, type CatalogItem } from './normalize.ts';
import type { Size } from '../shared/units.ts';

const { values: args } = parseArgs({
  options: {
    chain: { type: 'string' },
    mode: { type: 'string', default: 'full' },
    'max-categories': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    validate: { type: 'string' },
  },
});

/** Mínimo de coincidencia catálogo vs. carrito para dar por buena la región (Fase 0: 90–98%). */
const MIN_REGION_AGREEMENT = 0.75;
/** En modo precios, si cambia más que esto de una corrida a otra, algo raro pasó con la región. */
const MAX_CHANGED_SHARE = 0.6;

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

type Target = { sku: string; brand: string | null; teasers: string[] };

/** Tope de lotes de la primera pasada: con marcas muy grandes (Carrefour tiene 1.239 productos propios) se comparten lotes. */
const TARGET_BATCHES = 250;

async function simulateBatches(client: VtexClient, batches: Target[][], s2: Map<string, SimItem>, s3: Map<string, SimItem>) {
  for (const [i, b] of batches.entries()) {
    const skus = b.map(t => t.sku);
    for (const [k, v] of await client.simulate(skus, 2)) s2.set(k, v);
    for (const [k, v] of await client.simulate(skus, 3)) s3.set(k, v);
    if ((i + 1) % 50 === 0) log(`  lote ${i + 1}/${batches.length}`);
  }
}

async function simulateAll(client: VtexClient, targets: Target[]): Promise<Map<string, PriceRecord>> {
  const sizes = new Map<string, number>();
  for (const t of targets) sizes.set(brandKey(t.brand, t.sku), (sizes.get(brandKey(t.brand, t.sku)) ?? 0) + 1);
  const maxPerBrand = Math.max(1, Math.ceil(Math.max(0, ...sizes.values()) / TARGET_BATCHES));
  const batches = isolatedBatches(targets, 100, maxPerBrand);
  log(`simulando ${targets.length} productos en ${batches.length} lotes (x2 cantidades, hasta ${maxPerBrand} por marca)`);
  const s2 = new Map<string, SimItem>(), s3 = new Map<string, SimItem>();
  await simulateBatches(client, batches, s2, s3);
  const price = (t: Target) => fromSimulation(t.sku, s2.get(t.sku), s3.get(t.sku), t.teasers, chainSlug);

  // Segunda pasada: los que salieron con promo compartiendo lote con su marca se re-simulan aislados,
  // por si la promo era "Combinable" y venía de otro producto del lote
  const suspects = batches.flatMap(b => {
    const count = new Map<string, number>();
    for (const t of b) count.set(brandKey(t.brand, t.sku), (count.get(brandKey(t.brand, t.sku)) ?? 0) + 1);
    // Los descuentos directos (%) son por producto; solo las promos por cantidad pueden venir "combinadas"
    return b.filter(t => count.get(brandKey(t.brand, t.sku))! > 1 && ['nth_pct', 'nxm'].includes(price(t).promo.kind));
  });
  if (suspects.length) {
    const again = isolatedBatches(suspects, 100, 1);
    log(`re-simulando ${suspects.length} productos con promo en ${again.length} lotes aislados`);
    await simulateBatches(client, again, s2, s3);
  }
  stats.simulation = { batches: batches.length, maxPerBrand, resimulated: suspects.length };
  const result = new Map(targets.map(t => [t.sku, price(t)]));

  // Control de calidad: una muestra simulada de a un producto (la "verdad") contra el resultado en lotes
  const n = Number(args.validate ?? 0);
  if (n > 0) {
    const withPromo = targets.filter(t => result.get(t.sku)!.promo.kind !== 'none');
    const sample = [...withPromo.slice(0, Math.ceil(n / 2)), ...targets.filter((_, i) => i % 37 === 0)].slice(0, n);
    let ok = 0;
    const diffs: string[] = [];
    for (const t of sample) {
      const a = await client.simulate([t.sku], 2), b = await client.simulate([t.sku], 3);
      const truth = fromSimulation(t.sku, a.get(t.sku), b.get(t.sku), t.teasers, chainSlug);
      const got = result.get(t.sku)!;
      if (truth.price === got.price && truth.promo.kind === got.promo.kind && truth.promo.value === got.promo.value) ok++;
      else diffs.push(`${t.sku}: lote ${got.price} ${got.promo.text ?? '-'} / individual ${truth.price} ${truth.promo.text ?? '-'}`);
    }
    stats.validation = { sample: sample.length, ok, diffs: diffs.slice(0, 10) };
    log(`validación: ${ok}/${sample.length} coinciden con la simulación individual`);
  }
  return result;
}

function findTopNodes(tree: CategoryNode[], paths: string[]): CategoryNode[] {
  const wanted = new Set(paths.map(p => norm(p.replaceAll('/', ''))));
  const nodes = tree.filter(n => wanted.has(norm(n.name)));
  const missing = [...wanted].filter(w => !nodes.some(n => norm(n.name) === w));
  if (missing.length) log('AVISO: categorías configuradas que ya no existen en la web:', missing.join(', '));
  return nodes;
}

const chainSlug = args.chain ?? '';
const sql: Sql = connect();
const [chain] = await sql<{ id: number; slug: string; base_url: string }[]>`select id, slug, base_url from chains where slug = ${chainSlug} and source = 'vtex'`;
if (!chain) throw new Error(`Cadena VTEX desconocida: ${chainSlug}`);
const [zone] = await sql<{ id: number }[]>`select id from price_zones where chain_id = ${chain.id} and is_default`;
const mode = args.mode === 'prices' ? 'prices' : 'full';
const runId = args['dry-run'] ? 0 : await startRun(sql, 'vtex', chain.id, mode);
const started = new Date();
const client = new VtexClient(chain.base_url);
const stats: Record<string, unknown> = {};

try {
  const region = await client.useRegion();
  stats.region = region.sellers.slice(0, 12);
  let items: CatalogItem[] = [];
  let targets: Target[];

  if (mode === 'full') {
    const cfg = loadCategoryConfig();
    const chainMap = cfg.map[chain.slug];
    const resolve = makeCategoryResolver(chainMap);
    let nodes = findTopNodes(await client.categoryTree(), topLevelPaths(chainMap));
    if (args['max-categories']) nodes = nodes.slice(0, Number(args['max-categories']));
    const bySku = new Map<string, CatalogItem>();
    let read = 0;
    for (const node of nodes) {
      for await (const page of client.crawlCategory(node)) {
        for (const p of page) {
          read++;
          const it = fromCatalog(p, chain.base_url, resolve);
          if (it && !bySku.has(it.sku)) bySku.set(it.sku, it);
        }
      }
      log(`${node.name}: acumulado ${bySku.size} disponibles (${read} leídos)`);
    }
    items = [...bySku.values()];
    stats.catalogRead = read;
    stats.available = items.length;
    stats.uncategorized = items.filter(i => !i.categorySlug).length;
    targets = items.map(i => ({ sku: i.sku, brand: i.brand, teasers: i.teasers }));
  } else {
    // Modo precios: productos vistos en los últimos 3 días
    const rows = await sql<{ sku: string; brand: string | null; loyalty: string | null }[]>`
      select cp.external_sku as sku, p.brand, pc.loyalty
      from chain_products cp join products p on p.id = cp.product_id
      left join prices_current pc on pc.product_id = cp.product_id and pc.zone_id = ${zone.id}
      where cp.chain_id = ${chain.id} and cp.last_seen_at > now() - interval '3 days'`;
    // Sin el catálogo no hay teasers: se conserva la marca "Mi Carrefour" que ya tenía el producto
    targets = rows.map(r => ({ sku: r.sku, brand: r.brand, teasers: r.loyalty === 'mi_carrefour' ? ['Mi Crf'] : [] }));
    stats.known = targets.length;
  }

  const prices = await simulateAll(client, targets);
  const promoCount: Record<string, number> = {};
  for (const p of prices.values()) if (p.available) promoCount[p.promo.kind] = (promoCount[p.promo.kind] ?? 0) + 1;
  stats.promos = promoCount;
  stats.unavailableAtCheckout = [...prices.values()].filter(p => !p.available).length;

  // Verificación de región
  if (mode === 'full') {
    let compared = 0, agree = 0;
    for (const it of items) {
      const p = prices.get(it.sku);
      if (!p?.available || it.weighed || p.promo.kind !== 'none') continue;
      compared++;
      if (Math.abs(it.catalogPrice - p.listPrice) < 0.5) agree++;
    }
    stats.regionCheck = { compared, agree, share: compared ? Math.round((agree / compared) * 1000) / 1000 : null };
    if (compared < 50 || agree / compared < MIN_REGION_AGREEMENT) {
      throw new Error(`Verificación de región fallida: catálogo y carrito coinciden en ${agree} de ${compared}`);
    }
  } else {
    const prev = new Map((await sql<{ sku: string; price: string }[]>`
      select cp.external_sku as sku, pc.list_price as price from chain_products cp
      join prices_current pc on pc.product_id = cp.product_id and pc.zone_id = ${zone.id} and pc.available
      where cp.chain_id = ${chain.id}`).map(r => [r.sku, Number(r.price)]));
    let compared = 0, changed = 0;
    for (const [sku, p] of prices) {
      const before = prev.get(sku);
      if (!p.available || before === undefined) continue;
      compared++;
      if (Math.abs(before - p.listPrice) >= 0.5) changed++;
    }
    stats.regionCheck = { compared, changed };
    if (compared >= 50 && changed / compared > MAX_CHANGED_SHARE) {
      throw new Error(`Cambiaron ${changed} de ${compared} precios desde la corrida anterior: posible cambio de región`);
    }
  }
  stats.requests = client.requests;

  if (args['dry-run']) {
    log('dry-run', JSON.stringify(stats));
    const sample = [...prices.values()].filter(p => p.promo.kind !== 'none').slice(0, 10);
    for (const p of sample) log('  ', p.sku, p.listPrice, '→', p.price, p.promo.text, p.loyalty ?? '');
  } else {
    let skuToProduct: Map<string, number>;
    let meta: Map<string, { size: Size | null; weighed: boolean }>;
    if (mode === 'full') {
      skuToProduct = await upsertProducts(sql, chain, items, await categoryIds(sql));
      meta = new Map(items.map(i => [i.sku, { size: i.size, weighed: i.weighed }]));
    } else {
      const rows = await sql<{ sku: string; product_id: string; size_value: string | null; size_unit: Size['unit'] | null; kind: string }[]>`
        select cp.external_sku as sku, cp.product_id, p.size_value, p.size_unit, p.kind
        from chain_products cp join products p on p.id = cp.product_id where cp.chain_id = ${chain.id}`;
      skuToProduct = new Map(rows.map(r => [r.sku, Number(r.product_id)]));
      meta = new Map(rows.map(r => [r.sku, { size: r.size_value ? { value: Number(r.size_value), unit: r.size_unit! } : null, weighed: r.kind === 'weighed' }]));
    }
    const rows = [...prices.values()].filter(p => p.available && skuToProduct.has(p.sku))
      .map(p => ({ ...p, productId: skuToProduct.get(p.sku)!, ...meta.get(p.sku)! }));
    const written = await upsertPrices(sql, zone.id, 'vtex-sim', started, rows);
    const seen = [...new Set(rows.map(r => r.productId))];
    // Con --max-categories el recorrido es parcial: no se puede inferir qué dejó de venderse
    if (!args['max-categories']) stats.markedUnavailable = await markMissingUnavailable(sql, zone.id, seen);
    await refreshProductCards(sql);
    await finishRun(sql, runId, 'ok', { read: targets.length, written, stats });
    log(`listo: ${written} precios escritos`, JSON.stringify(stats));
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  log('ERROR', msg);
  if (runId) await finishRun(sql, runId, 'failed', { stats, error: msg });
  process.exitCode = 1;
} finally {
  await sql.end();
}
