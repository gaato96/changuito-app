'use client';
// Fila de producto para búsqueda y categorías: miniatura, nombre, precio más bajo y botón "+" para agregar a una lista.
import Link from 'next/link';
import { useState } from 'react';
import { categoryById, chainById, money, sizeText, unitLabel } from '@/lib/catalog';
import type { ProductCard } from '@/lib/data';
import { AddToListSheet } from './add-to-list';
import { Chip, Icon, ProductThumb } from './ui';

export function toTarget(p: Pick<ProductCard, 'id' | 'name' | 'brand' | 'image_url' | 'size_value' | 'size_unit' | 'kind' | 'category_id'>) {
  return {
    productId: p.id, name: p.name, brand: p.brand, imageUrl: p.image_url, size: sizeText(p.size_value, p.size_unit),
    soldByWeight: p.kind === 'weighed', categoryId: p.category_id,
  };
}

export function ProductRow({ p, unitFirst }: { p: ProductCard; unitFirst?: boolean }) {
  const [adding, setAdding] = useState(false);
  const weighed = p.kind === 'weighed';
  const cat = categoryById(p.category_id);
  return (
    <>
      <div className="flex items-center gap-3 py-3">
        <Link href={`/producto/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <ProductThumb src={p.image_url} alt={p.name} icon={cat?.icon} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[15px] font-semibold leading-5">{p.name}</p>
            <p className="mt-0.5 text-[13px] leading-[18px] text-ink2">
              {[p.brand, sizeText(p.size_value, p.size_unit)].filter(Boolean).join(' · ')}
            </p>
            {unitFirst && !weighed && p.min_unit_price && (
              <p className="num mt-1 text-[17px] font-bold text-primary">{money(p.min_unit_price, true)} / {unitLabel(p.unit_label)}</p>
            )}
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className={`num font-bold ${unitFirst && !weighed && p.min_unit_price ? 'text-[15px]' : 'text-[17px]'}`}>{money(p.min_price)}{weighed ? ' /kg' : ''}</span>
              <span className="text-[13px] text-ink2">en {chainById(p.min_chain_id).name}</span>
            </p>
            <p className="mt-1 flex flex-wrap gap-1.5">
              {!weighed && p.min_unit_price && !unitFirst && <span className="num text-[13px] text-muted">{money(p.min_unit_price, true)} / {unitLabel(p.unit_label)}</span>}
              <Chip>{p.chains_count === 1 ? 'En 1 super' : `En ${p.chains_count} supers`}</Chip>
              {p.has_promo && <Chip tone="promo" icon="sell">Promo</Chip>}
            </p>
          </div>
        </Link>
        <button aria-label={`Agregar ${p.name} a una lista`} onClick={() => setAdding(true)} className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary-tint text-primary active:bg-primary active:text-on-primary">
          <Icon name="add" />
        </button>
      </div>
      {adding && <AddToListSheet target={toTarget(p)} onClose={() => setAdding(false)} />}
    </>
  );
}
