'use client';
// Fila de un fresco genérico ("Nalga", "Tomate redondo"): precio por kg más bajo y botón para sumarlo a una lista.
import Link from 'next/link';
import { useState } from 'react';
import { categoryById, chainById, genericTarget, money } from '@/lib/catalog';
import type { GenericCard } from '@/lib/data';
import { AddToListSheet } from './add-to-list';
import { Chip, Icon } from './ui';

export function GenericRow({ g }: { g: GenericCard }) {
  const [adding, setAdding] = useState(false);
  const cat = categoryById(g.category_id);
  const per = g.unit === 'kg' ? ' /kg' : ' c/u';
  return (
    <>
      <div className="flex items-center gap-3 py-3">
        <Link href={`/fresco/${g.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[12px] bg-primary-tint text-primary">
            <Icon name={cat?.icon ?? 'eco'} size={30} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-5">{g.name}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="num text-[17px] font-bold">{money(g.min_price)}{per}</span>
              <span className="text-[13px] text-ink2">en {chainById(g.min_chain_id).name}</span>
            </p>
            <p className="mt-1 flex flex-wrap gap-1.5">
              <Chip tone="primary">Fresco · {g.unit === 'kg' ? 'por kg' : 'por unidad'}</Chip>
              <Chip>{g.chains_count === 1 ? 'En 1 super' : `En ${g.chains_count} supers`}</Chip>
            </p>
          </div>
        </Link>
        <button aria-label={`Agregar ${g.name} a una lista`} onClick={() => setAdding(true)} className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary-tint text-primary active:bg-primary active:text-on-primary">
          <Icon name="add" />
        </button>
      </div>
      {adding && <AddToListSheet target={genericTarget(g)} onClose={() => setAdding(false)} />}
    </>
  );
}
