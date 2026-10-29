import type { Metadata } from 'next';
import { CATEGORIES } from '@/lib/catalog';
import { searchGenerics } from '@/lib/data';
import { TopBar } from '@/components/nav';
import { GenericRow } from '@/components/generic-row';
import { EmptyState, LegalNote } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Frescos por kilo' };

export default async function FreshListPage() {
  const all = await searchGenerics(null, 300);
  const groups = CATEGORIES.map(c => ({ c, items: all.filter(g => g.category_id === c.id) })).filter(g => g.items.length);
  return (
    <>
      <TopBar title="Frescos por kilo" subtitle="Carne, verdura, fiambre y queso al peso" />
      <div className="px-4">
        {!all.length && <EmptyState icon="eco" title="Todavía no hay frescos" text="Estamos revisando qué producto de cada super equivale a cada fresco." />}
        {groups.map(g => (
          <section key={g.c.id} className="mt-5">
            <h2 className="text-[13px] font-semibold tracking-wide text-ink2 uppercase">{g.c.name}</h2>
            <div className="divide-y divide-line">{g.items.map(x => <GenericRow key={x.id} g={x} />)}</div>
          </section>
        ))}
      </div>
      <LegalNote className="py-6" />
    </>
  );
}
