'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './ui';
import { useLists } from '@/lib/lists';

const TABS = [
  { href: '/', label: 'Inicio', icon: 'home', match: (p: string) => p === '/' || p.startsWith('/categoria') },
  { href: '/buscar', label: 'Buscar', icon: 'search', match: (p: string) => p.startsWith('/buscar') },
  { href: '/listas', label: 'Listas', icon: 'format_list_bulleted', match: (p: string) => p.startsWith('/listas') },
  { href: '/ajustes', label: 'Ajustes', icon: 'settings', match: (p: string) => p.startsWith('/ajustes') },
];

export function BottomNav() {
  const path = usePathname();
  const lists = useLists();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="grid h-16 grid-cols-4">
        {TABS.map(t => {
          const active = t.match(path);
          return (
            <li key={t.href}>
              <Link href={t.href} className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[13px] font-semibold ${active ? 'text-primary' : 'text-muted'}`}>
                <Icon name={t.icon} fill={active} />
                {t.label}
                {t.href === '/listas' && !!lists?.length && (
                  <span className="num absolute top-1.5 left-1/2 ml-2 min-w-5 rounded-full bg-primary px-1.5 text-[11px] leading-5 text-on-primary">{lists.length}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barra superior con volver. */
export function TopBar({ title, subtitle, right, back = true }: { title?: string; subtitle?: string; right?: React.ReactNode; back?: boolean }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1 border-b border-line bg-bg/95 px-2 backdrop-blur">
      {back && (
        <button aria-label="Volver" onClick={() => (history.length > 1 ? router.back() : router.push('/'))} className="flex h-12 w-12 items-center justify-center rounded-full active:bg-subtle">
          <Icon name="arrow_back" />
        </button>
      )}
      <div className="min-w-0 flex-1 px-1">
        {title && <h1 className="truncate font-head text-[18px] font-semibold leading-6">{title}</h1>}
        {subtitle && <p className="truncate text-[13px] leading-[18px] text-ink2">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
