// Componentes básicos del sistema de diseño (Stitch): íconos, etiquetas de super, chips, miniaturas.
import { chainById, LEGAL } from '@/lib/catalog';

export function Icon({ name, fill, className = '', size }: { name: string; fill?: boolean; className?: string; size?: number }) {
  return (
    <span aria-hidden className={`icon ${fill ? 'icon-fill' : ''} ${className}`} style={size ? { fontSize: size } : undefined}>
      {name}
    </span>
  );
}

/** Punto de color + nombre del super. Nunca logos (PLAN.md §1.4.12). */
export function ChainTag({ chainId, full, className = '' }: { chainId: number; full?: boolean; className?: string }) {
  const c = chainById(chainId);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="dot" style={{ background: `var(--chain-${c.slug})` }} />
      <span>{full ? c.displayName : c.name}</span>
    </span>
  );
}

type Tone = 'save' | 'promo' | 'warn' | 'neutral' | 'primary' | 'err';
const TONES: Record<Tone, string> = {
  save: 'bg-save-bg text-save',
  promo: 'bg-promo-bg text-promo',
  warn: 'bg-warn-bg text-warn',
  err: 'bg-err-bg text-err',
  neutral: 'bg-subtle text-ink2',
  primary: 'bg-primary-tint text-primary',
};

export function Chip({ tone = 'neutral', icon, children, className = '' }: { tone?: Tone; icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={`chip ${TONES[tone]} ${className}`}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}

export function NoData() {
  return <span className="chip border border-dashed border-line text-muted font-medium">Sin dato</span>;
}

/** Imagen del producto enlazada desde la web de la cadena; sin imagen, un ícono de la categoría. */
export function ProductThumb({ src, alt, size = 64, icon = 'shopping_basket' }: { src: string | null; alt: string; size?: number; icon?: string }) {
  return (
    <div className={`flex flex-none items-center justify-center overflow-hidden rounded-[12px] border border-line ${src ? 'bg-white' : 'bg-subtle'}`} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-contain p-1" />
      ) : (
        <Icon name={icon} className="text-muted" size={Math.round(size * 0.45)} />
      )}
    </div>
  );
}

export function LegalNote({ className = '' }: { className?: string }) {
  return <p className={`px-4 text-center text-[13px] leading-[18px] text-muted ${className}`}>{LEGAL}</p>;
}

export function EmptyState({ icon = 'shopping_cart', title, text, action }: { icon?: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-tint text-primary">
        <Icon name={icon} size={40} />
      </div>
      <h2 className="mt-5 font-head text-[20px] font-semibold leading-[26px]">{title}</h2>
      <p className="mt-2 text-[15px] leading-5 text-ink2">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
