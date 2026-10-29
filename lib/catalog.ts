// Datos fijos del catálogo (espejo de supabase/migrations/*_seed.sql) y formato de precios.
import type { Price } from './pricing';

export type Chain = { id: number; slug: string; name: string; displayName: string; hasPromos: boolean };

export const CHAINS: Chain[] = [
  { id: 1, slug: 'carrefour', name: 'Carrefour', displayName: 'Carrefour', hasPromos: true },
  { id: 2, slug: 'changomas', name: 'ChangoMás', displayName: 'ChangoMás (Hiper Camino del Perú)', hasPromos: true },
  { id: 3, slug: 'comodin', name: 'Comodín', displayName: 'Comodín', hasPromos: true },
  { id: 4, slug: 'vea', name: 'Vea', displayName: 'Vea', hasPromos: false },
  { id: 5, slug: 'jumbo', name: 'Jumbo', displayName: 'Jumbo', hasPromos: false },
  { id: 6, slug: 'la-anonima', name: 'La Anónima', displayName: 'La Anónima', hasPromos: true },
];
export const CHAIN_IDS = CHAINS.map(c => c.id);
export const chainById = (id: number) => CHAINS.find(c => c.id === id)!;

/** Supers que todavía no publican precios en internet ("próximamente") */
export const COMING_SOON = ['Gómez Pardo', 'Aledo', 'El Marqués', 'Capo'];

export type Category = { id: number; slug: string; name: string; icon: string; hint: string; sector: number };

export const CATEGORIES: Category[] = [
  { id: 1, slug: 'almacen', name: 'Almacén', icon: 'inventory_2', hint: 'Arroz, fideos, aceite', sector: 3 },
  { id: 2, slug: 'lacteos', name: 'Lácteos', icon: 'water_drop', hint: 'Leches, yogures, quesos', sector: 5 },
  { id: 3, slug: 'carnes', name: 'Carnes', icon: 'restaurant', hint: 'Vacuna, pollo, cerdo', sector: 7 },
  { id: 4, slug: 'verduleria', name: 'Verdulería', icon: 'eco', hint: 'Frutas y verduras', sector: 1 },
  { id: 5, slug: 'fiambreria', name: 'Fiambrería', icon: 'lunch_dining', hint: 'Fiambres y embutidos', sector: 6 },
  { id: 6, slug: 'panaderia', name: 'Panadería', icon: 'bakery_dining', hint: 'Panes y facturas', sector: 2 },
  { id: 7, slug: 'bebidas', name: 'Bebidas', icon: 'local_bar', hint: 'Aguas, gaseosas, vinos', sector: 4 },
  { id: 8, slug: 'limpieza', name: 'Limpieza', icon: 'cleaning_services', hint: 'Hogar y ropa', sector: 8 },
  { id: 9, slug: 'perfumeria', name: 'Perfumería', icon: 'spa', hint: 'Cuidado personal', sector: 9 },
  { id: 10, slug: 'bebes-mascotas', name: 'Bebés y Mascotas', icon: 'pets', hint: 'Pañales, alimento', sector: 10 },
];
export const categoryBySlug = (slug: string) => CATEGORIES.find(c => c.slug === slug);
export const categoryById = (id: number | null) => CATEGORIES.find(c => c.id === id);

const ars = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const ars0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** "$ 1.299,90" o "$ 1.300" si no tiene centavos. */
export function money(v: number | null | undefined, round = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `$ ${round ? ars0.format(Math.round(v)) : ars.format(Math.round(v * 100) / 100)}`;
}

export function unitLabel(label: string | null | undefined): string {
  return label === 'kg' ? 'kg' : label === 'l' ? 'L' : label === 'u' ? 'u.' : '';
}

/** "1,5 L", "500 g", "12 u." */
export function sizeText(value: number | null, unit: string | null): string {
  if (!value || !unit) return '';
  const n = (x: number) => ars.format(x);
  if (unit === 'g') return value >= 1000 ? `${n(value / 1000)} kg` : `${n(value)} g`;
  if (unit === 'ml') return value >= 1000 ? `${n(value / 1000)} L` : `${n(value)} ml`;
  return `${n(value)} u.`;
}

/** "hace 2 h", "hace 3 días" */
export function ago(iso: string, now = new Date()): string {
  const h = (now.getTime() - new Date(iso).getTime()) / 3600_000;
  if (h < 1) return 'hace minutos';
  if (h < 24) return `hace ${Math.round(h)} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

export function isStale(iso: string, now = new Date(), hours = 72) {
  return now.getTime() - new Date(iso).getTime() > hours * 3600_000;
}

/** Fila de prices_for() → Price */
export function toPrice(r: Record<string, unknown>): Price {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    productId: Number(r.product_id), chainId: Number(r.chain_id), price: Number(r.price), listPrice: Number(r.list_price),
    unitPrice: num(r.unit_price), unitLabel: (r.unit_label as Price['unitLabel']) ?? null, soldByWeight: Boolean(r.sold_by_weight),
    promoKind: (r.promo_kind as Price['promoKind']) ?? 'none', promoMinQty: num(r.promo_min_qty), promoValue: num(r.promo_value),
    promoText: (r.promo_text as string) ?? null, loyalty: (r.loyalty as Price['loyalty']) ?? null, capturedAt: String(r.captured_at),
  };
}

export const LEGAL = 'Precios tomados de las webs oficiales y de datos públicos (SEPA). Pueden diferir en el local.';

/** Entrada de lista para un fresco genérico (id negativo; ver lib/data.ts genericToPrice). */
export function genericTarget(g: { id: number; slug: string; name: string; unit: 'kg' | 'unidad'; category_id: number }) {
  return {
    productId: -g.id, slug: g.slug, name: g.name, brand: null, imageUrl: null,
    size: g.unit === 'kg' ? 'por kg' : 'por unidad', soldByWeight: g.unit === 'kg', categoryId: g.category_id,
  };
}


/** localStorage: ya vio la bienvenida */
export const ONBOARDED_KEY = 'changuito:bienvenida';
