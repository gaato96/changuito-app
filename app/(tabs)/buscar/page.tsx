'use client';
// Búsqueda con autocompletado: tolerante a errores y acentos (función search_products en la base).
import { useEffect, useRef, useState } from 'react';
import { searchGenerics, searchProducts, type GenericCard, type ProductCard } from '@/lib/data';
import { GenericRow } from '@/components/generic-row';
import { supabase } from '@/lib/supabase';
import { ProductRow } from '@/components/product-card';
import { EmptyState, Icon } from '@/components/ui';

const RECENT_KEY = 'changuito:recent';
const POPULAR = ['Yerba', 'Aceite', 'Leche', 'Pañales', 'Nalga', 'Coca-Cola'];

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function writeRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8))); } catch { /* sin almacenamiento */ }
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ProductCard[] | null>(null);
  const [generics, setGenerics] = useState<GenericCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    setRecent(readRecent());
    const initial = new URLSearchParams(location.search).get('q');
    if (initial) setQ(initial);
    input.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const [r, g] = await Promise.all([searchProducts({ q: term, limit: 40 }), searchGenerics(term, 5).catch(() => [])]);
        if (id !== seq.current) return;
        setResults(r); setGenerics(g); setError(false);
        // Registro anónimo de búsquedas (sin IP ni datos personales) para mejorar el catálogo
        supabase.from('search_log').insert({ term_norm: term.toLowerCase().slice(0, 80), results: r.length }).then(() => {});
        const next = [term, ...readRecent().filter(x => x.toLowerCase() !== term.toLowerCase())];
        writeRecent(next); setRecent(next.slice(0, 8));
      } catch {
        if (id === seq.current) setError(true);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const removeRecent = (term: string) => { const next = recent.filter(r => r !== term); writeRecent(next); setRecent(next); };

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <label className="flex h-12 items-center gap-3 rounded-[12px] border border-line bg-card px-4 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <Icon name="search" className="text-muted" />
          <input
            ref={input} value={q} onChange={e => setQ(e.target.value)} type="search" inputMode="search" enterKeyHint="search"
            placeholder="Buscá un producto o marca" className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
          {q && <button aria-label="Borrar" onClick={() => setQ('')} className="-mr-2 flex h-10 w-10 items-center justify-center text-muted"><Icon name="close" /></button>}
        </label>
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

        {loading && results === null && <p className="mt-6 text-center text-ink2">Buscando…</p>}
        {error && <p className="mt-6 rounded-[12px] bg-warn-bg p-3 text-[15px] text-warn">No pudimos buscar. Revisá tu conexión.</p>}

        {results && generics.length > 0 && (
          <section className="mt-3">
            <h2 className="text-[13px] font-semibold tracking-wide text-ink2 uppercase">Frescos por kilo</h2>
            <div className="divide-y divide-line">{generics.map(g => <GenericRow key={g.id} g={g} />)}</div>
          </section>
        )}
        {results && results.length === 0 && generics.length === 0 && !loading && (
          <EmptyState icon="search_off" title="No encontramos eso" text="Probá con menos palabras o revisá cómo está escrito." />
        )}
        {results && results.length > 0 && (
          <>
            {generics.length > 0 && <h2 className="mt-4 text-[13px] font-semibold tracking-wide text-ink2 uppercase">Productos</h2>}
            <p className="mt-3 text-[13px] text-muted">{results.length === 40 ? 'Más de 40 resultados' : `${results.length} resultados`}</p>
            <div className="divide-y divide-line">{results.map(p => <ProductRow key={p.id} p={p} />)}</div>
          </>
        )}
      </div>
    </div>
  );
}
