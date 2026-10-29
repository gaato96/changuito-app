// Talle del producto (g, ml o unidades) y precio por kg, litro o unidad.
import { norm } from './text.ts';

export type Size = { value: number; unit: 'g' | 'ml' | 'u' };

const UNIT: Record<string, { unit: Size['unit']; factor: number }> = {
  g: { unit: 'g', factor: 1 }, gr: { unit: 'g', factor: 1 }, grs: { unit: 'g', factor: 1 }, gramos: { unit: 'g', factor: 1 }, grm: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 }, kgr: { unit: 'g', factor: 1000 }, kgs: { unit: 'g', factor: 1000 }, kilo: { unit: 'g', factor: 1000 },
  ml: { unit: 'ml', factor: 1 }, cc: { unit: 'ml', factor: 1 }, cm3: { unit: 'ml', factor: 1 },
  l: { unit: 'ml', factor: 1000 }, lt: { unit: 'ml', factor: 1000 }, lts: { unit: 'ml', factor: 1000 }, litro: { unit: 'ml', factor: 1000 }, litros: { unit: 'ml', factor: 1000 },
  u: { unit: 'u', factor: 1 }, un: { unit: 'u', factor: 1 }, cu: { unit: 'u', factor: 1 }, uni: { unit: 'u', factor: 1 }, unid: { unit: 'u', factor: 1 }, unidades: { unit: 'u', factor: 1 },
};

const num = (s: string) => Number(s.replace(',', '.'));

/** Sufijo de presentación de Cencosud: "BOT-75-ml.", "BRK-520-gr.", "PVC-1.5-lt.", "SOB-1-Kg". */
const CENCOSUD_SUFFIX = /\s+[A-Za-z/]{2,4}-([\d.,]+)-\s*([A-Za-z]+)\.?\s*$/;

/**
 * Talle para nombres de SEPA. Orden: talle escrito en el nombre (sin el sufijo de Cencosud),
 * referencia de SEPA (si es razonable) y, por último, el sufijo.
 * En el sufijo, botellas "BOT-75-ml." están en centilitros (75 cl = 750 ml).
 */
export function parseSepaSize(name: string, fromReference: Size | null): Size | null {
  const suffix = name.match(CENCOSUD_SUFFIX);
  const head = suffix ? name.slice(0, suffix.index) : name;
  const explicit = parseSizeFromName(head);
  let fromSuffix: Size | null = null;
  if (suffix) {
    fromSuffix = parseSizeFromName(`${suffix[1]} ${suffix[2]}`);
    if (fromSuffix && fromSuffix.unit === 'ml' && fromSuffix.value < 100 && /^bot/i.test(suffix[0].trim())) fromSuffix = { value: fromSuffix.value * 10, unit: 'ml' };
  }
  // "1.35cc BOT-1350-ml.": el nombre trae litros escritos como cc; el sufijo es el correcto
  if (explicit && fromSuffix && explicit.unit === fromSuffix.unit && explicit.unit !== 'u' && explicit.value < 5 && fromSuffix.value >= 5) return fromSuffix;
  return explicit ?? fromReference ?? fromSuffix;
}

/**
 * Lee el talle desde el nombre: "500gr", "1,5 L", "900 cc", "x 6 u", "x4un (480gr)".
 * Si hay peso/volumen y cantidad de unidades ("6 x 200 ml"), devuelve el total en g/ml.
 */
export function parseSizeFromName(name: string): Size | null {
  const s = norm(name).replace(/(\d)\s*[.,]\s*(\d)/g, '$1,$2');
  const re = /(\d+(?:,\d+)?)\s*(kgr|kgs|kg|kilo|grs|gr|gramos|grm|g|ml|cc|cm3|litros|litro|lts|lt|l|unidades|unid|uni|un|cu|u)\b/g;
  const found: Size[] = [];
  for (const m of s.matchAll(re)) {
    const u = UNIT[m[2]];
    const v = num(m[1]) * u.factor;
    if (v > 0) found.push({ value: round(v), unit: u.unit });
  }
  const measure = found.filter(f => f.unit !== 'u');
  const count = found.find(f => f.unit === 'u') ?? matchPack(s);
  if (measure.length) {
    // "6 x 200 ml" → 1200 ml, salvo que el nombre ya traiga el total ("x4un (480gr)")
    const m = measure[measure.length - 1];
    const pack = matchPack(s);
    if (pack && pack.value > 1 && measure.length === 1 && new RegExp(`\\b${pack.value}\\s*x\\s*\\d`).test(s)) {
      return { value: round(m.value * pack.value), unit: m.unit };
    }
    return m;
  }
  return count ?? null;
}

function matchPack(s: string): Size | null {
  const m = s.match(/\b(\d+)\s*x\s*\d/) ?? s.match(/\bx\s*(\d+)\s*(?:u|un|unid|unidades)?\b(?!\s*(?:g|gr|kg|ml|cc|l|lt))/);
  return m ? { value: Number(m[1]), unit: 'u' } : null;
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Precio por kg, litro o unidad. */
export function unitPrice(price: number, size: Size | null): { unitPrice: number; label: 'kg' | 'l' | 'u' } | null {
  // Talles de menos de 2 g/ml son casi siempre errores de carga y darían precios por kg absurdos
  if (!size || !size.value || (size.unit !== 'u' && size.value < 2)) return null;
  if (size.unit === 'g') return { unitPrice: round2((price / size.value) * 1000), label: 'kg' };
  if (size.unit === 'ml') return { unitPrice: round2((price / size.value) * 1000), label: 'l' };
  return { unitPrice: round2(price / size.value), label: 'u' };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Talle desde los datos de referencia de SEPA: precio_referencia es el precio por cantidad_referencia
 * (ej. $39.175 por 1 KG). Es más confiable que cantidad_presentacion, que Cencosud informa mal (".52 gr." = 520 g).
 */
export function sizeFromReference(listPrice: number, refPrice: number, refQty: number, refUnit: string): Size | null {
  const u = UNIT[norm(refUnit).replace(/\./g, '')];
  if (!u || !(listPrice > 0) || !(refPrice > 0) || !(refQty > 0)) return null;
  const value = (listPrice / refPrice) * refQty * u.factor;
  // Referencias rotas de Cencosud ("BOT-75-ml." con referencia de 0,08 ml): se descartan
  if (!Number.isFinite(value) || value < 5) return null;
  // redondeo a talles comerciales: 2 cifras significativas en g/ml grandes
  return { value: niceRound(value), unit: u.unit };
}

function niceRound(v: number): number {
  if (v >= 100) return Math.round(v);
  if (v >= 10) return Math.round(v * 10) / 10;
  return round(v);
}

/**
 * Verifica un talle leído del nombre contra un precio por unidad conocido (Carrefour trae pricePerUnit).
 * Corrige errores como "Aceite 15 l" que en realidad es 1,5 L. Devuelve el talle corregido o el original.
 */
export function reconcileSize(size: Size | null, price: number, knownUnitPrice: number | null): Size | null {
  if (!knownUnitPrice || knownUnitPrice <= 0 || price <= 0) return size;
  const fromPpu = (price / knownUnitPrice) * (size?.unit === 'u' ? 1 : 1000);
  if (!size) return null;
  if (size.unit === 'u') return size;
  const ratio = size.value / fromPpu;
  if (ratio > 0.95 && ratio < 1.05) return size;
  for (const k of [10, 100, 1000, 0.1, 0.01, 0.001]) {
    const r = (size.value / k) / fromPpu;
    if (r > 0.97 && r < 1.03) return { value: round(size.value / k), unit: size.unit };
  }
  return size;
}
