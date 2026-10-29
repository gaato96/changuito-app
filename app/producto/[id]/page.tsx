import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ago, categoryById, CHAINS, chainById, isStale, money, sizeText, unitLabel } from '@/lib/catalog';
import { getHistory, getProduct, getProductPrices } from '@/lib/data';
import { costFor, promoSuggestion, type Price } from '@/lib/pricing';
import { TopBar } from '@/components/nav';
import { ChainTag, Chip, Icon, LegalNote, NoData, ProductThumb } from '@/components/ui';
import { HistoryChart } from '@/components/history-chart';
import { ProductActions } from '@/components/product-actions';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct(Number((await params).id));
  return { title: p?.name ?? 'Producto' };
}

function PromoChip({ p }: { p: Price }) {
  if (p.promoKind === 'none') return null;
  if (p.promoKind === 'pct') return <Chip tone="promo">-{p.promoValue}%</Chip>;
  return <Chip tone="promo">{p.promoText}</Chip>;
}

export default async function ProductPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();
  const [product, prices, history] = await Promise.all([getProduct(id), getProductPrices(id), getHistory(id)]);
  if (!product) notFound();

  const now = new Date();
  const weighed = product.kind === 'weighed';
  const per = weighed ? ' /kg' : '';
  const fresh = prices.filter(p => !isStale(p.capturedAt, now));
  const sorted = [...prices].sort((a, b) => Number(isStale(a.capturedAt, now)) - Number(isStale(b.capturedAt, now)) || a.price - b.price);
  const best = fresh.length ? fresh.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const worst = fresh.length ? fresh.reduce((a, b) => (b.price > a.price ? b : a)) : null;
  const missing = CHAINS.filter(c => !prices.some(p => p.chainId === c.id));
  const cat = categoryById(product.category_id);

  // La sugerencia de promo más conveniente para quien lleva 1
  const suggestion = fresh.map(p => promoSuggestion(1, p)).filter(s => s !== null)
    .sort((a, b) => a.each - b.each)[0] ?? null;

  const target = {
    productId: product.id, name: product.name, brand: product.brand, imageUrl: product.image_url,
    size: sizeText(product.size_value, product.size_unit), soldByWeight: weighed, categoryId: product.category_id,
  };

  return (
    <>
      <TopBar title="Detalle de producto" />
      <main className="space-y-4 px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
        <section className="card p-4">
          <div className="flex justify-center">
            <ProductThumb src={product.image_url} alt={product.name} size={160} icon={cat?.icon} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cat && <Chip>{cat.name}</Chip>}
            {weighed && <Chip tone="primary">Se vende por kg</Chip>}
          </div>
          <h1 className="mt-2 font-head text-[24px] font-bold leading-[30px]">{product.name}</h1>
          <p className="mt-1 text-[13px] text-ink2">
            {[product.brand, sizeText(product.size_value, product.size_unit), product.ean && `EAN ${product.ean}`].filter(Boolean).join(' · ')}
          </p>
        </section>

        {best && (
          <section className="card border-[#BBE5C9] bg-primary-tint p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="chip bg-card text-ink"><ChainTag chainId={best.chainId} /></span>
              <span className="text-[13px] font-semibold text-primary">Más barato</span>
            </div>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="num font-head text-[32px] font-extrabold leading-[38px] text-primary">{money(best.price)}</span>
              <span className="text-[15px] text-ink2">{per}</span>
              {!weighed && best.unitPrice && <span className="num text-[15px] text-ink2">({money(best.unitPrice, true)} / {unitLabel(best.unitLabel)})</span>}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#BBE5C9] pt-3">
              {worst && worst.price - best.price >= 1
                ? <Chip tone="save" icon="savings">Ahorrás hasta {money(worst.price - best.price, true)} vs. {chainById(worst.chainId).name}</Chip>
                : <span className="text-[13px] text-ink2">Mismo precio en los supers que lo tienen</span>}
              <span className="text-[13px] text-ink2">Actualizado {ago(best.capturedAt, now)}</span>
            </div>
            {best.loyalty === 'mi_carrefour' && <p className="mt-2 text-[13px] text-ink2">Precio con Mi Carrefour: en el local tenés que identificarte como socio (es gratis).</p>}
          </section>
        )}

        {suggestion && (
          <section className="rounded-[16px] border border-[#FDE68A] bg-promo-bg p-4 text-[15px] leading-5">
            <p className="flex items-center gap-2 font-semibold text-promo"><Icon name="lightbulb" /> ¡Tip de ahorro en cantidad!</p>
            <p className="mt-1 text-ink">
              En <b>{chainById(suggestion.chainId).name}</b>, si llevás {suggestion.toQty} pagás <b className="num">{money(suggestion.total)}</b> (
              <span className="num">{money(suggestion.each)}</span> c/u) con la promo <i>{suggestion.text}</i>. Ahorrás <b className="num">{money(suggestion.saving)}</b>.
            </p>
          </section>
        )}

        <section>
          <h2 className="font-head text-[20px] font-semibold leading-[26px]">Precios en Tucumán</h2>
          <ul className="card mt-3 divide-y divide-line overflow-hidden">
            {sorted.map(p => {
              const stale = isStale(p.capturedAt, now);
              const diff = best && !stale ? p.price - best.price : 0;
              const isBest = best && p === best;
              return (
                <li key={p.chainId} className={`flex items-start justify-between gap-3 px-4 py-3 ${isBest ? 'bg-primary-tint/50' : ''} ${stale ? 'opacity-70' : ''}`}>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      <ChainTag chainId={p.chainId} />
                      {isBest && <Chip tone="save">Más barato</Chip>}
                      <PromoChip p={p} />
                      {p.loyalty === 'mi_carrefour' && <Chip>con Mi Carrefour</Chip>}
                    </p>
                    <p className="num mt-0.5 text-[13px] leading-[18px] text-ink2">
                      {p.promoKind === 'pct' && <s className="mr-1.5 text-muted">{money(p.listPrice)}</s>}
                      {!weighed && p.unitPrice ? `${money(p.unitPrice, true)} / ${unitLabel(p.unitLabel)} · ` : ''}
                      {stale ? '' : `Actualizado ${ago(p.capturedAt, now)}`}
                    </p>
                    {stale && <Chip tone="warn" icon="schedule" className="mt-1">Precio de {ago(p.capturedAt, now).replace('hace ', 'hace ')}</Chip>}
                    {p.promoKind !== 'none' && p.promoKind !== 'pct' && p.promoMinQty && (
                      <p className="num mt-0.5 text-[13px] text-promo">Llevando {p.promoMinQty}: {money(costFor(p.promoMinQty, p) / p.promoMinQty)} c/u</p>
                    )}
                  </div>
                  <div className="flex-none text-right">
                    <p className="num text-[17px] font-bold">{money(p.price)}{per}</p>
                    {diff >= 1 && <p className="num text-[13px] text-muted">+{money(diff, true)}</p>}
                  </div>
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
          {prices.some(p => chainById(p.chainId).hasPromos === false) && (
            <p className="mt-2 text-[13px] text-muted">Vea y Jumbo no informan promos en los datos públicos: puede haber descuentos en el local.</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-head text-[20px] font-semibold leading-[26px]">Historial de 60 días</h2>
          <div className="mt-3"><HistoryChart points={history} now={now} /></div>
        </section>

        <LegalNote className="pt-2" />
      </main>
      <ProductActions target={target} />
    </>
  );
}
