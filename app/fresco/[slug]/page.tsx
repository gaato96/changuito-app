import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ago, categoryById, CHAINS, chainById, isStale, money } from '@/lib/catalog';
import { genericTarget } from '@/lib/catalog';
import { genericPrices, getGeneric } from '@/lib/data';
import { TopBar } from '@/components/nav';
import { ChainTag, Chip, Icon, LegalNote, NoData } from '@/components/ui';
import { ProductActions } from '@/components/product-actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getGeneric((await params).slug);
  return { title: g?.name ?? 'Fresco' };
}

export default async function FreshPage({ params }: Props) {
  const g = await getGeneric((await params).slug);
  if (!g) notFound();
  const now = new Date();
  const prices = (await genericPrices([g.id])).sort((a, b) => Number(isStale(a.capturedAt, now)) - Number(isStale(b.capturedAt, now)) || a.price - b.price);
  const fresh = prices.filter(p => !isStale(p.capturedAt, now));
  const best = fresh[0], worst = fresh.at(-1);
  const per = g.unit === 'kg' ? ' /kg' : ' c/u';
  const missing = CHAINS.filter(c => !prices.some(p => p.chainId === c.id));
  const cat = categoryById(g.category_id);

  return (
    <>
      <TopBar title="Fresco" />
      <main className="space-y-4 px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
        <section className="card flex items-center gap-4 p-4">
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[16px] bg-primary-tint text-primary"><Icon name={cat?.icon ?? 'eco'} size={34} /></span>
          <div>
            <h1 className="font-head text-[24px] font-bold leading-[30px]">{g.name}</h1>
            <div className="mt-1 flex gap-1.5"><Chip tone="primary">Fresco</Chip><Chip>{g.unit === 'kg' ? 'Por kg' : 'Por unidad'}</Chip></div>
          </div>
        </section>
        <p className="text-[15px] leading-5 text-ink2">
          {g.unit === 'kg' ? 'Comparamos el precio por kilo entre supers.' : 'Comparamos el precio por unidad entre supers.'} Cada super lo nombra distinto: revisamos a mano qué producto equivale.
        </p>

        {best && (
          <section className="card border-[#BBE5C9] bg-primary-tint p-4">
            <span className="chip bg-card text-ink"><ChainTag chainId={best.chainId} /></span>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="num font-head text-[32px] font-extrabold leading-[38px] text-primary">{money(best.price)}</span>
              <span className="text-[15px] text-ink2">{per}</span>
            </p>
            {worst && worst.price - best.price >= 1 && (
              <Chip tone="save" icon="savings" className="mt-2">Ahorrás {money(worst.price - best.price, true)}{per} vs. {chainById(worst.chainId).name}</Chip>
            )}
          </section>
        )}

        <ul className="card divide-y divide-line overflow-hidden">
          {prices.map(p => {
            const stale = isStale(p.capturedAt, now);
            return (
              <li key={p.chainId} className={`flex items-start justify-between gap-3 px-4 py-3 ${stale ? 'opacity-70' : ''}`}>
                <div className="min-w-0">
                  <p className="font-semibold"><ChainTag chainId={p.chainId} /></p>
                  <p className="line-clamp-2 text-[13px] leading-[18px] text-ink2">{p.productName}</p>
                  <p className="text-[13px] text-muted">{stale ? <Chip tone="warn" icon="schedule">Precio de {ago(p.capturedAt, now)}</Chip> : `Actualizado ${ago(p.capturedAt, now)}`}</p>
                </div>
                <p className="num flex-none text-[17px] font-bold">{money(p.price)}{per}</p>
              </li>
            );
          })}
          {missing.map(c => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <ChainTag chainId={c.id} className="font-semibold text-ink2" />
              <NoData />
            </li>
          ))}
        </ul>
        {!prices.length && <p className="text-[15px] text-ink2">Todavía no hay equivalencias aprobadas para este fresco.</p>}
        <LegalNote />
      </main>
      <ProductActions target={genericTarget(g)} />
    </>
  );
}
