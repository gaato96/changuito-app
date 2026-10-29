'use client';
// Lista compartida por WhatsApp: el link trae la lista (/l#...). Vista previa y "Guardar en mis listas".
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { decodeList } from '@/lib/share';
import { createList, type ListEntry } from '@/lib/lists';
import { supabase } from '@/lib/supabase';
import { sizeText } from '@/lib/catalog';
import { genericTarget } from '@/lib/catalog';
import { EmptyState, Icon } from '@/components/ui';

export default function SharedListPage() {
  const router = useRouter();
  const [state, setState] = useState<{ name: string; items: ListEntry[] } | null | 'invalid'>(null);

  useEffect(() => {
    const decoded = decodeList(location.hash);
    if (!decoded || !decoded.items.length) { setState('invalid'); return; }
    const ids = decoded.items.map(i => i.productId);
    Promise.all([
      supabase.from('products').select('id, name, brand, image_url, size_value, size_unit, kind, category_id').in('id', ids.filter(i => i > 0)),
      supabase.from('fresh_generics').select('id, slug, name, unit, category_id').in('id', ids.filter(i => i < 0).map(i => -i)),
    ]).then(([{ data }, { data: gens }]) => {
      const byId = new Map<number, ListEntry>();
      for (const p of data ?? []) byId.set(Number(p.id), {
        productId: Number(p.id), qty: 0, name: p.name, brand: p.brand, imageUrl: p.image_url,
        size: sizeText(p.size_value === null ? null : Number(p.size_value), p.size_unit), soldByWeight: p.kind === 'weighed', categoryId: p.category_id,
      });
      for (const g of gens ?? []) byId.set(-Number(g.id), { ...genericTarget(g as never), qty: 0 });
      const items = decoded.items.filter(i => byId.has(i.productId)).map(i => ({ ...byId.get(i.productId)!, qty: i.qty }));
      setState({ name: decoded.name, items });
    });
  }, []);

  if (state === 'invalid') return <EmptyState icon="link_off" title="El link no es válido" text="Pedile a quien te lo mandó que lo comparta de nuevo." action={<Link className="btn btn-primary" href="/">Ir al inicio</Link>} />;
  if (!state) return <p className="py-20 text-center text-ink2">Cargando lista…</p>;

  return (
    <main className="px-4 pt-6 pb-[calc(140px+env(safe-area-inset-bottom))]">
      <span className="flex items-center gap-1.5 font-head text-[22px] font-extrabold text-primary"><Icon name="shopping_cart" />changuito</span>
      <p className="mt-1 text-ink2">Te compartieron una lista</p>
      <section className="card mt-4 p-4">
        <h1 className="font-head text-[24px] font-bold">{state.name}</h1>
        <p className="num text-ink2">{state.items.length} productos</p>
        <ul className="mt-3 divide-y divide-line">
          {state.items.map(i => (
            <li key={i.productId} className="flex justify-between gap-3 py-2 text-[15px]">
              <span className="line-clamp-1">{i.name}</span>
              <span className="num flex-none text-ink2">× {i.qty.toLocaleString('es-AR')}{i.soldByWeight ? ' kg' : ''}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col gap-2 border-t border-line bg-card px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <button className="btn btn-primary" onClick={async () => { const l = await createList(state.name, state.items); router.push(`/listas/${l.id}/comparar`); }}>
          <Icon name="bookmark_add" />Guardar en mis listas
        </button>
      </div>
    </main>
  );
}
