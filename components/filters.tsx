'use client';
// Orden y filtros de resultados (búsqueda y categorías): chips de orden siempre visibles y una hoja con filtros.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, CHAINS } from '@/lib/catalog';
import { DEFAULT_FILTERS, type Filters, type Sort } from '@/lib/data';
import { ChainTag, Icon } from './ui';

export const SORTS: { key: Sort; label: string; hint: string }[] = [
  { key: 'relevance', label: 'Relevancia', hint: 'Lo que mejor coincide con tu búsqueda' },
  { key: 'price', label: 'Más barato', hint: 'Precio del producto, de menor a mayor' },
  { key: 'unit_price', label: 'Precio por kg/L', hint: 'Lo más justo para comparar tamaños distintos' },
  { key: 'coverage', label: 'Más comparados', hint: 'Los que están en más supers' },
];

/** Cantidad de filtros activos (sin contar el orden). */
export function activeCount(f: Filters, fixedCategory?: boolean) {
  return Number(!!f.chainId) + Number(!!f.brand) + Number(!!f.categoryId && !fixedCategory) + Number(f.promoOnly) + Number(f.minChains > 1);
}

const chip = (on: boolean) =>
  `chip h-9 flex-none border px-3.5 text-[15px] ${on ? 'border-primary bg-primary-tint text-primary' : 'border-line bg-card font-medium text-ink2'}`;

export function FilterBar({ value, onChange, brands, fixedCategory }: {
  value: Filters; onChange: (f: Filters) => void; brands: { brand: string; n: number }[]; fixedCategory?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const n = activeCount(value, fixedCategory);
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-2">
        <button onClick={() => setOpen(true)} className={`${chip(n > 0)} gap-1.5`}>
          <Icon name="tune" size={18} />Filtros{n > 0 && <span className="num rounded-full bg-primary px-1.5 text-[12px] leading-[18px] text-on-primary">{n}</span>}
        </button>
        {SORTS.map(s => (
          <button key={s.key} onClick={() => set({ sort: s.key })} className={chip(value.sort === s.key)}>
            {s.key === value.sort && s.key !== 'relevance' && <Icon name="arrow_downward" size={16} />}{s.label}
          </button>
        ))}
      </div>
      {/* Filtros activos, para quitarlos de un toque */}
      {n > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {value.chainId && <button className={chip(true)} onClick={() => set({ chainId: null })}><ChainTag chainId={value.chainId} /> ✕</button>}
          {value.brand && <button className={chip(true)} onClick={() => set({ brand: null })}>{value.brand} ✕</button>}
          {value.categoryId && !fixedCategory && <button className={chip(true)} onClick={() => set({ categoryId: null })}>{CATEGORIES.find(c => c.id === value.categoryId)?.name} ✕</button>}
          {value.promoOnly && <button className={chip(true)} onClick={() => set({ promoOnly: false })}>Con promo ✕</button>}
          {value.minChains > 1 && <button className={chip(true)} onClick={() => set({ minChains: 1 })}>En {value.minChains}+ supers ✕</button>}
        </div>
      )}
      {/* Portal: la barra donde vive tiene backdrop-blur, que encierra a los elementos fixed */}
      {open && createPortal(
        <FilterSheet value={value} brands={brands} fixedCategory={fixedCategory} onClose={() => setOpen(false)} onApply={f => { onChange(f); setOpen(false); }} />,
        document.body,
      )}
    </>
  );
}

function FilterSheet({ value, brands, fixedCategory, onClose, onApply }: {
  value: Filters; brands: { brand: string; n: number }[]; fixedCategory?: boolean; onClose: () => void; onApply: (f: Filters) => void;
}) {
  const [f, setF] = useState(value);
  const [allBrands, setAllBrands] = useState(false);
  const set = (patch: Partial<Filters>) => setF(x => ({ ...x, ...patch }));
  const section = 'mt-5 text-[13px] font-semibold tracking-wide text-ink2 uppercase';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Filtrar y ordenar">
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[88dvh] w-full max-w-[480px] flex-col rounded-t-[24px] bg-card">
        <div className="px-4 pt-2">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          <h2 className="font-head text-[20px] font-semibold">Filtrar y ordenar</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <p className={section}>Ordenar por</p>
          <ul className="mt-1">
            {SORTS.map(s => (
              <li key={s.key}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3">
                  <input type="radio" name="sort" className="h-5 w-5 accent-[var(--primary)]" checked={f.sort === s.key} onChange={() => set({ sort: s.key })} />
                  <span><span className="block">{s.label}</span><span className="block text-[13px] text-muted">{s.hint}</span></span>
                </label>
              </li>
            ))}
          </ul>

          <p className={section}>Supermercado</p>
          <p className="text-[13px] text-muted">Solo productos que hay en ese super, con su precio.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHAINS.map(c => (
              <button key={c.id} onClick={() => set({ chainId: f.chainId === c.id ? null : c.id })} className={chip(f.chainId === c.id)}><ChainTag chainId={c.id} /></button>
            ))}
          </div>

          <p className={section}>Mostrar solo</p>
          <label className="mt-1 flex min-h-12 cursor-pointer items-center justify-between gap-3">
            <span>Con promo</span>
            <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={f.promoOnly} onChange={e => set({ promoOnly: e.target.checked })} />
          </label>
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
            <span><span className="block">En 3 o más supers</span><span className="block text-[13px] text-muted">Para comparar de verdad</span></span>
            <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={f.minChains >= 3} onChange={e => set({ minChains: e.target.checked ? 3 : 1 })} />
          </label>

          {!fixedCategory && (
            <>
              <p className={section}>Categoría</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => set({ categoryId: f.categoryId === c.id ? null : c.id })} className={chip(f.categoryId === c.id)}>{c.name}</button>
                ))}
              </div>
            </>
          )}

          {brands.length > 0 && (
            <>
              <p className={section}>Marca</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(allBrands ? brands : brands.slice(0, 12)).map(b => (
                  <button key={b.brand} onClick={() => set({ brand: f.brand === b.brand ? null : b.brand })} className={chip(f.brand === b.brand)}>
                    {b.brand} <span className="num text-[12px] text-muted">{b.n}</span>
                  </button>
                ))}
                {!allBrands && brands.length > 12 && <button className="chip h-9 px-3 text-[15px] text-primary" onClick={() => setAllBrands(true)}>Ver todas</button>}
              </div>
            </>
          )}
        </div>
        <div className="flex gap-3 border-t border-line px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <button className="btn btn-outline" onClick={() => setF({ ...DEFAULT_FILTERS, categoryId: fixedCategory ? value.categoryId : null })}>Limpiar</button>
          <button className="btn btn-primary flex-1" onClick={() => onApply(f)}>Ver resultados</button>
        </div>
      </div>
    </div>
  );
}
