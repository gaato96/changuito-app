// Promos normalizadas (ver PLAN.md §5.2).
import { norm } from './text.ts';

export type Promo = {
  kind: 'none' | 'pct' | 'nth_pct' | 'nxm' | 'qty_price' | 'text';
  minQty: number | null;   // nth_pct: n; nxm: n; qty_price: n
  value: number | null;    // pct/nth_pct: %; nxm: m (unidades que pagás); qty_price: $ c/u
  text: string | null;
};

export const NO_PROMO: Promo = { kind: 'none', minQty: null, value: null, text: null };

const close = (a: number, b: number, tol = 0.51) => Math.abs(a - b) <= tol;
const pctRound = (v: number) => Math.round(v);

/**
 * Clasifica la promo de un producto VTEX a partir de la simulación de carrito.
 * @param list  precio de lista de 1 unidad (campo `price` de la simulación)
 * @param t2    total al llevar 2 unidades
 * @param t3    total al llevar 3 unidades
 * Devuelve el precio de 1 unidad (con descuento directo, si hay) y la promo por cantidad.
 */
export function classifyFromTotals(list: number, t2: number, t3: number): { unitPrice: number; promo: Promo } {
  const u2 = t2 / 2, u3 = t3 / 3;
  // Descuento directo: cada unidad cuesta lo mismo, menos que la lista
  if (close(u2, u3) && u2 < list - 0.5) {
    const pct = pctRound((1 - u2 / list) * 100);
    return { unitPrice: round2(u2), promo: { kind: 'pct', minQty: null, value: pct, text: `${pct}% off` } };
  }
  // 2da unidad con descuento: t2 = 2P − P·x
  if (t2 < 2 * list - 0.5) {
    const x = pctRound(((2 * list - t2) / list) * 100);
    if (x >= 100) return { unitPrice: list, promo: { kind: 'nxm', minQty: 2, value: 1, text: '2x1' } };
    return { unitPrice: list, promo: { kind: 'nth_pct', minQty: 2, value: x, text: `2da al ${x}%` } };
  }
  // 3ra unidad con descuento o 3x2
  if (t3 < 3 * list - 0.5) {
    if (close(t3, 2 * list, 1)) return { unitPrice: list, promo: { kind: 'nxm', minQty: 3, value: 2, text: '3x2' } };
    const x = pctRound(((3 * list - t3) / list) * 100);
    return { unitPrice: list, promo: { kind: 'nth_pct', minQty: 3, value: x, text: `3ra al ${x}%` } };
  }
  return { unitPrice: list, promo: NO_PROMO };
}

/** Carrefour marca con "Mi Crf" las promos del programa Mi Carrefour (descuento solo para socios). */
export function isMiCarrefour(teasers: string[]): boolean {
  return teasers.some(t => /mi\s*crf|mi\s*carrefour/i.test(t));
}

/**
 * Interpreta la leyenda de promo de SEPA (La Anónima y otros).
 * @param promoUnitPrice  productos_precio_unitario_promo1: precio por unidad con la promo
 */
export function parseSepaPromo(legend: string | null, listPrice: number, promoUnitPrice: number | null): { unitPrice: number; promo: Promo } {
  const t = norm(legend);
  if (!t || !promoUnitPrice || !(promoUnitPrice > 0) || promoUnitPrice >= listPrice) return { unitPrice: listPrice, promo: NO_PROMO };
  const text = cleanLegend(legend!);
  // "Llevando 2 unidades": precio por unidad cuando llevás n
  const lleva = t.match(/llevando\s+(\d+)/);
  if (lleva) return { unitPrice: listPrice, promo: { kind: 'qty_price', minQty: Number(lleva[1]), value: round2(promoUnitPrice), text } };
  // "2da al 70%", "2do al 50%"
  const nth = t.match(/(\d)\s*(?:da|do|ra|ro|ta|to)\.?\s*(?:unidad\s*)?al\s*(\d+)\s*%/);
  if (nth) return { unitPrice: listPrice, promo: { kind: 'nth_pct', minQty: Number(nth[1]), value: Number(nth[2]), text } };
  // "3x2"
  const nxm = t.match(/\b(\d)\s*x\s*(\d)\b/);
  if (nxm && Number(nxm[1]) > Number(nxm[2])) return { unitPrice: listPrice, promo: { kind: 'nxm', minQty: Number(nxm[1]), value: Number(nxm[2]), text } };
  // "25% de descuento con cualquier medio de pago": descuento directo
  const pct = t.match(/(\d+)\s*%\s*de\s*descuento/);
  if (pct && /cualquier medio de pago/.test(t)) return { unitPrice: round2(promoUnitPrice), promo: { kind: 'pct', minQty: null, value: Number(pct[1]), text } };
  // Promos con medio de pago específico u otras: solo texto, no se aplican al cálculo
  return { unitPrice: listPrice, promo: { kind: 'text', minQty: null, value: null, text } };
}

function cleanLegend(s: string): string {
  return s.replace(/\s*-\s*Vigencia:.*$/i, '').replace(/\s*-\s*Stock:.*$/i, '').trim();
}

/** Costo de llevar q unidades con la promo aplicada (mismo cálculo que hará la app). */
export function costFor(q: number, unitPrice: number, list: number, promo: Promo): number {
  switch (promo.kind) {
    case 'nth_pct': {
      const n = promo.minQty!, groups = Math.floor(q / n);
      return round2(q * list - groups * list * (promo.value! / 100));
    }
    case 'nxm': {
      const n = promo.minQty!, m = promo.value!, groups = Math.floor(q / n);
      return round2(groups * m * list + (q - groups * n) * list);
    }
    case 'qty_price':
      return round2(q >= promo.minQty! ? q * promo.value! : q * list);
    default:
      return round2(q * unitPrice);
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100;
