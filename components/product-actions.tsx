'use client';
// Barra inferior fija de la ficha: cantidad + "Agregar a lista".
import { useState } from 'react';
import { AddToListSheet, QtyStepper, type AddTarget } from './add-to-list';
import { Icon } from './ui';

export function ProductActions({ target }: { target: AddTarget }) {
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[480px] items-center gap-3 border-t border-line bg-card px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(22,26,23,.06)]">
        <QtyStepper qty={qty} onChange={setQty} byWeight={target.soldByWeight} />
        <button className="btn btn-primary flex-1" onClick={() => setOpen(true)}>
          <Icon name="add_shopping_cart" /> Agregar a lista
        </button>
      </div>
      {open && <AddToListSheet target={target} initialQty={qty} onClose={() => setOpen(false)} />}
    </>
  );
}
