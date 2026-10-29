import type { Metadata } from 'next';
import { TopBar } from '@/components/nav';

export const metadata: Metadata = { title: 'Fuentes y aviso legal' };
export const dynamic = 'force-dynamic';

export default function SourcesPage() {
  const today = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Tucuman' });
  return (
    <>
      <TopBar title="Fuentes y aviso legal" />
      <main className="space-y-6 px-4 py-5 text-[17px] leading-6">
        <section>
          <h2 className="font-head text-[20px] font-semibold">De dónde salen los precios</h2>
          <p className="mt-2">Carrefour, ChangoMás y Comodín: desde sus webs oficiales, con el precio para Tucumán.</p>
          <p className="mt-2">
            Vea, Jumbo y La Anónima: desde el Sistema Electrónico de Publicidad de Precios Argentinos (SEPA) de la Secretaría de Comercio,
            publicado como datos abiertos con licencia{' '}
            <a className="text-primary underline" href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noreferrer">CC-BY 4.0</a> en{' '}
            <a className="text-primary underline" href="https://datos.produccion.gob.ar/dataset/sepa-precios" target="_blank" rel="noreferrer">datos.produccion.gob.ar</a>.
          </p>
        </section>
        <section className="rounded-[16px] border border-line bg-card p-4">
          <p>
            Precios tomados de las webs oficiales y de datos públicos (SEPA) al {today}. Pueden diferir en el local. Changuito no tiene relación con
            ningún supermercado: los nombres se usan solo para identificar dónde está cada precio.
          </p>
        </section>
        <section>
          <h2 className="font-head text-[20px] font-semibold">Qué no incluimos todavía</h2>
          <p className="mt-2">Descuentos con tarjetas y billeteras, y precios mayoristas. Los precios de Carrefour pueden incluir descuentos de Mi Carrefour (se aclara en cada caso).</p>
        </section>
        <section>
          <h2 className="font-head text-[20px] font-semibold">Privacidad</h2>
          <p className="mt-2">No hay cuentas ni cookies. Tus listas viven en tu teléfono. Registramos las búsquedas de forma anónima, sin IP ni datos personales, para mejorar el catálogo.</p>
        </section>
      </main>
    </>
  );
}
