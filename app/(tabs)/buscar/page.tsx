'use client';
// Búsqueda con autocompletado: tolerante a errores y acentos (función search_products en la base), con orden y filtros.
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_FILTERS, searchBrands, searchGenerics, searchProducts, type Filters, type GenericCard, type ProductCard } from '@/lib/data';
import { GenericRow } from '@/components/generic-row';
import { supabase } from '@/lib/supabase';
import { ProductRow } from '@/components/product-card';
import { activeCount, FilterBar } from '@/components/filters';
import { EmptyState, Icon } from '@/components/ui';

const RECENT_KEY = 'changuito:recent';
const POPULAR = ['Yerba', 'Aceite', 'Leche', 'Pañales', 'Nalga', 'Coca-Cola'];
const PAGE = 40;

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function writeRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8))); } catch { /* sin almacenamiento */ }
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<ProductCard[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [generics, setGenerics] = useState<GenericCard[]>([]);
  const [brands, setBrands] = useState<{ brand: string; n: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    setRecent(readRecent());
    const initial = new URLSearchParams(location.search).get('q');
    if (initial) setQ(initial);
    else input.current?.focus();
  }, []);

  const query = (term: string, offset: number) => searchProducts({
    q: term, limit: PAGE, offset, sort: filters.sort, chainId: filters.chainId, brand: filters.brand,
    categoryId: filters.categoryId, promoOnly: filters.promoOnly, minChains: filters.minChains,
  });

  // Nueva búsqueda o cambio de filtros
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const [r, g] = await Promise.all([query(term, 0), searchGenerics(term, 5).catch(() => [])]);
        if (id !== seq.current) return;
        setResults(r); setHasMore(r.length === PAGE); setGenerics(g); setError(false);
        // Registro anónimo de búsquedas (sin IP ni datos personales) para mejorar el catálogo; solo sin filtros
        if (!activeCount(filters)) {
          supabase.from('search_log').insert({ term_norm: term.toLowerCase().slice(0, 80), results: r.length }).then(() => {});
          const next = [term, ...readRecent().filter(x => x.toLowerCase() !== term.toLowerCase())];
          writeRecent(next); setRecent(next.slice(0, 8));
        }
      } catch {
        if (id === seq.current) setError(true);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filters]);

  // Marcas para el filtro: dependen de lo que se busca (y de la categoría elegida)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setBrands([]); return; }
    const t = setTimeout(() => searchBrands(term, filters.categoryId).then(setBrands).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [q, filters.categoryId]);

  async function loadMore() {
    if (!results) return;
    const more = await query(q.trim(), results.length);
    setResults([...results, ...more]); setHasMore(more.length === PAGE);
  }

  const removeRecent = (term: string) => { const next = recent.filter(r => r !== term); writeRecent(next); setRecent(next); };
  const filtered = activeCount(filters) > 0;

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-line bg-bg/95 px-4 pt-3 backdrop-blur">
        <label className="flex h-12 items-center gap-3 rounded-[12px] border border-line bg-card px-4 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <Icon name="search" className="text-muted" />
          <input
            ref={input} value={q} onChange={e => setQ(e.target.value)} type="search" inputMode="search" enterKeyHint="search"
            placeholder="Buscá un producto o marca" className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
          {q && <button aria-label="Borrar" onClick={() => setQ('')} className="-mr-2 flex h-10 w-10 items-center justify-center text-muted"><Icon name="close" /></button>}
        </label>
        {results !== null ? <FilterBar value={filters} onChange={setFilters} brands={brands} /> : <div className="h-3" />}
      </div>

      <div className="px-4">
        {results === null && !loading && (
          <>
            {recent.length > 0 && (
              <section className="mt-5">
                <h2 className="font-head text-[18px] font-semibold">Búsquedas recientes</h2>
                <ul className="mt-2">
                  {recent.map(r => (
                    <li key={r} className="flex items-center">
                      <button onClick={() => setQ(r)} className="flex min-h-12 flex-1 items-center gap-3 text-left"><Icon name="history" className="text-muted" />{r}</button>
                      <button aria-label={`Quitar ${r}`} onClick={() => removeRecent(r)} className="flex h-12 w-12 items-center justify-center text-muted"><Icon name="close" size={20} /></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="mt-5">
              <h2 className="font-head text-[18px] font-semibold">Lo más buscado</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {POPULAR.map(t => (
                  <button key={t} onClick={() => setQ(t)} className="chip h-9 border border-line bg-card px-4 text-[15px] font-medium text-ink">{t}</button>
                ))}
              </div>
            </section>
          </>
        )}

        {loading && <p className="mt-3 text-center text-[13px] text-ink2">Buscando…</p>}
        {error && <p className="mt-6 rounded-[12px] bg-warn-bg p-3 text-[15px] text-warn">No pudimos buscar. Revisá tu conexión.</p>}

        {results && generics.length > 0 && !filtered && (
          <section className="mt-3">
            <h2 className="text-[13px] font-semibold tracking-wide text-ink2 uppercase">Frescos por kilo</h2>
            <div className="divide-y divide-line">{generics.map(g => <GenericRow key={g.id} g={g} />)}</div>
          </section>
        )}
        {results && results.length === 0 && (filtered || generics.length === 0) && !loading && (
          filtered
            ? <EmptyState icon="filter_alt_off" title="Ningún producto con esos filtros" text="Probá sacando algún filtro." action={<button className="btn btn-outline" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>Quitar filtros</button>} />
            : <EmptyState icon="search_off" title="No encontramos eso" text="Probá con menos palabras o revisá cómo está escrito." />
        )}
        {results && results.length > 0 && (
          <>
            {generics.length > 0 && !filtered && <h2 className="mt-4 text-[13px] font-semibold tracking-wide text-ink2 uppercase">Productos</h2>}
            <p className="mt-2 text-[13px] text-muted">{hasMore ? `Más de ${results.length} resultados` : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`}</p>
            <div className="divide-y divide-line">{results.map(p => <ProductRow key={p.id} p={p} unitFirst={filters.sort === 'unit_price'} />)}</div>
            {hasMore && <button className="btn btn-outline my-4 w-full" onClick={loadMore}>Ver más productos</button>}
          </>
        )}
      </div>
    </div>
  );
}
