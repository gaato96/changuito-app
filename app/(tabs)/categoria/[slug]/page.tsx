import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { categoryBySlug } from '@/lib/catalog';
import { searchBrands, searchProducts } from '@/lib/data';
import { ProductRow } from '@/components/product-card';
import { TopBar } from '@/components/nav';
import { EmptyState, LegalNote } from '@/components/ui';
import { UrlFilterBar } from '@/components/url-filters';
import { filtersFromParams, toParams } from '@/lib/filters';

export const dynamic = 'force-dynamic';

const PAGE = 40;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = categoryBySlug((await params).slug);
  return { title: c?.name ?? 'Categoría' };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();
  const filters = filtersFromParams(sp, cat.id);
  const page = Math.max(1, Number(sp.pagina) || 1);
  const [products, brands] = await Promise.all([
    searchProducts({ ...filters, limit: PAGE * page }),
    searchBrands(null, cat.id),
  ]);
  const more = `/categoria/${slug}${toParams(filters)}${toParams(filters) ? '&' : '?'}pagina=${page + 1}`;

  return (
    <>
      <TopBar title={cat.name} subtitle={cat.hint} />
      <div className="sticky top-14 z-10 border-b border-line bg-bg/95 px-4 backdrop-blur">
        <UrlFilterBar value={filters} brands={brands} />
      </div>
      <div className="px-4">
        {products.length === 0 ? (
          <EmptyState icon="inventory_2" title="Sin productos" text="No hay productos con esos filtros." />
        ) : (
          <div className="divide-y divide-line">{products.map(p => <ProductRow key={p.id} p={p} unitFirst={filters.sort === 'unit_price'} />)}</div>
        )}
        {products.length === PAGE * page && (
          <Link href={more} scroll={false} replace className="btn btn-outline my-4 w-full">Ver más productos</Link>
        )}
      </div>
      <LegalNote className="py-6" />
    </>
  );
}
