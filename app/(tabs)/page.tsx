import Link from 'next/link';
import { Suspense } from 'react';
import { CATEGORIES, isStale } from '@/lib/catalog';
import { chainFreshness } from '@/lib/data';
import { Icon, LegalNote } from '@/components/ui';
import { HomeLists } from '@/components/home-lists';

export const dynamic = 'force-dynamic';

async function FreshnessPill() {
  const fresh = await chainFreshness();
  const stale = [...fresh.values()].filter(iso => isStale(iso)).length + (6 - fresh.size);
  return (
    <Link href="/ajustes/estado" className={`chip h-8 ${stale ? 'bg-warn-bg text-warn' : 'bg-subtle text-ink2'}`}>
      <span className="dot" style={{ background: stale ? 'var(--warn)' : 'var(--save)' }} />
      {stale ? `${stale} con precios viejos` : 'Precios al día'}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="px-4">
      <header className="flex h-16 items-center justify-between">
        <span className="flex items-center gap-1.5 font-head text-[24px] font-extrabold tracking-tight text-primary">
          <Icon name="shopping_cart" size={26} />
          changuito
        </span>
        <Suspense fallback={<span className="chip h-8 bg-subtle text-ink2">…</span>}>
          <FreshnessPill />
        </Suspense>
      </header>

      <h1 className="mt-2 font-head text-[28px] font-extrabold leading-[34px] tracking-tight">¿Qué necesitás hoy?</h1>
      <p className="mt-1 text-[15px] leading-5 text-ink2">Fijate dónde te conviene comprar en el Gran Tucumán.</p>

      <Link href="/buscar" className="mt-5 flex h-12 items-center gap-3 rounded-[12px] border border-line bg-subtle px-4 text-muted">
        <Icon name="search" />
        <span>Buscá un producto o marca</span>
      </Link>

      <HomeLists />

      <section className="mt-8">
        <h2 className="font-head text-[20px] font-semibold leading-[26px]">Categorías</h2>
        <p className="text-[15px] leading-5 text-ink2">Compará precios agrupados por rubro</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {CATEGORIES.map(c => (
            <Link key={c.slug} href={`/categoria/${c.slug}`} className="card flex min-h-[72px] items-center gap-3 p-3 active:bg-subtle">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary-tint text-primary">
                <Icon name={c.icon} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-5">{c.name}</span>
                <span className="block truncate text-[13px] leading-[18px] text-ink2">{c.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Link href="/frescos" className="mt-6 block rounded-[16px] border border-[#BBE5C9] bg-primary-tint p-4">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-primary"><Icon name="scale" size={18} />Frescos por kilo</span>
        <span className="mt-1 block font-head text-[20px] font-semibold leading-[26px]">Compará carne, verdura y fiambre al peso</span>
        <span className="mt-1 block text-[15px] leading-5 text-ink2">Llevamos todo a precio por kilo para que compares sin engaños.</span>
        <span className="mt-3 flex items-center gap-1 font-semibold text-primary">Ver frescos <Icon name="arrow_forward" size={18} /></span>
      </Link>

      <LegalNote className="mt-8 pb-4" />
    </div>
  );
}
