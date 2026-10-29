'use client';
// Modo compra: elegís el super, la lista se ordena por sector del local y vas tachando. Funciona sin internet.
import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, CHAIN_IDS, categoryById, chainById, money } from '@/lib/catalog';
import { clearChecked, loadPrices, toggleChecked, useList, type ListEntry } from '@/lib/lists';
import { compareList, type Price } from '@/lib/pricing';
import { TopBar } from '@/components/nav';
import { ChainTag, Chip, EmptyState, Icon } from '@/components/ui';

const SECTORS = [...CATEGORIES].sort((a, b) => a.sector - b.sector);

export default function ShoppingModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const list = useList(id);
  const [prices, setPrices] = useState<Price[] | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const ids = useMemo(() => list?.items.map(i => i.productId).sort().join(',') ?? '', [list]);

  useEffect(() => {
    const s = Number(new URLSearchParams(location.search).get('super'));
    if (s) setChainId(s);
  }, []);
  useEffect(() => {
    if (ids) loadPrices(ids.split(',').map(Number)).then(r => setPrices(r.prices));
  }, [ids]);

  // Mantener la pantalla encendida mientras se compra (si el navegador lo permite)
  useEffect(() => {
    if (!chainId || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, [chainId]);

  const cmp = useMemo(() => (list && prices ? compareList(list.items, prices, CHAIN_IDS) : null), [list, prices]);

  if (list === null) return <EmptyState title="No encontramos esta lista" text="Puede que la hayas borrado." action={<Link className="btn btn-primary" href="/listas">Ir a mis listas</Link>} />;
  if (!list || !cmp) return <p className="py-20 text-center text-ink2">Cargando…</p>;

  // Paso 1: elegir el super
  if (!chainId) {
    return (
      <>
        <TopBar title="Modo compra" subtitle={list.name} />
        <main className="space-y-3 px-4 py-4">
          <h1 className="font-head text-[24px] font-bold">¿En qué super estás?</h1>
          {cmp.singles.map((s, i) => (
            <button key={s.chainId} onClick={() => setChainId(s.chainId)} disabled={!s.coverage}
              className="card flex w-full items-center gap-3 p-4 text-left disabled:opacity-50" style={{ borderLeft: `4px solid var(--chain-${chainById(s.chainId).slug})` }}>
              <span className="flex-1">
                <span className="flex items-center gap-2 font-head text-[18px] font-semibold"><ChainTag chainId={s.chainId} />{i === 0 && <Chip tone="save">Recomendado</Chip>}</span>
                <span className="num text-[15px] text-ink2">{s.coverage} de {cmp.items} productos</span>
              </span>
              <span className="num text-[18px] font-bold whitespace-nowrap">{s.coverage ? money(s.total, true) : "—"}</span>
            </button>
          ))}
        </main>
      </>
    );
  }

  const result = cmp.singles.find(s => s.chainId === chainId)!;
  const checked = new Set(list.checked ?? []);
  const available = list.items.filter(i => result.costs.has(i.productId));
  const missing = list.items.filter(i => !result.costs.has(i.productId));
  const inCart = available.filter(i => checked.has(i.productId)).reduce((s, i) => s + result.costs.get(i.productId)!, 0);
  const doneCount = available.filter(i => checked.has(i.productId)).length;
  const worst = result.vs.filter(v => v.saving > 0).sort((a, b) => b.saving - a.saving)[0];

  if (done) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-save-bg text-save"><Icon name="shopping_cart_checkout" size={48} /></div>
        <h1 className="mt-6 font-head text-[32px] font-extrabold">¡Listo!</h1>
        <p className="num mt-2 text-[17px]">Gastaste aprox. <b>{money(inCart, true)}</b> en {chainById(chainId).name}</p>
        {worst && <p className="num mt-1 text-[15px] text-save">Comparado con {chainById(worst.chainId).name} ahorraste {money(worst.saving, true)} (en lo que tienen en común)</p>}
        <div className="mt-8 grid w-full max-w-[360px] gap-3">
          <Link href="/listas" className="btn btn-primary">Volver a mis listas</Link>
          <button className="btn btn-outline" onClick={async () => { await clearChecked(id); setDone(false); }}>Desmarcar todo</button>
        </div>
      </main>
    );
  }

  const row = (it: ListEntry) => {
    const on = checked.has(it.productId);
    const qty = it.soldByWeight ? `${it.qty.toLocaleString('es-AR')} kg` : `× ${it.qty}`;
    return (
      <li key={it.productId}>
        <button onClick={() => toggleChecked(id, it.productId)} className="flex min-h-16 w-full items-center gap-4 py-2 text-left">
          <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 ${on ? 'border-save bg-save text-white' : 'border-line'}`}>
            {on && <Icon name="check" size={22} />}
          </span>
          <span className={`min-w-0 flex-1 ${on ? 'text-muted line-through' : ''}`}>
            <span className="block text-[18px] leading-6 font-semibold">{it.name}</span>
            <span className="num text-[15px] text-ink2">{qty}</span>
          </span>
          <span className={`num flex-none text-[17px] font-bold ${on ? 'text-muted' : ''}`}>{money(result.costs.get(it.productId)!, true)}</span>
        </button>
      </li>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 px-2 backdrop-blur">
        <div className="flex h-14 items-center gap-1">
          <Link href={`/listas/${id}`} aria-label="Salir del modo compra" className="flex h-12 w-12 items-center justify-center rounded-full"><Icon name="close" /></Link>
          <h1 className="flex-1 font-head text-[20px] font-semibold"><ChainTag chainId={chainId} /></h1>
          <span className="num pr-3 text-[15px] font-semibold text-ink2">{doneCount} de {available.length}</span>
        </div>
        <div className="mx-2 mb-2 h-1.5 rounded-full bg-subtle"><div className="h-1.5 rounded-full bg-save transition-all" style={{ width: `${(doneCount / Math.max(1, available.length)) * 100}%` }} /></div>
      </header>
      <main className="px-4 pb-[calc(110px+env(safe-area-inset-bottom))]">
        {SECTORS.map(sec => {
          const items = available.filter(i => categoryById(i.categoryId)?.id === sec.id)
            .sort((a, b) => Number(checked.has(a.productId)) - Number(checked.has(b.productId)));
          if (!items.length) return null;
          return (
            <section key={sec.id}>
              <h2 className="sticky top-[76px] z-10 -mx-4 bg-bg px-4 pt-4 pb-1 text-[13px] font-semibold tracking-wide text-ink2 uppercase"><Icon name={sec.icon} size={18} className="mr-1 align-[-4px]" />{sec.name}</h2>
              <ul className="divide-y divide-line">{items.map(row)}</ul>
            </section>
          );
        })}
        {available.some(i => !categoryById(i.categoryId)) && (
          <section>
            <h2 className="pt-4 pb-1 text-[13px] font-semibold tracking-wide text-ink2 uppercase">Otros</h2>
            <ul className="divide-y divide-line">{available.filter(i => !categoryById(i.categoryId)).map(row)}</ul>
          </section>
        )}
        {missing.length > 0 && (
          <section className="mt-6 rounded-[16px] bg-subtle p-4">
            <h2 className="font-semibold text-ink2">No está en {chainById(chainId).name}</h2>
            <ul className="mt-1 text-[15px] text-muted">{missing.map(i => <li key={i.productId}>· {i.name}</li>)}</ul>
          </section>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[480px] items-center gap-3 border-t border-line bg-card px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div className="num flex-1 text-[15px] leading-5">
          <span className="block text-ink2">En el changuito</span>
          <b className="text-[22px]">{money(inCart, true)}</b> <span className="text-ink2">de {money(result.total, true)}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setDone(true)}>Terminar</button>
      </div>
    </>
  );
}
