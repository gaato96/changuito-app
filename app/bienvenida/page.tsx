'use client';
// Bienvenida (solo la primera vez): qué es Changuito, cómo se usa y cómo instalarlo. Diseño: Stitch "Bienvenida 1 de 3".
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CHAINS, ONBOARDED_KEY } from '@/lib/catalog';
import { ChainTag, Icon } from '@/components/ui';
import { HowItWorks } from '@/components/how-it-works';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    // Android/Chrome: guardamos el aviso de instalación para mostrarlo con un botón propio
    const onPrompt = (e: Event) => { e.preventDefault(); setInstall(e as InstallPrompt); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setStandalone(window.matchMedia('(display-mode: standalone)').matches);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function finish(to = '/') {
    try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch { /* sin almacenamiento */ }
    router.replace(to);
  }

  const last = standalone ? 1 : 2;   // si ya está instalada, no hace falta el paso de instalar
  const next = () => (step < last ? setStep(step + 1) : finish('/buscar'));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-4">
        <span className="flex items-center gap-1.5 font-head text-[24px] font-extrabold text-primary"><Icon name="shopping_cart" size={26} />Changuito</span>
        <div className="flex items-center gap-4">
          <span className="flex gap-1.5" aria-label={`Paso ${step + 1} de ${last + 1}`}>
            {Array.from({ length: last + 1 }, (_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-7 bg-primary' : 'w-2 bg-line'}`} />)}
          </span>
          <button onClick={() => finish()} className="text-[15px] text-ink2">Saltar</button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
        {step === 0 && (
          <section className="text-center">
            <div className="mx-auto mt-4 flex h-40 w-40 items-center justify-center rounded-full bg-subtle">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary-tint text-primary">
                <Icon name="shopping_cart" size={56} />
                <span className="absolute top-3 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-save-bg text-save"><Icon name="check" size={20} /></span>
              </div>
            </div>
            <h1 className="mt-6 font-head text-[28px] font-extrabold leading-[34px]">Sabé dónde te conviene comprar</h1>
            <p className="mt-2 text-[17px] leading-6 text-ink2">Compará precios de 6 supers de Tucumán, armá tu lista y mirá cuánto ahorrás.</p>
            <ul className="mt-6 space-y-3 text-left">
              {[['history', 'Precios actualizados todos los días'], ['wifi_off', 'Funciona sin internet en el super'], ['lock_open', 'Gratis y sin cuenta']].map(([i, t]) => (
                <li key={t} className="card flex items-center gap-3 p-4"><span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-subtle text-primary"><Icon name={i} /></span><span className="font-semibold">{t}</span></li>
              ))}
            </ul>
            <p className="mt-6 text-[13px] font-semibold tracking-wide text-ink2 uppercase">Supermercados del Gran Tucumán</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {CHAINS.map(c => <span key={c.id} className="chip h-9 border border-line bg-card px-3 text-[15px] text-ink"><ChainTag chainId={c.id} /></span>)}
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="mt-4 font-head text-[28px] font-extrabold leading-[34px]">Así se usa</h1>
            <p className="mt-2 text-[17px] leading-6 text-ink2">En 4 pasos sabés en qué super te conviene hacer la compra.</p>
            <div className="mt-6"><HowItWorks /></div>
            <p className="mt-6 rounded-[12px] bg-subtle p-3 text-[13px] leading-[18px] text-ink2">
              Los precios salen de las webs oficiales y de datos públicos (SEPA). Pueden diferir un poco en el local.
            </p>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="mt-4 font-head text-[28px] font-extrabold leading-[34px]">Tenela a mano</h1>
            <p className="mt-2 text-[17px] leading-6 text-ink2">Instalala como una app: se abre desde la pantalla de inicio y anda sin internet adentro del super.</p>
            {install ? (
              <button className="btn btn-primary mt-6 w-full" onClick={async () => { await install.prompt(); await install.userChoice; setInstall(null); finish('/buscar'); }}>
                <Icon name="install_mobile" />Instalar Changuito
              </button>
            ) : (
              <div className="card mt-6 space-y-3 p-4 text-[15px] leading-5">
                {isIos ? (
                  <>
                    <p className="flex gap-2"><b>1.</b> Tocá el botón Compartir <Icon name="ios_share" size={20} className="text-primary" /> abajo en Safari.</p>
                    <p className="flex gap-2"><b>2.</b> Elegí <b>“Agregar a inicio”</b>.</p>
                  </>
                ) : (
                  <>
                    <p className="flex gap-2"><b>1.</b> Abrí el menú del navegador <Icon name="more_vert" size={20} className="text-primary" />.</p>
                    <p className="flex gap-2"><b>2.</b> Tocá <b>“Instalar app”</b> o <b>“Agregar a la pantalla principal”</b>.</p>
                  </>
                )}
              </div>
            )}
            <p className="mt-4 text-[13px] text-muted">Podés hacerlo después: también está en Ajustes.</p>
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] bg-bg px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <button className="btn btn-primary w-full" onClick={next}>{step === 0 ? 'Empezar' : step < last ? 'Siguiente' : 'Listo, armar mi lista'}</button>
      </div>
    </div>
  );
}
