// Filtros guardados en la URL (categorías): ?orden=price&super=4&marca=Ala&promo=1&min=3. Sirve en servidor y cliente.
import { DEFAULT_FILTERS, type Filters, type Sort } from './data';

export function filtersFromParams(sp: Record<string, string | undefined>, categoryId: number | null = null): Filters {
  const sorts: Sort[] = ['relevance', 'price', 'unit_price', 'coverage'];
  return {
    sort: sorts.includes(sp.orden as Sort) ? (sp.orden as Sort) : DEFAULT_FILTERS.sort,
    chainId: Number(sp.super) || null,
    brand: sp.marca || null,
    categoryId,
    promoOnly: sp.promo === '1',
    minChains: Math.max(1, Number(sp.min) || 1),
  };
}

export function toParams(f: Filters): string {
  const u = new URLSearchParams();
  if (f.sort !== 'relevance') u.set('orden', f.sort);
  if (f.chainId) u.set('super', String(f.chainId));
  if (f.brand) u.set('marca', f.brand);
  if (f.promoOnly) u.set('promo', '1');
  if (f.minChains > 1) u.set('min', String(f.minChains));
  const s = u.toString();
  return s ? `?${s}` : '';
}
