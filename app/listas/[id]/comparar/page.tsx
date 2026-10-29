'use client';
// ¿Dónde conviene? Un super (ranking con cobertura y ahorro exacto) o repartido en 2. Todo se calcula en el teléfono.
import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { CHAIN_IDS, chainById, money } from '@/lib/catalog';
import { loadPrices, useList } from '@/lib/lists';
import { compareList, type ChainResult, type Comparison, type Price } from '@/lib/pricing';
import { TopBar } from '@/components/nav';
import { ChainTag, Chip, EmptyState, Icon, LegalNote } from '@/components/ui';

function VsLines({ r }: { r: ChainResult }) {
  const lines = r.vs.filter(v => v.common > 0).sort((a, b) => b.saving - a.saving);
  return (
    <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-[15px] leading-5">
      {lines.map(v => (
        <li key={v.chainId} className="flex gap-2">
          <span className="text-muted">•</span>
          <span>
            Contra <b>{chainById(v.chainId).name}</b>{' '}
            {v.saving >= 1 ? <>ahorrás <b className="num text-save">{money(v.saving, true)}</b></>
              : v.saving <= -1 ? <>pagás <b className="num text-warn">{money(-v.saving, true)}</b> más</>
              : <>pagás lo mismo</>}
            <span className="text-ink2"> (en {v.common} {v.common === 1 ? 'producto' : 'productos'} en común)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function OneSuper({ cmp, names }: { cmp: Comparison; names: Map<number, string> }) {
  const best = cmp.singles[0];
  const maxSaving = Math.max(0, ...best.vs.map(v => v.saving));
  return (
    <>
      <section className="card border-2 border-[#BBE5C9] bg-gradient-to-b from-primary-tint/60 to-card p-4">
        <Chip tone="save">TE CONVIENE COMPRAR ACÁ</Chip>
        <p className="mt-3 font-head text-[24px] font-bold"><ChainTag chainId={best.chainId} /></p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="num font-head text-[36px] font-extrabold leading-[42px] text-primary">{money(best.total, true)}</span>
          <span className="text-[15px] text-ink2">total estimado</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip icon="inventory_2">Tiene {best.coverage} de {cmp.items} productos</Chip>
          {maxSaving >= 1 && <Chip tone="save" icon="savings">Ahorrás hasta {money(maxSaving, true)}</Chip>}
        </div>
        <p className="mt-3 flex gap-2 text-[13px] text-ink2"><Icon name="verified" size={18} />Promos por cantidad ya aplicadas</p>
        <VsLines r={best} />
      </section>

      <p className="flex gap-2 rounded-[12px] bg-subtle p-3 text-[13px] leading-[18px] text-ink2">
        <Icon name="info" size={18} />El ahorro se calcula solo con los productos que tienen los dos supers, para que la comparación sea justa.
      </p>

      {best.missing.length > 0 && (
        <section>
          <h3 className="font-semibold">Faltan en {chainById(best.chainId).name}</h3>
          <ul className="mt-1 text-[15px] text-ink2">{best.missing.map(id => <li key={id}>· {names.get(id)}</li>)}</ul>
        </section>
      )}

      <section>
        <h2 className="font-head text-[20px] font-semibold">Ranking de supermercados</h2>
        <ol className="mt-3 space-y-3">
          {cmp.singles.map((s, i) => (
            <li key={s.chainId} className={`card p-4 ${i === 0 ? 'border-primary' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`num flex h-8 w-8 flex-none items-center justify-center rounded-full font-bold ${i === 0 ? 'bg-primary text-on-primary' : 'bg-subtle text-ink2'}`}>{i + 1}</span>
                <span className="flex-1 font-semibold"><ChainTag chainId={s.chainId} /></span>
                <span className="num text-[17px] font-bold">{s.coverage ? money(s.total, true) : '—'}</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-subtle">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(s.coverage / Math.max(1, cmp.items)) * 100}%` }} />
                </div>
                <span className="num text-[13px] text-ink2">{s.coverage} de {cmp.items}</span>
              </div>
              {i > 0 && s.coverage > 0 && (() => {
                const v = best.vs.find(x => x.chainId === s.chainId)!;
                return v.common > 0 && v.saving >= 1
                  ? <p className="num mt-2 text-[13px] text-ink2">En lo que tienen en común, pagás {money(v.saving, true)} más que en {chainById(best.chainId).name}</p>
                  : null;
              })()}
              {!chainById(s.chainId).hasPromos && <p className="mt-1 text-[13px] text-muted">Sin promos informadas</p>}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function SplitTwo({ cmp, names }: { cmp: Comparison; names: Map<number, string> }) {
  const pair = cmp.bestPair;
  if (!pair) return <p className="text-ink2">Hace falta al menos un producto con precio en dos supers.</p>;
  const best = cmp.singles[0];
  const sections = pair.chains.map(c => {
    const ids = [...pair.assignment].filter(([, ch]) => ch === c).map(([pid]) => pid);
    return { c, ids, total: ids.reduce((s, pid) => s + pair.costs.get(pid)!, 0) };
  }).filter(s => s.ids.length);
  return (
    <>
      {!pair.worthIt && (
        <p className="flex gap-2 rounded-[12px] bg-subtle p-3 text-[15px] leading-5 text-ink2">
          <Icon name="info" />
          <span>No vale la pena dividir: {pair.savingVsBestSingle >= 1 ? <>ahorrás solo <b className="num">{money(pair.savingVsBestSingle, true)}</b>.</> : 'no ahorrás nada.'} Te conviene ir solo a {chainById(best.chainId).name}.</span>
        </p>
      )}
      <section className="card border-2 border-[#BBE5C9] p-4">
        <p className="text-[13px] font-semibold text-ink2 uppercase">Mejor combinación</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 font-head text-[20px] font-bold">
          <ChainTag chainId={pair.chains[0]} /> + <ChainTag chainId={pair.chains[1]} />
        </p>
        <p className="num mt-1 font-head text-[36px] font-extrabold leading-[42px] text-primary">{money(pair.total, true)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip icon="inventory_2">{pair.coverage} de {cmp.items} productos</Chip>
          {pair.savingVsBestSingle >= 1 && <Chip tone="save" icon="savings">Ahorrás {money(pair.savingVsBestSingle, true)} más que yendo solo a {chainById(best.chainId).name}</Chip>}
        </div>
        <p className="mt-2 text-[13px] text-ink2">Ahorro calculado sobre {pair.common} productos que también tiene {chainById(best.chainId).name}.</p>
      </section>
      {sections.map(s => (
        <details key={s.c} open className="card overflow-hidden" style={{ borderLeft: `4px solid var(--chain-${chainById(s.c).slug})` }}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4">
            <span className="font-semibold"><ChainTag chainId={s.c} /> <span className="font-normal text-ink2">· {s.ids.length} productos</span></span>
            <span className="num font-bold">{money(s.total, true)}</span>
          </summary>
          <ul className="divide-y divide-line border-t border-line px-4">
            {s.ids.map(pid => (
              <li key={pid} className="flex justify-between gap-3 py-2 text-[15px]">
                <span className="line-clamp-1">{names.get(pid)}</span>
                <span className="num flex-none">{money(pair.costs.get(pid)!)}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
      {cmp.pairs.length > 1 && (
        <section>
          <h3 className="font-semibold">Otras combinaciones</h3>
          <ul className="mt-2 space-y-1 text-[15px]">
            {cmp.pairs.slice(1, 4).map(p => (
              <li key={p.chains.join('-')} className="flex justify-between gap-2 text-ink2">
                <span>{chainById(p.chains[0]).name} + {chainById(p.chains[1]).name} <span className="text-muted">({p.coverage}/{cmp.items})</span></span>
                <span className="num">{money(p.total, true)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ItemMatrix({ cmp, names, qty }: { cmp: Comparison; names: Map<number, string>; qty: Map<number, number> }) {
  const chains = cmp.singles.map(s => s.chainId);
  return (
    <section>
      <h2 className="font-head text-[20px] font-semibold">Detalle por producto</h2>
      <div className="mt-3 overflow-x-auto rounded-[16px] border border-line bg-card">
        <table className="num w-max min-w-full text-[13px]">
          <thead className="bg-subtle text-ink2">
            <tr>
              <th className="sticky left-0 bg-subtle px-3 py-2 text-left font-semibold">Producto</th>
              {chains.map(c => <th key={c} className="px-3 py-2 text-right font-semibold whitespace-nowrap"><ChainTag chainId={c} /></th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...names.keys()].map(pid => {
              const costs = chains.map(c => cmp.singles.find(s => s.chainId === c)!.costs.get(pid));
              const min = Math.min(...costs.filter((x): x is number => x !== undefined));
              return (
                <tr key={pid}>
                  <td className="sticky left-0 max-w-[150px] bg-card px-3 py-2"><span className="line-clamp-2">{names.get(pid)}</span><span className="text-muted">× {qty.get(pid)?.toLocaleString('es-AR')}</span></td>
                  {costs.map((c, i) => (
                    <td key={chains[i]} className={`px-3 py-2 text-right whitespace-nowrap ${c === min ? 'font-bold text-save' : ''}`}>
                      {c === undefined ? <span className="text-muted">—</span> : money(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="bg-subtle font-bold">
              <td className="sticky left-0 bg-subtle px-3 py-2">Total</td>
              {cmp.singles.map(s => <td key={s.chainId} className="px-3 py-2 text-right">{money(s.total, true)}<br /><span className="font-normal text-ink2">{s.coverage}/{cmp.items}</span></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const list = useList(id);
  const [prices, setPrices] = useState<Price[] | null>(null);
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  const [tab, setTab] = useState<'one' | 'two'>('one');
  const ids = useMemo(() => list?.items.map(i => i.productId).sort().join(',') ?? '', [list]);

  useEffect(() => {
    if (!ids) return;
    loadPrices(ids.split(',').map(Number)).then(r => { setPrices(r.prices); setOfflineAt(r.offline ? r.fetchedAt : null); });
  }, [ids]);

  const cmp = useMemo(() => (list && prices ? compareList(list.items, prices, CHAIN_IDS) : null), [list, prices]);
  const names = useMemo(() => new Map(list?.items.map(i => [i.productId, i.name]) ?? []), [list]);
  const qty = useMemo(() => new Map(list?.items.map(i => [i.productId, i.qty]) ?? []), [list]);

  if (list === null) return <EmptyState title="No encontramos esta lista" text="Puede que la hayas borrado." action={<Link className="btn btn-primary" href="/listas">Ir a mis listas</Link>} />;

  return (
    <>
      <TopBar title="¿Dónde conviene?" subtitle={list ? `${list.name} · ${list.items.length} productos` : undefined} />
      <main className="space-y-4 px-4 pt-3 pb-10">
        <div className="grid grid-cols-2 rounded-[14px] border border-line bg-subtle p-1">
          {([['one', 'Un super', 'storefront'], ['two', 'Repartido en 2', 'call_split']] as const).map(([k, label, icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex h-11 items-center justify-center gap-2 rounded-[10px] font-semibold ${tab === k ? 'bg-primary text-on-primary' : 'text-ink2'}`}>
              <Icon name={icon} size={20} />{label}
            </button>
          ))}
        </div>

        {offlineAt && <p className="flex gap-2 rounded-[12px] bg-subtle p-3 text-[13px] text-ink2"><Icon name="cloud_off" size={18} />Sin conexión: comparando con precios guardados el {new Date(offlineAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.</p>}
        {cmp && cmp.stale.length > 0 && (
          <p className="flex gap-2 rounded-[12px] bg-warn-bg p-3 text-[13px] text-warn">
            <Icon name="schedule" size={18} />{cmp.stale.map(c => chainById(c).name).join(', ')}: precios de más de 3 días. No se usan para comparar.
          </p>
        )}

        {!cmp && <p className="py-10 text-center text-ink2">Calculando…</p>}
        {cmp && cmp.items === 0 && <EmptyState icon="playlist_add" title="La lista está vacía" text="Agregá productos para comparar." />}
        {cmp && cmp.items > 0 && cmp.singles[0].coverage === 0 && <EmptyState icon="search_off" title="Sin precios vigentes" text="Ningún super tiene precios actualizados para estos productos." />}
        {cmp && cmp.items > 0 && cmp.singles[0].coverage > 0 && (
          <>
            {tab === 'one' ? <OneSuper cmp={cmp} names={names} /> : <SplitTwo cmp={cmp} names={names} />}

            {cmp.suggestions.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-head text-[20px] font-semibold">Sugerencias de promo</h2>
                {cmp.suggestions.slice(0, 5).map(s => (
                  <p key={`${s.productId}-${s.chainId}`} className="rounded-[16px] border border-[#FDE68A] bg-promo-bg p-3 text-[15px] leading-5">
                    <Icon name="lightbulb" size={18} className="mr-1 align-[-3px] text-promo" />
                    <b>{names.get(s.productId)}</b> en {chainById(s.chainId).name}: si llevás {s.toQty} en vez de {s.fromQty} pagás <b className="num">{money(s.total)}</b> (<span className="num">{money(s.each)}</span> c/u, {s.text}). Ahorrás <b className="num">{money(s.saving)}</b>.
                  </p>
                ))}
                <p className="text-[13px] text-muted">Solo te avisamos: tu lista no cambia.</p>
              </section>
            )}

            <ItemMatrix cmp={cmp} names={names} qty={qty} />
          </>
        )}
        <LegalNote />
      </main>
    </>
  );
}
