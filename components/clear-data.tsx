'use client';
import { useRouter } from 'next/navigation';
import { Icon } from './ui';

/** Borra listas y precios guardados en este teléfono. */
export function ClearDataButton() {
  const router = useRouter();
  async function clear() {
    if (!confirm('¿Borrar tus listas y los precios guardados en este teléfono? No se puede deshacer.')) return;
    await new Promise<void>(res => { const r = indexedDB.deleteDatabase('changuito'); r.onsuccess = r.onerror = r.onblocked = () => res(); });
    try { localStorage.clear(); } catch { /* sin almacenamiento */ }
    router.push('/');
    location.reload();
  }
  return (
    <button onClick={clear} className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-err active:bg-subtle">
      <Icon name="delete_forever" />Borrar datos de este teléfono
    </button>
  );
}
