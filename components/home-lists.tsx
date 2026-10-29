'use client';
import Link from 'next/link';
import { useLists } from '@/lib/lists';
import { Icon } from './ui';

/** "Mis listas" en el inicio: tarjetas horizontales y acceso a crear una nueva. */
export function HomeLists() {
  const lists = useLists();
  if (lists === null) return <div className="mt-8 h-[150px]" />;
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-head text-[20px] font-semibold leading-[26px]">Mis listas</h2>
        {lists.length > 0 && (
          <Link href="/listas" className="flex items-center text-[15px] font-semibold text-primary">
            Ver todas <Icon name="chevron_right" size={20} />
          </Link>
        )}
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {lists.slice(0, 6).map(l => (
          <Link key={l.id} href={`/listas/${l.id}`} className="card w-[240px] flex-none snap-start p-4 active:bg-subtle">
            <span className="block truncate font-head text-[18px] font-semibold leading-6">{l.name}</span>
            <span className="num text-[15px] text-ink2">{l.items.length} {l.items.length === 1 ? 'producto' : 'productos'}</span>
            <span className="mt-4 flex items-center gap-1 border-t border-line pt-3 text-[15px] font-semibold text-primary">
              Ver dónde conviene <Icon name="arrow_forward" size={18} />
            </span>
          </Link>
        ))}
        <Link href="/listas?nueva=1" className="flex w-[160px] flex-none snap-start flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-line p-4 text-primary">
          <Icon name="add" size={28} />
          <span className="font-semibold">Nueva lista</span>
        </Link>
      </div>
    </section>
  );
}
