import type { Metadata } from 'next';
import { CHAINS, COMING_SOON, isStale } from '@/lib/catalog';
import { chainFreshness } from '@/lib/data';
import { TopBar } from '@/components/nav';
import { ChainTag, Chip, Icon } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Estado de los precios' };

const SOURCE: Record<string, { label: string; freq: string }> = {
  vtex: { label: 'Web oficial', freq: '2 veces por día' },
  sepa: { label: 'Datos públicos SEPA', freq: '1 vez por día' },
};

export default async function StatusPage() {
  const fresh = await chainFreshness();
  const now = new Date();
  const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Tucuman' });
  return (
    <>
      <TopBar title="Estado de los precios" />
      <main className="space-y-3 px-4 py-4">
        <p className="text-[15px] leading-5 text-ink2">Actualizamos los precios todos los días. Si una fuente se atrasa, te avisamos.</p>
        <p className="flex gap-2 rounded-[12px] bg-subtle p-3 text-[13px] leading-[18px] text-ink2">
          <Icon name="schedule" size={18} />Los precios con más de 72 horas no se usan para comparar listas.
        </p>
        {CHAINS.map(c => {
          const last = fresh.get(c.id);
          const stale = !last || isStale(last, now);
          const hours = last ? (now.getTime() - new Date(last).getTime()) / 3600_000 : Infinity;
          const src = SOURCE[c.id <= 3 ? 'vtex' : 'sepa'];
          return (
            <section key={c.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-head text-[18px] font-semibold"><ChainTag chainId={c.id} /></span>
                {!last ? <Chip tone="err">Sin datos</Chip>
                  : stale ? <Chip tone="warn" icon="warning">Hace {Math.round(hours / 24)} días</Chip>
                  : hours > 30 ? <Chip tone="warn" icon="schedule">Con demora</Chip>
                  : <Chip tone="save" icon="check_circle">Al día</Chip>}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                <div><dt className="text-ink2">Última actualización</dt><dd className="font-semibold">{last ? fmt(last) : '—'}</dd></div>
                <div><dt className="text-ink2">Frecuencia</dt><dd className="font-semibold">{src.freq}</dd></div>
              </dl>
              <p className="mt-2 text-[13px] text-muted">{src.label}{c.slug === 'changomas' ? ' · Hiper Camino del Perú' : ''}{c.hasPromos ? '' : ' · sin promos informadas'}</p>
            </section>
          );
        })}
        <section className="rounded-[16px] bg-subtle p-4">
          <h2 className="font-semibold">Próximamente</h2>
          <p className="mt-1 text-[13px] text-ink2">{COMING_SOON.join(', ')}. No publican sus precios en internet ni en SEPA.</p>
        </section>
      </main>
    </>
  );
}
