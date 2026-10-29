import Link from 'next/link';
import { COMING_SOON } from '@/lib/catalog';
import { Icon } from '@/components/ui';
import { ClearDataButton } from '@/components/clear-data';

function Row({ href, icon, label, hint }: { href: string; icon: string; label: string; hint?: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 items-center gap-3 px-4 active:bg-subtle">
        <Icon name={icon} className="text-ink2" />
        <span className="flex-1">
          <span className="block">{label}</span>
          {hint && <span className="block text-[13px] leading-[18px] text-muted">{hint}</span>}
        </span>
        <Icon name="chevron_right" className="text-muted" />
      </Link>
    </li>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-5 px-4">
      <h1 className="pt-6 font-head text-[28px] font-extrabold leading-[34px] tracking-tight">Ajustes</h1>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-ink2 uppercase">Supermercados</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          <Row href="/ajustes/estado" icon="monitor_heart" label="Estado de los precios" hint="Cuándo se actualizó cada super" />
          <li className="px-4 py-3">
            <span className="block">Próximamente</span>
            <span className="block text-[13px] leading-[18px] text-muted">{COMING_SOON.join(', ')}: no publican sus precios en internet.</span>
          </li>
          <li className="px-4 py-3 text-[13px] leading-[18px] text-ink2">
            ChangoMás muestra los precios de su web, que son los del Hiper Camino del Perú. Las otras sucursales pueden tener precios distintos.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-ink2 uppercase">Información</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          <Row href="/bienvenida" icon="help" label="Cómo funciona" hint="Los pasos para usar Changuito e instalarlo" />
          <Row href="/ajustes/fuentes" icon="gavel" label="Fuentes y aviso legal" />
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-ink2 uppercase">Datos</h2>
        <div className="card overflow-hidden"><ClearDataButton /></div>
      </section>

      <p className="pb-6 text-center text-[13px] text-muted">Changuito · Gratis, sin publicidad y sin cuentas. Hecho en Tucumán.</p>
    </div>
  );
}
