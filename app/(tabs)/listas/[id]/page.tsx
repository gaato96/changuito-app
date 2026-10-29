'use client';
// Detalle de una lista: cantidades, mejor precio de cada producto y acceso a la comparación.
import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, CHAIN_IDS, categoryById, chainById, isStale, money } from '@/lib/catalog';
import { loadPrices, setQty, useList, type ListEntry } from '@/lib/lists';
import { costFor, type Price } from '@/lib/pricing';
import { whatsappUrl } from '@/lib/share';
import { QtyStepper } from '@/components/add-to-list';
import { TopBar } from '@/components/nav';
import { EmptyState, Icon, ProductThumb } from '@/components/ui';

function ItemRow({ listId, it, prices }: { listId: string; it: ListEntry; prices: Price[] }) {
  const fresh = prices.filter(p => p.productId === it.productId && !isStale(p.capturedAt));
  const best = fresh.length ? fresh.reduce((a, b) => (costFor(it.qty, b) < costFor(it.qty, a) ? b : a)) : null;
  const missing = CHAIN_IDS.length - new Set(fresh.map(p => p.chainId)).size;
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/producto/${it.productId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <ProductThumb src={it.imageUrl} alt={it.name} size={52} icon={categoryById(it.categoryId)?.icon} />
        <div className="min-w-0">
          <p className="line-clamp-2 text-[15px] font-semibold leading-5">{it.name}</p>
          {best ? (
            <p className="num text-[13px] leading-[18px] text-ink2">desde {money(costFor(it.qty, best))} en {chainById(best.chainId).name}</p>
          ) : (
            <p className="text-[13px] text-muted">Sin precios vigentes</p>
          )}
          {best && missing > 0 && <p className="text-[13px] leading-[18px] text-muted">Sin dato en {missing} {missing === 1 ? 'super' : 'supers'}</p>}
        </div>
      </Link>
      <div className="flex flex-none flex-col items-end gap-1">
        <QtyStepper compact qty={it.qty} byWeight={it.soldByWeight} onChange={q => setQty(listId, it.productId, q)} />
        <button onClick={() => setQty(listId, it.productId, 0)} className="text-[13px] text-muted underline-offset-2 active:underline">Quitar</button>
      </div>
    </li>
  );
}

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const list = useList(id);
  const [prices, setPrices] = useState<Price[]>([]);
  const [offline, setOffline] = useState<{ at: number } | null>(null);
  const ids = useMemo(() => list?.items.map(i => i.productId).sort().join(',') ?? '', [list]);

  useEffect(() => {
    if (!ids) return;
    loadPrices(ids.split(',').map(Number)).then(r => {
      setPrices(r.prices);
      setOffline(r.offline && r.fetchedAt ? { at: r.fetchedAt } : null);
    });
  }, [ids]);

  if (list === undefined) return null;
  if (list === null) return <EmptyState title="No encontramos esta lista" text="Puede que la hayas borrado." action={<Link className="btn btn-primary" href="/listas">Ir a mis listas</Link>} />;

  const groups = CATEGORIES.map(c => ({ c, items: list.items.filter(i => i.categoryId === c.id) }))
    .filter(g => g.items.length);
  const other = list.items.filter(i => !categoryById(i.categoryId));

  return (
    <>
      <TopBar title={list.name} subtitle={`${list.items.length} ${list.items.length === 1 ? 'producto' : 'productos'}`}
        right={list.items.length > 0 && (
          <a href={whatsappUrl(list)} target="_blank" rel="noreferrer" aria-label="Compartir por WhatsApp" className="flex h-12 w-12 items-center justify-center rounded-full active:bg-subtle">
            <Icon name="share" />
          </a>
        )} />

      {offline && (
        <p className="mx-4 mt-3 flex gap-2 rounded-[12px] bg-subtle p-3 text-[13px] text-ink2">
          <Icon name="cloud_off" size={18} /> Sin conexión. Mostrando precios guardados el {new Date(offline.at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.
        </p>
      )}

      <div className="px-4 pb-24">
        <Link href="/buscar" className="mt-4 flex h-12 items-center gap-3 rounded-[12px] border border-dashed border-line px-4 font-semibold text-primary">
          <Icon name="add" /> Agregar producto
        </Link>

        {list.items.length === 0 ? (
          <EmptyState icon="playlist_add" title="Tu lista está vacía" text="Buscá productos y tocá + para sumarlos." />
        ) : (
          <>
            {groups.map(g => (
              <section key={g.c.id} className="mt-5">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink2 uppercase"><Icon name={g.c.icon} size={18} />{g.c.name}</h2>
                <ul className="divide-y divide-line">{g.items.map(it => <ItemRow key={it.productId} listId={id} it={it} prices={prices} />)}</ul>
              </section>
            ))}
            {other.length > 0 && (
              <section className="mt-5">
                <h2 className="text-[13px] font-semibold tracking-wide text-ink2 uppercase">Otros</h2>
                <ul className="divide-y divide-line">{other.map(it => <ItemRow key={it.productId} listId={id} it={it} prices={prices} />)}</ul>
              </section>
            )}
          </>
        )}
      </div>

      {list.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-[480px] items-center gap-3 border-t border-line bg-card px-4 py-3">
          <span className="num flex-1 text-[15px] text-ink2">{list.items.length} productos</span>
          <Link href={`/listas/${id}/comparar`} className="btn btn-primary"><Icon name="compare_arrows" />Comparar supers</Link>
        </div>
      )}
    </>
  );
}
