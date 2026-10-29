// Lectura y filtrado de los CSV de SEPA (separados por |) para el Gran San Miguel de Tucumán.
import { parse } from 'csv-parse';
import type { Readable } from 'node:stream';
import { norm, ean13, isInternalEan } from '../shared/text.ts';
import { parseSepaSize, sizeFromReference, type Size } from '../shared/units.ts';

/** Localidades del Gran SMT tal como aparecen en SEPA (comparadas sin acentos ni mayúsculas). */
const GRAN_SMT = ['san miguel de tucuman', 'ciudad de tucuman', 'tucuman', 'yerba buena', 'tafi viejo', 'banda del rio sali',
  'las talitas', 'alderetes', 'el manantial', 'san pablo', 'lules', 'cebil redondo', 'villa carmela'];

/** Banderas de SEPA que cubre Changuito → slug de la cadena. */
export const BANDERAS: Record<string, string> = { vea: 'vea', jumbo: 'jumbo', 'la anonima': 'la-anonima' };

export type Sucursal = {
  key: string; chainSlug: string; idComercio: string; idBandera: string; idSucursal: string;
  name: string; address: string; locality: string; lat: number | null; lng: number | null;
};

export type SepaRow = {
  storeKey: string; idProducto: string; ean: string | null; name: string; brand: string | null; size: Size | null;
  weighed: boolean; listPrice: number; promoPrice: number | null; promoLegend: string | null;
};

export const storeKey = (c: string, b: string, s: string) => `${c}-${b}-${s}`;

export function csvParser(): ReturnType<typeof parse> {
  return parse({
    delimiter: '|', columns: (h: string[]) => h.map(c => c.trim().replace(/^﻿/, '')),
    relax_quotes: true, relax_column_count: true, skip_empty_lines: true, trim: true, bom: true,
  });
}

/** Lee un CSV completo (comercio.csv o sucursales.csv, que son chicos). */
export async function readRecords(stream: Readable): Promise<Record<string, string>[]> {
  const out: Record<string, string>[] = [];
  for await (const r of stream.pipe(csvParser())) out.push(r as Record<string, string>);
  return out;
}

export function isGranSmt(locality: string): boolean {
  const l = norm(locality);
  return GRAN_SMT.some(k => l === k || l.includes(k));
}

/** Sucursales de Tucumán (AR-T) en el Gran SMT de las banderas que cubrimos. */
export function pickSucursales(comercios: Record<string, string>[], sucursales: Record<string, string>[]): Sucursal[] {
  const bandera = new Map(comercios.map(c => [`${c.id_comercio}-${c.id_bandera}`, norm(c.comercio_bandera_nombre)]));
  const out: Sucursal[] = [];
  for (const s of sucursales) {
    if (s.sucursales_provincia !== 'AR-T' || !isGranSmt(s.sucursales_localidad ?? '')) continue;
    const slug = BANDERAS[bandera.get(`${s.id_comercio}-${s.id_bandera}`) ?? ''];
    if (!slug) continue;
    const lat = Number(s.sucursales_latitud), lng = Number(s.sucursales_longitud);
    out.push({
      key: storeKey(s.id_comercio, s.id_bandera, s.id_sucursal), chainSlug: slug,
      idComercio: s.id_comercio, idBandera: s.id_bandera, idSucursal: s.id_sucursal,
      name: `${s.sucursales_nombre ?? ''}`.trim(), address: `${s.sucursales_calle ?? ''} ${s.sucursales_numero ?? ''}`.trim(),
      locality: s.sucursales_localidad ?? '', lat: Number.isFinite(lat) && lat ? lat : null, lng: Number.isFinite(lng) && lng ? lng : null,
    });
  }
  return out;
}

const money = (s: string | undefined) => {
  const v = Number((s ?? '').replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
};

/** Fila de productos.csv → registro. Devuelve null si no tiene precio. */
export function toRow(r: Record<string, string>): SepaRow | null {
  const listPrice = money(r.productos_precio_lista);
  if (!listPrice) return null;
  const e = r.productos_ean === '1' ? ean13(r.id_producto) : null;
  const ean = e && !isInternalEan(e) ? e : null;
  const name = (r.productos_descripcion ?? '').trim();
  const presUnit = norm(r.productos_unidad_medida_presentacion).replace(/\./g, '');
  const presQty = Number((r.productos_cantidad_presentacion ?? '').replace(',', '.'));
  // Pesables: sin EAN universal y presentación de 1 kg (el precio informado es por kg)
  const weighed = !ean && /^(kg|kgr|kilo)$/.test(presUnit) && presQty === 1;
  const refPrice = money(r.productos_precio_referencia);
  const size = weighed ? null
    : parseSepaSize(name, sizeFromReference(listPrice, refPrice ?? 0, Number(r.productos_cantidad_referencia), r.productos_unidad_medida_referencia ?? ''));
  return {
    storeKey: storeKey(r.id_comercio, r.id_bandera, r.id_sucursal), idProducto: r.id_producto, ean, name,
    brand: r.productos_marca?.trim() && r.productos_marca.trim() !== '.' ? r.productos_marca.trim() : null,
    size, weighed, listPrice, promoPrice: money(r.productos_precio_unitario_promo1),
    promoLegend: r.productos_leyenda_promo1?.trim() || null,
  };
}
