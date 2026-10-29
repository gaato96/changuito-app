'use client';
// Barra de filtros que guarda el estado en la URL (categorías).
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { Filters } from '@/lib/data';
import { toParams } from '@/lib/filters';
import { FilterBar } from './filters';

export function UrlFilterBar({ value, brands }: { value: Filters; brands: { brand: string; n: number }[] }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  return (
    <div className={pending ? 'opacity-60 transition-opacity' : ''}>
      <FilterBar value={value} brands={brands} fixedCategory onChange={f => start(() => router.replace(`${path}${toParams(f)}`, { scroll: false }))} />
    </div>
  );
}
