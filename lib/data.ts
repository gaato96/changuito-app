// Lecturas del catálogo en Supabase (servidor y cliente). Todo con la clave pública.
import { supabase } from './supabase';
import { toPrice } from './catalog';
import type { Price } from './pricing';

export type ProductCard = {
  id: number; name: string; brand: string | null; image_url: string | null; size_value: number | null; size_unit: string | null;
  category_id: number | null; kind: 'packaged' | 'weighed'; min_price: number; min_chain_id: number; min_unit_price: number | null;
  unit_label: 'kg' | 'l' | 'u' | null; chains_count: number; has_promo: boolean;
};

export type Product = Omit<ProductCard, 'min_price' | 'min_chain_id' | 'min_unit_price' | 'unit_label' | 'chains_count' | 'has_promo'> & { ean: string | null };

export type HistoryPoint = { chainId: number; at: string; price: number };

export type Sort = 'relevance' | 'price' | 'unit_price';

export async function searchProducts(opts: { q?: string; categoryId?: number; brand?: string; sort?: Sort; limit?: number; offset?: number }): Promise<ProductCard[]> {
  const { data, error } = await supabase.rpc('search_products', {
    q: opts.q?.trim() || null, cat: opts.categoryId ?? null, brand_filter: opts.brand || null,
    sort: opts.sort ?? 'relevance', lim: opts.limit ?? 30, off: opts.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normCard);
}

const normCard = (r: Record<string, unknown>): ProductCard => ({
  ...(r as ProductCard), id: Number(r.id), min_price: Number(r.min_price),
  min_unit_price: r.min_unit_price === null ? null : Number(r.min_unit_price),
  size_value: r.size_value === null ? null : Number(r.size_value),
});

export async function categoryBrands(categoryId: number): Promise<{ brand: string; n: number }[]> {
  const { data } = await supabase.rpc('category_brands', { cat: categoryId });
  return (data ?? []).map((r: { brand: string; n: number }) => ({ brand: r.brand, n: Number(r.n) }));
}

export async function getProduct(id: number): Promise<Product | null> {
  const { data } = await supabase.from('products')
    .select('id, ean, name, brand, image_url, size_value, size_unit, category_id, kind').eq('id', id).maybeSingle();
  return data ? { ...data, size_value: data.size_value === null ? null : Number(data.size_value) } as Product : null;
}

export async function getProductPrices(id: number): Promise<Price[]> {
  const { data, error } = await supabase.rpc('prices_for', { ids: [id] });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toPrice);
}

export async function getHistory(id: number, days = 60): Promise<HistoryPoint[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const [{ data: zones }, { data }] = await Promise.all([
    supabase.from('price_zones').select('id, chain_id'),
    // El último punto anterior a la ventana también sirve: marca el precio con el que arranca el gráfico
    supabase.from('price_history').select('zone_id, valid_from, price').eq('product_id', id).order('valid_from'),
  ]);
  const chainOf = new Map((zones ?? []).map(z => [z.id, z.chain_id]));
  const rows = (data ?? []).map(r => ({ chainId: chainOf.get(r.zone_id)!, at: r.valid_from as string, price: Number(r.price) }));
  const out: HistoryPoint[] = [];
  for (const chainId of new Set(rows.map(r => r.chainId))) {
    const mine = rows.filter(r => r.chainId === chainId);
    const before = mine.filter(r => r.at < since).at(-1);
    if (before) out.push({ ...before, at: since });
    out.push(...mine.filter(r => r.at >= since));
  }
  return out;
}

export async function chainFreshness(): Promise<Map<number, string>> {
  const { data } = await supabase.rpc('chain_freshness');
  return new Map((data ?? []).map((r: { chain_id: number; last_captured: string }) => [Number(r.chain_id), r.last_captured]));
}

// ---------------------------------------------------------------- frescos (genéricos comparados por kg)

export type GenericCard = {
  id: number; slug: string; name: string; unit: 'kg' | 'unidad'; category_id: number;
  min_price: number; min_chain_id: number; chains_count: number;
};

export type GenericPrice = { genericId: number; chainId: number; price: number; productId: number; productName: string; capturedAt: string };

export async function searchGenerics(q: string | null, limit = 10): Promise<GenericCard[]> {
  const { data, error } = await supabase.rpc('search_generics', { q: q?.trim() || null, lim: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: GenericCard) => ({ ...r, id: Number(r.id), min_price: Number(r.min_price) }));
}

export async function getGeneric(slug: string): Promise<{ id: number; slug: string; name: string; unit: 'kg' | 'unidad'; category_id: number } | null> {
  const { data } = await supabase.from('fresh_generics').select('id, slug, name, unit, category_id').eq('slug', slug).maybeSingle();
  return data as never;
}

export async function genericPrices(ids: number[]): Promise<GenericPrice[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.rpc('generic_prices', { ids });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    genericId: Number(r.generic_id), chainId: Number(r.chain_id), price: Number(r.price),
    productId: Number(r.product_id), productName: String(r.product_name), capturedAt: String(r.captured_at),
  }));
}

/**
 * En las listas, un genérico se guarda con productId negativo (-id del genérico) y se compara como un producto
 * vendido por kg (o por unidad) con el precio más bajo de sus equivalencias aprobadas en cada super.
 */
export function genericToPrice(g: GenericPrice, unit: 'kg' | 'unidad'): Price {
  return {
    productId: -g.genericId, chainId: g.chainId, price: g.price, listPrice: g.price, unitPrice: unit === 'kg' ? g.price : null,
    unitLabel: unit === 'kg' ? 'kg' : 'u', soldByWeight: unit === 'kg', promoKind: 'none', promoMinQty: null, promoValue: null,
    promoText: null, loyalty: null, capturedAt: g.capturedAt,
  };
}
