// Convierte productos VTEX y resultados de simulación en registros de la base.
import type { SimItem, VtexProduct } from './client.ts';
import type { PriceRecord, ProductRecord } from '../shared/store.ts';
import { ean13, isInternalEan } from '../shared/text.ts';
import { parseSizeFromName, reconcileSize, type Size } from '../shared/units.ts';
import { classifyFromTotals, isMiCarrefour, NO_PROMO } from '../shared/promos.ts';

export type CatalogItem = ProductRecord & { catalogPrice: number; teasers: string[]; knownUnitPrice: number | null };

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Producto del catálogo → registro. Devuelve null si no está disponible en la región. */
export function fromCatalog(p: VtexProduct, base: string, resolveCategory: (path: string | null) => string | null): CatalogItem | null {
  const it = p.items[0];
  const offer = it?.sellers.find(s => s.sellerId === '1')?.commertialOffer ?? it?.sellers[0]?.commertialOffer;
  if (!it || !offer || !offer.IsAvailable || !(offer.Price > 0)) return null;
  const e = ean13(it.ean);
  const weighed = it.measurementUnit === 'kg';
  const knownUnitPrice = p.pricePerUnit?.[0] ? Number(p.pricePerUnit[0]) : null;
  const size = weighed ? null : reconcileSize(sizeFrom(p) ?? parseSizeFromName(p.productName), offer.Price, knownUnitPrice);
  const path = p.categories?.[0] ?? null;
  return {
    sku: it.itemId,
    ean: e && !isInternalEan(e) ? e : null,
    name: p.productName.trim(),
    brand: p.brand?.trim() || null,
    size,
    categorySlug: resolveCategory(path),
    imageUrl: it.images?.[0]?.imageUrl ?? null,
    weighed,
    externalPath: path,
    url: p.linkText ? `${base}/${p.linkText}/p` : p.link ?? null,
    measurementUnit: it.measurementUnit,
    unitMultiplier: it.unitMultiplier,
    catalogPrice: offer.Price,
    teasers: [...(offer.Teasers ?? []), ...(offer.DiscountHighLight ?? [])].map(t => t['<Name>k__BackingField'] ?? '').filter(Boolean),
    knownUnitPrice,
  };
}

/** ChangoMás trae el talle en los campos "Gramaje" (ej. consumo 1, medida LT). */
function sizeFrom(p: VtexProduct): Size | null {
  const qty = Number((p['Gramaje de unidad de consumo']?.[0] ?? '').replace(',', '.'));
  const unit = (p['Gramaje de unidad de medida']?.[0] ?? '').toUpperCase();
  if (!(qty > 0)) return null;
  if (unit === 'LT') return { value: qty * 1000, unit: 'ml' };
  if (unit === 'KG') return { value: qty * 1000, unit: 'g' };
  if (unit === 'GR' || unit === 'GRM') return { value: qty, unit: 'g' };
  if (unit === 'ML' || unit === 'CC' || unit === 'CM3') return { value: qty, unit: 'ml' };
  if (unit === 'UN') return { value: qty, unit: 'u' };
  return null;
}

/**
 * Precio y promo a partir de las simulaciones con cantidad 2 y 3.
 * En pesables, `price` es por kg y la cantidad son pasos de `unitMultiplier` kg.
 */
export function fromSimulation(sku: string, s2: SimItem | undefined, s3: SimItem | undefined, teasers: string[], chainSlug: string): PriceRecord {
  if (!s2 || s2.availability !== 'available' || !(s2.price > 0)) {
    return { sku, price: 0, listPrice: 0, promo: NO_PROMO, loyalty: null, available: false };
  }
  const list = s2.price / 100;
  const total = (s: SimItem) => (s.priceDefinition?.total ?? s.sellingPrice * s.quantity) / 100;
  if (s2.measurementUnit === 'kg') {
    const perKg = round2(total(s2) / (s2.quantity * s2.unitMultiplier));
    const pct = perKg < list - 0.5 ? Math.round((1 - perKg / list) * 100) : 0;
    return {
      sku, price: pct ? perKg : list, listPrice: list, available: true,
      promo: pct ? { kind: 'pct', minQty: null, value: pct, text: `${pct}% off` } : NO_PROMO,
      loyalty: pct && chainSlug === 'carrefour' && isMiCarrefour(teasers) ? 'mi_carrefour' : null,
    };
  }
  const t3 = s3 && s3.availability === 'available' ? total(s3) : 3 * list;
  const { unitPrice, promo } = classifyFromTotals(list, total(s2), t3);
  const loyalty = promo.kind !== 'none' && chainSlug === 'carrefour' && isMiCarrefour(teasers) ? 'mi_carrefour' : null;
  return { sku, price: unitPrice, listPrice: list, promo, loyalty, available: true };
}
