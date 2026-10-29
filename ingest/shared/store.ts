// Escritura en la base: productos canónicos, productos por cadena, precios actuales y registro de corridas.
import type { Sql } from './db.ts';
import { inBatches } from './db.ts';
import type { Promo } from './promos.ts';
import type { Size } from './units.ts';
import { unitPrice } from './units.ts';
import { norm } from './text.ts';

/** Prioridad del nombre e imagen del producto canónico (menor = mejor). PLAN.md §5.1 */
export const NAME_PRIORITY: Record<string, number> = { carrefour: 1, changomas: 2, vea: 3, jumbo: 3, comodin: 4, 'la-anonima': 4 };

export type ProductRecord = {
  sku: string;
  ean: string | null;              // EAN-13 universal; null si es interno
  name: string;
  brand: string | null;
  size: Size | null;
  categorySlug: string | null;
  imageUrl: string | null;
  weighed: boolean;
  externalPath: string | null;
  url: string | null;
  measurementUnit: string | null;
  unitMultiplier: number | null;
};

export type PriceRecord = {
  sku: string;
  price: number;                   // 1 unidad (o 1 kg) con descuento directo
  listPrice: number;
  promo: Promo;
  loyalty: 'mi_carrefour' | null;
  available: boolean;
};

export async function startRun(sql: Sql, source: string, chainId: number | null, mode: string | null): Promise<number> {
  const [r] = await sql<{ id: number }[]>`insert into ingest_runs (source, chain_id, mode) values (${source}, ${chainId}, ${mode}) returning id`;
  return r.id;
}

export async function finishRun(sql: Sql, id: number, status: 'ok' | 'failed' | 'skipped', data: { read?: number; written?: number; stats?: object; error?: string }) {
  await sql`update ingest_runs set finished_at = now(), status = ${status}, items_read = ${data.read ?? null},
    items_written = ${data.written ?? null}, stats = ${sql.json((data.stats ?? {}) as never)}, error = ${data.error ?? null}
    where id = ${id}`;
}

/** Recalcula el resumen por producto que usa la app (vista materializada product_cards). */
export async function refreshProductCards(sql: Sql) {
  await sql`select refresh_product_cards()`;
}

export async function categoryIds(sql: Sql): Promise<Map<string, number>> {
  return new Map((await sql<{ id: number; slug: string }[]>`select id, slug from categories`).map(c => [c.slug, c.id]));
}

/**
 * Da de alta o actualiza los productos canónicos y los productos de la cadena.
 * Devuelve sku → product_id.
 */
export async function upsertProducts(
  sql: Sql, chain: { id: number; slug: string }, records: ProductRecord[], cats: Map<string, number>,
  opts: { trustCategory?: boolean } = {},
): Promise<Map<string, number>> {
  // SEPA no trae categorías: la que adivina por palabras clave solo completa productos sin categoría
  const trustCategory = opts.trustCategory ?? true;
  const prio = NAME_PRIORITY[chain.slug] ?? 9;
  const row = (r: ProductRecord) => ({
    ean: r.ean, origin_chain: r.ean ? null : chain.id, origin_sku: r.ean ? null : r.sku,
    name: r.name, brand: r.brand, size_value: r.size?.value ?? null, size_unit: r.size?.unit ?? null,
    category_id: r.categorySlug ? cats.get(r.categorySlug) ?? null : null, image_url: r.imageUrl,
    kind: r.weighed ? 'weighed' : 'packaged', name_source: prio, name_norm: norm(`${r.name} ${r.brand ?? ''}`),
  });
  const cols = sql`r.ean, r.origin_chain, r.origin_sku, r.name, r.brand, r.size_value, r.size_unit, r.category_id, r.image_url, r.kind, r.name_source, r.name_norm`;
  const recordset = sql`(ean text, origin_chain smallint, origin_sku text, name text, brand text, size_value numeric, size_unit text,
    category_id smallint, image_url text, kind text, name_source smallint, name_norm text)`;
  // Si la fuente es de igual o mejor prioridad, pisa nombre, imagen y talle; la categoría se completa si faltaba.
  const update = sql`
    name       = case when excluded.name_source <= products.name_source then excluded.name else products.name end,
    brand      = case when excluded.name_source <= products.name_source then coalesce(excluded.brand, products.brand) else products.brand end,
    image_url  = case when excluded.name_source <= products.name_source then coalesce(excluded.image_url, products.image_url) else products.image_url end,
    size_value = case when excluded.name_source <= products.name_source and excluded.size_value is not null then excluded.size_value else coalesce(products.size_value, excluded.size_value) end,
    size_unit  = case when excluded.name_source <= products.name_source and excluded.size_value is not null then excluded.size_unit else coalesce(products.size_unit, excluded.size_unit) end,
    category_id = case when ${trustCategory}::boolean and excluded.name_source <= products.name_source and excluded.category_id is not null
      then excluded.category_id else coalesce(products.category_id, excluded.category_id) end,
    name_norm  = case when excluded.name_source <= products.name_source then excluded.name_norm else products.name_norm end,
    name_source = least(products.name_source, excluded.name_source),
    updated_at = now()`;

  // Un mismo EAN puede venir dos veces de la misma cadena (SKU duplicados): se queda el primero
  const seen = new Set<string>();
  const withEan = records.filter(r => r.ean && !seen.has(r.ean) && seen.add(r.ean)).map(row);
  const internal = records.filter(r => !r.ean).map(row);
  await inBatches(withEan, 1000, chunk => sql`
    insert into products (ean, origin_chain, origin_sku, name, brand, size_value, size_unit, category_id, image_url, kind, name_source, name_norm)
    select ${cols} from jsonb_to_recordset(${sql.json(chunk as never)}) as r${recordset}
    on conflict (ean) do update set ${update}`);
  await inBatches(internal, 1000, chunk => sql`
    insert into products (ean, origin_chain, origin_sku, name, brand, size_value, size_unit, category_id, image_url, kind, name_source, name_norm)
    select ${cols} from jsonb_to_recordset(${sql.json(chunk as never)}) as r${recordset}
    on conflict (origin_chain, origin_sku) do update set ${update}`);

  // Ids
  const ids = new Map<string, number>();
  const eans = [...new Set(records.filter(r => r.ean).map(r => r.ean!))];
  const byEan = new Map<string, number>();
  await inBatches(eans, 5000, async chunk => {
    for (const p of await sql<{ id: number; ean: string }[]>`select id, ean from products where ean = any(${chunk})`) byEan.set(p.ean, Number(p.id));
  });
  for (const p of await sql<{ id: number; origin_sku: string }[]>`select id, origin_sku from products where origin_chain = ${chain.id}`) ids.set(p.origin_sku, Number(p.id));
  for (const r of records) if (r.ean) ids.set(r.sku, byEan.get(r.ean)!);

  const cp = records.map(r => ({
    chain_id: chain.id, external_sku: r.sku, product_id: ids.get(r.sku), raw_name: r.name, external_path: r.externalPath,
    url: r.url, measurement_unit: r.measurementUnit, unit_multiplier: r.unitMultiplier,
  }));
  await inBatches(cp, 1000, chunk => sql`
    insert into chain_products (chain_id, external_sku, product_id, raw_name, external_path, url, measurement_unit, unit_multiplier, last_seen_at)
    select r.chain_id, r.external_sku, r.product_id, r.raw_name, r.external_path, r.url, r.measurement_unit, r.unit_multiplier, now()
    from jsonb_to_recordset(${sql.json(chunk as never)}) as r(chain_id smallint, external_sku text, product_id bigint, raw_name text,
      external_path text, url text, measurement_unit text, unit_multiplier numeric)
    on conflict (chain_id, external_sku) do update set product_id = excluded.product_id, raw_name = excluded.raw_name,
      external_path = excluded.external_path, url = excluded.url, measurement_unit = excluded.measurement_unit,
      unit_multiplier = excluded.unit_multiplier, last_seen_at = now()`);
  return ids;
}

