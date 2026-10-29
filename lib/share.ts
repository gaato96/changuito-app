// Compartir una lista por WhatsApp: la lista viaja dentro del link (/l#...), sin servidor ni cuentas.
import type { ShoppingList } from './lists';

type Payload = { n: string; i: [number, number][] };   // nombre, [productId, cantidad]

const toB64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export function encodeList(l: Pick<ShoppingList, 'name' | 'items'>): string {
  return toB64url(JSON.stringify({ n: l.name, i: l.items.map(x => [x.productId, x.qty]) } satisfies Payload));
}

export function decodeList(hash: string): { name: string; items: { productId: number; qty: number }[] } | null {
  try {
    const p = JSON.parse(fromB64url(hash.replace(/^#/, ''))) as Payload;
    if (!Array.isArray(p.i)) return null;
    return {
      name: String(p.n ?? 'Lista compartida').slice(0, 60),
      items: p.i.filter(x => Number.isFinite(x[0]) && Number(x[1]) > 0).slice(0, 200).map(([productId, qty]) => ({ productId: Number(productId), qty: Number(qty) })),
    };
  } catch {
    return null;
  }
}

export function shareUrl(l: Pick<ShoppingList, 'name' | 'items'>): string {
  return `${location.origin}/l#${encodeList(l)}`;
}

export function whatsappUrl(l: Pick<ShoppingList, 'name' | 'items'>): string {
  const text = `Te paso mi lista "${l.name}" en Changuito 🛒 ${shareUrl(l)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
