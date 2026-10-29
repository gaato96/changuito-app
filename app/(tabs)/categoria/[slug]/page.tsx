import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { categoryBySlug } from '@/lib/catalog';
import { categoryBrands, searchProducts, type Sort } from '@/lib/data';
import { ProductRow } from '@/components/product-card';
import { TopBar } from '@/components/nav';
import { EmptyState, LegalNote } from '@/components/ui';

export const dynamic = 'force-dynamic';

const PAGE = 40;
const SORTS: { key: Sort; label: string }[] = [
  { key: 'relevance', label: 'Más comparados' },
  { key: 'price', label: 'Precio más bajo' },
  { key: 'unit_price', label: 'Precio por kg/L' },
];

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ orden?: string; marca?: string; pagina?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = categoryBySlug((await params).slug);
  return { title: c?.name ?? 'Categoría' };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();
  const sort = (SORTS.find(s => s.key === sp.orden)?.key ?? 'relevance') as Sort;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const [products, brands] = await Promise.all([
    searchProducts({ categoryId: cat.id, brand: sp.marca, sort, limit: PAGE * page }),
    categoryBrands(cat.id),
  ]);
  const href = (o: { orden?: string; marca?: string | null; pagina?: number }) => {
    const u = new URLSearchParams();
    const orden = o.orden ?? sort;
    const marca = o.marca === null ? undefined : (o.marca ?? sp.marca);
    if (orden !== 'relevance') u.set('orden', orden);
    if (marca) u.set('marca', marca);
    if (o.pagina && o.pagina > 1) u.set('pagina', String(o.pagina));
    const s = u.toString();
    return `/categoria/${slug}${s ? `?${s}` : ''}`;
  };

  return (
    <>
      <TopBar title={cat.name} subtitle={sp.marca ? `Marca: ${sp.marca}` : cat.hint} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
        {SORTS.map(s => (
          <Link key={s.key} href={href({ orden: s.key })} replace
            className={`chip h-9 flex-none border px-4 text-[15px] ${s.key === sort ? 'border-primary bg-primary-tint text-primary' : 'border-line bg-card font-medium text-ink2'}`}>
            {s.label}
          </Link>
        ))}
      </div>
      {brands.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-2 pb-1">
          {sp.marca && <Link href={href({ marca: null })} replace className="chip h-8 flex-none border border-primary bg-primary-tint text-primary">✕ {sp.marca}</Link>}
          {brands.filter(b => b.brand !== sp.marca).slice(0, 20).map(b => (
            <Link key={b.brand} href={href({ marca: b.brand })} replace className="chip h-8 flex-none border border-line bg-subtle font-medium text-ink2">{b.brand}</Link>
          ))}
        </div>
      )}
      <div className="px-4">
        {products.length === 0 ? (
          <EmptyState icon="inventory_2" title="Sin productos" text="Todavía no hay precios vigentes en esta categoría." />
        ) : (
          <div className="divide-y divide-line">{products.map(p => <ProductRow key={p.id} p={p} />)}</div>
        )}
        {products.length === PAGE * page && (
          <Link href={href({ pagina: page + 1 })} scroll={false} className="btn btn-outline my-4 w-full">Ver más productos</Link>
        )}
      </div>
      <LegalNote className="py-6" />
    </>
  );
}
