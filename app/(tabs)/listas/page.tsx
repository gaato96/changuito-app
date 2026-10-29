'use client';
// Mis listas: crear, renombrar, duplicar y borrar. Se guardan en el teléfono.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createList, deleteList, duplicateList, renameList, useLists, type ShoppingList } from '@/lib/lists';
import { EmptyState, Icon } from '@/components/ui';

function NameDialog({ title, initial, cta, onSubmit, onClose }: { title: string; initial: string; cta: string; onSubmit: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form className="relative w-full max-w-[480px] rounded-t-[24px] bg-card px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]"
        onSubmit={e => { e.preventDefault(); onSubmit(name); }}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="font-head text-[20px] font-semibold">{title}</h2>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ej.: Compra del mes"
          className="mt-4 h-12 w-full rounded-[12px] border border-line bg-subtle px-3 outline-none focus:border-primary focus:bg-card" />
        <button type="submit" className="btn btn-primary mt-4 w-full">{cta}</button>
      </form>
    </div>
  );
}

function ListCard({ l, onRename }: { l: ShoppingList; onRename: () => void }) {
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  return (
    <li className="card relative">
      <Link href={`/listas/${l.id}`} className="block p-4 pr-14 active:bg-subtle rounded-[16px]">
        <span className="block truncate font-head text-[18px] font-semibold leading-6">{l.name}</span>
        <span className="num text-[15px] text-ink2">{l.items.length} {l.items.length === 1 ? 'producto' : 'productos'} · editada {new Date(l.updatedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
      </Link>
      <button aria-label="Opciones" onClick={() => setMenu(m => !m)} className="absolute top-2 right-2 flex h-12 w-12 items-center justify-center rounded-full text-ink2 active:bg-subtle">
        <Icon name="more_vert" />
      </button>
      {menu && (
        <>
          <button aria-label="Cerrar menú" className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <ul className="card absolute top-12 right-2 z-20 w-56 overflow-hidden py-1 shadow-[0_4px_12px_rgba(22,26,23,.12)]">
            <li><button className="flex min-h-12 w-full items-center gap-3 px-4" onClick={() => { setMenu(false); onRename(); }}><Icon name="edit" />Renombrar</button></li>
            <li><button className="flex min-h-12 w-full items-center gap-3 px-4" onClick={async () => { setMenu(false); const c = await duplicateList(l.id); if (c) router.push(`/listas/${c.id}`); }}><Icon name="content_copy" />Duplicar</button></li>
            <li><Link className="flex min-h-12 w-full items-center gap-3 px-4" href={`/listas/${l.id}?compartir=1`}><Icon name="share" />Compartir</Link></li>
            <li><button className="flex min-h-12 w-full items-center gap-3 px-4 text-err" onClick={() => { setMenu(false); if (confirm(`¿Borrar "${l.name}"?`)) deleteList(l.id); }}><Icon name="delete" />Borrar</button></li>
          </ul>
        </>
      )}
    </li>
  );
}

export default function ListsPage() {
  const lists = useLists();
  const router = useRouter();
  const [dialog, setDialog] = useState<{ mode: 'new' } | { mode: 'rename'; list: ShoppingList } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('nueva')) setDialog({ mode: 'new' });
  }, []);

  return (
    <div className="px-4">
      <header className="pt-6 pb-2">
        <h1 className="font-head text-[28px] font-extrabold leading-[34px] tracking-tight">Mis listas</h1>
        <p className="text-[13px] text-ink2">Se guardan en este teléfono.</p>
      </header>

      {lists && lists.length === 0 && (
        <EmptyState title="Todavía no tenés listas" text="Armá tu primera lista y te decimos dónde conviene comprarla."
          action={<button className="btn btn-primary" onClick={() => setDialog({ mode: 'new' })}><Icon name="add" />Crear lista</button>} />
      )}
      {lists && lists.length > 0 && (
        <ul className="mt-3 space-y-3">
          {lists.map(l => <ListCard key={l.id} l={l} onRename={() => setDialog({ mode: 'rename', list: l })} />)}
        </ul>
      )}

      {lists && lists.length > 0 && (
        <button onClick={() => setDialog({ mode: 'new' })}
          className="btn btn-primary fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 shadow-[0_4px_12px_rgba(22,26,23,.16)]">
          <Icon name="add" />Nueva lista
        </button>
      )}

      {dialog?.mode === 'new' && (
        <NameDialog title="Nueva lista" initial="" cta="Crear lista" onClose={() => setDialog(null)}
          onSubmit={async name => { const l = await createList(name); setDialog(null); router.push(`/listas/${l.id}`); }} />
      )}
      {dialog?.mode === 'rename' && (
        <NameDialog title="Renombrar lista" initial={dialog.list.name} cta="Guardar" onClose={() => setDialog(null)}
          onSubmit={async name => { await renameList(dialog.list.id, name); setDialog(null); }} />
      )}
    </div>
  );
}