/** Escribe precios actuales de una zona. El trigger guarda el historial solo si cambió algo. */
export async function upsertPrices(sql: Sql, zoneId: number, source: string, capturedAt: Date, prices: (PriceRecord & { productId: number; size: Size | null; weighed: boolean })[]): Promise<number> {
  // Si dos SKU apuntan al mismo producto, gana el más barato disponible
  const byProduct = new Map<number, (typeof prices)[number]>();
  for (const p of prices) {
    const prev = byProduct.get(p.productId);
    if (!prev || (p.available && (!prev.available || p.price < prev.price))) byProduct.set(p.productId, p);
  }
  const rows = [...byProduct.values()].map(p => {
    const up = p.weighed ? { unitPrice: p.price, label: 'kg' as const } : unitPrice(p.price, p.size);
    return {
      zone_id: zoneId, product_id: p.productId, price: p.price, list_price: p.listPrice,
      unit_price: up?.unitPrice ?? null, unit_label: up?.label ?? null, sold_by_weight: p.weighed,
      promo_kind: p.promo.kind, promo_min_qty: p.promo.minQty, promo_value: p.promo.value, promo_text: p.promo.text,
      loyalty: p.loyalty, available: p.available, source, captured_at: capturedAt.toISOString(),
    };
  });
  await inBatches(rows, 1000, chunk => sql`
    insert into prices_current (zone_id, product_id, price, list_price, unit_price, unit_label, sold_by_weight, promo_kind,
      promo_min_qty, promo_value, promo_text, loyalty, available, source, captured_at)
    select * from jsonb_to_recordset(${sql.json(chunk as never)}) as r(zone_id smallint, product_id bigint, price numeric, list_price numeric,
      unit_price numeric, unit_label text, sold_by_weight boolean, promo_kind text, promo_min_qty smallint, promo_value numeric,
      promo_text text, loyalty text, available boolean, source text, captured_at timestamptz)
    on conflict (zone_id, product_id) do update set price = excluded.price, list_price = excluded.list_price,
      unit_price = excluded.unit_price, unit_label = excluded.unit_label, sold_by_weight = excluded.sold_by_weight,
      promo_kind = excluded.promo_kind, promo_min_qty = excluded.promo_min_qty, promo_value = excluded.promo_value,
      promo_text = excluded.promo_text, loyalty = excluded.loyalty, available = excluded.available,
      source = excluded.source, captured_at = excluded.captured_at`);
  return rows.length;
}

/** Marca como no disponibles los productos de la zona que no aparecieron en esta corrida. */
export async function markMissingUnavailable(sql: Sql, zoneId: number, seenProductIds: number[]): Promise<number> {
  const r = await sql`update prices_current set available = false
    where zone_id = ${zoneId} and available and not (product_id = any(${seenProductIds}))`;
  return r.count;
}
