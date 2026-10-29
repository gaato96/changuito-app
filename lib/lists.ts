'use client';
// Listas de compras y últimos precios descargados, guardados en el teléfono (IndexedDB). Sin cuentas ni servidor.
import { openDB, type IDBPDatabase } from 'idb';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { toPrice } from './catalog';
import { genericPrices, genericToPrice } from './data';
import type { Price } from './pricing';

export type ListEntry = {
  productId: number;
  qty: number;                 // unidades, o kg si soldByWeight
  name: string;
  brand: string | null;
  imageUrl: string | null;
  size: string;
  soldByWeight: boolean;
  categoryId: number | null;
  slug?: string;               // solo frescos genéricos (productId negativo)
};

export type ShoppingList = { id: string; name: string; items: ListEntry[]; createdAt: number; updatedAt: number; checked?: number[] };

type CachedPrices = { productId: number; prices: Price[]; fetchedAt: number };

const EVENT = 'changuito:lists';
let dbp: Promise<IDBPDatabase> | null = null;

function db() {
  dbp ??= openDB('changuito', 1, {
    upgrade(d) {
      d.createObjectStore('lists', { keyPath: 'id' });
      d.createObjectStore('prices', { keyPath: 'productId' });
    },
  });
  return dbp;
}

const notify = () => window.dispatchEvent(new Event(EVENT));
const newId = () => Math.random().toString(36).slice(2, 10);

export async function getLists(): Promise<ShoppingList[]> {
  const all = (await (await db()).getAll('lists')) as ShoppingList[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getList(id: string): Promise<ShoppingList | undefined> {
  return (await db()).get('lists', id);
}

async function save(list: ShoppingList) {
  await (await db()).put('lists', { ...list, updatedAt: Date.now() });
  notify();
}

export async function createList(name: string, items: ListEntry[] = []): Promise<ShoppingList> {
  const list = { id: newId(), name: name.trim() || 'Mi lista', items, createdAt: Date.now(), updatedAt: Date.now() };
  await save(list);
  return list;
}

export async function renameList(id: string, name: string) {
  const l = await getList(id);
  if (l) await save({ ...l, name: name.trim() || l.name });
}

export async function duplicateList(id: string) {
  const l = await getList(id);
  if (l) return createList(`${l.name} (copia)`, l.items);
}

export async function deleteList(id: string) {
  await (await db()).delete('lists', id);
  notify();
}

/** Agrega un producto (o suma cantidad si ya estaba). */
export async function addToList(id: string, entry: ListEntry) {
  const l = await getList(id);
  if (!l) return;
  const existing = l.items.find(i => i.productId === entry.productId);
  const items = existing
    ? l.items.map(i => (i.productId === entry.productId ? { ...i, qty: round(i.qty + entry.qty) } : i))
    : [...l.items, entry];
  await save({ ...l, items });
}

export async function setQty(id: string, productId: number, qty: number) {
  const l = await getList(id);
  if (!l) return;
  const items = qty <= 0 ? l.items.filter(i => i.productId !== productId) : l.items.map(i => (i.productId === productId ? { ...i, qty: round(qty) } : i));
  await save({ ...l, items });
}

/** Modo compra: tachar o destachar un producto. */
export async function toggleChecked(id: string, productId: number) {
  const l = await getList(id);
  if (!l) return;
  const set = new Set(l.checked ?? []);
  if (set.has(productId)) set.delete(productId); else set.add(productId);
  await save({ ...l, checked: [...set] });
}

export async function clearChecked(id: string) {
  const l = await getList(id);
  if (l) await save({ ...l, checked: [] });
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Listas reactivas: se actualizan cuando cambian en esta u otra pantalla. */
export function useLists() {
  const [lists, setLists] = useState<ShoppingList[] | null>(null);
  const load = useCallback(() => { getLists().then(setLists); }, []);
  useEffect(() => {
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, [load]);
  return lists;
}

export function useList(id: string) {
  const [list, setList] = useState<ShoppingList | null | undefined>(undefined);
  useEffect(() => {
    const load = () => getList(id).then(l => setList(l ?? null));
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, [id]);
  return list;
}

/**
 * Precios de los productos de una lista. Con conexión los baja y los guarda; sin conexión usa los guardados.
 * Devuelve también cuándo se descargaron, para el aviso de "precios guardados".
 */
export async function loadPrices(productIds: number[]): Promise<{ prices: Price[]; offline: boolean; fetchedAt: number | null }> {
  const d = await db();
  if (!productIds.length) return { prices: [], offline: false, fetchedAt: null };
  try {
    // Los genéricos de frescos van con id negativo (ver genericToPrice)
    const products = productIds.filter(id => id > 0), generics = productIds.filter(id => id < 0).map(id => -id);
    const [{ data, error }, gp, units] = await Promise.all([
      products.length ? supabase.rpc('prices_for', { ids: products }) : Promise.resolve({ data: [], error: null }),
      genericPrices(generics),
      generics.length ? supabase.from('fresh_generics').select('id, unit').in('id', generics) : Promise.resolve({ data: [] }),
    ]);
    if (error) throw error;
    const unitOf = new Map(((units.data ?? []) as { id: number; unit: 'kg' | 'unidad' }[]).map(u => [Number(u.id), u.unit]));
    const prices: Price[] = [...(data ?? []).map(toPrice), ...gp.map(g => genericToPrice(g, unitOf.get(g.genericId) ?? 'kg'))];
    const now = Date.now();
    const tx = d.transaction('prices', 'readwrite');
    for (const id of productIds) await tx.store.put({ productId: id, prices: prices.filter(p => p.productId === id), fetchedAt: now } satisfies CachedPrices);
    await tx.done;
    return { prices, offline: false, fetchedAt: now };
  } catch {
    const cached = (await Promise.all(productIds.map(id => d.get('prices', id)))) as (CachedPrices | undefined)[];
    const ok = cached.filter((c): c is CachedPrices => !!c);
    return { prices: ok.flatMap(c => c.prices), offline: true, fetchedAt: ok.length ? Math.min(...ok.map(c => c.fetchedAt)) : null };
  }
}
