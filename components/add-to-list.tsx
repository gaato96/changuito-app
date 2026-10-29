'use client';
// Hoja inferior "Agregar a lista": cantidad (unidades o kg) y elección de lista.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addToList, createList, useLists, type ListEntry } from '@/lib/lists';
import { Icon } from './ui';

export type AddTarget = Omit<ListEntry, 'qty'>;

export function QtyStepper({ qty, onChange, byWeight, compact }: { qty: number; onChange: (q: number) => void; byWeight: boolean; compact?: boolean }) {
  const step = byWeight ? 0.25 : 1;
  const min = byWeight ? 0.25 : 1;
  const label = byWeight ? `${qty.toLocaleString('es-AR')} kg` : String(qty);
  const h = compact ? 'h-10 w-10' : 'h-12 w-12';
  return (
    <div className="inline-flex items-center rounded-[12px] border border-line bg-card">
      <button aria-label="Menos" className={`${h} flex items-center justify-center rounded-l-[12px] active:bg-subtle disabled:opacity-40`} disabled={qty <= min} onClick={() => onChange(Math.max(min, +(qty - step).toFixed(2)))}>
        <Icon name="remove" />
      </button>
      <span className={`num text-center font-semibold ${byWeight ? 'min-w-16' : 'min-w-8'}`}>{label}</span>
      <button aria-label="Más" className={`${h} flex items-center justify-center rounded-r-[12px] active:bg-subtle`} onClick={() => onChange(+(qty + step).toFixed(2))}>
        <Icon name="add" />
      </button>
    </div>
  );
}

export function AddToListSheet({ target, initialQty, onClose, hint }: { target: AddTarget; initialQty?: number; onClose: () => void; hint?: React.ReactNode }) {
  const lists = useLists();
  const [qty, setQty] = useState(initialQty ?? (target.soldByWeight ? 1 : 1));
  const [listId, setListId] = useState<string | 'new' | null>(null);
  const [newName, setNewName] = useState('');
  const [done, setDone] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (lists && listId === null) setListId(lists[0]?.id ?? 'new');
  }, [lists, listId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit() {
    let id = listId;
    let name = lists?.find(l => l.id === id)?.name ?? '';
    if (id === 'new' || !id) {
      const l = await createList(newName || 'Mi lista');
      id = l.id; name = l.name;
    }
    await addToList(id, { ...target, qty });
    setDone({ id, name });
  }

  const selectedName = listId === 'new' ? (newName || 'lista nueva') : lists?.find(l => l.id === listId)?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Agregar a lista">
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] rounded-t-[24px] bg-card px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(22,26,23,.06)]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-save-bg text-save"><Icon name="check" size={30} /></div>
            <p className="mt-3 font-head text-[20px] font-semibold">Agregado a {done.name}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="btn btn-outline" onClick={onClose}>Seguir buscando</button>
              <Link className="btn btn-primary" href={`/listas/${done.id}`}>Ver lista</Link>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-head text-[20px] font-semibold">Agregar a lista</h2>
            <p className="mt-1 truncate text-[15px] text-ink2">{target.name}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-semibold">Cantidad</span>
              <QtyStepper qty={qty} onChange={setQty} byWeight={target.soldByWeight} />
            </div>
            {hint && <div className="mt-3">{hint}</div>}
            <p className="mt-5 font-semibold">Elegí la lista</p>
            <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-[12px] border border-line">
              {lists?.map(l => (
                <li key={l.id}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3">
                    <input type="radio" name="list" className="h-5 w-5 accent-[var(--primary)]" checked={listId === l.id} onChange={() => setListId(l.id)} />
                    <span className="flex-1 truncate">{l.name}</span>
                    <span className="num text-[13px] text-muted">{l.items.length}</span>
                  </label>
                </li>
              ))}
              <li>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3">
                  <input type="radio" name="list" className="h-5 w-5 accent-[var(--primary)]" checked={listId === 'new'} onChange={() => setListId('new')} />
                  <span className="text-primary font-semibold">+ Crear lista nueva</span>
                </label>
                {listId === 'new' && (
                  <div className="px-3 pb-3">
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la lista" className="h-12 w-full rounded-[12px] border border-line bg-subtle px-3 outline-none focus:border-primary focus:bg-card" />
                  </div>
                )}
              </li>
            </ul>
            <button className="btn btn-primary mt-4 w-full" onClick={submit}>
              <Icon name="add_shopping_cart" /> Agregar{selectedName ? ` a ${selectedName}` : ''}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
