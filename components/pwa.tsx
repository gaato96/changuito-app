'use client';
// Registra el service worker (solo en producción) y avisa cuando no hay conexión.
import { useEffect, useState } from 'react';
import { Icon } from './ui';

export function PwaSetup() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center gap-2 bg-ink px-4 py-2 text-[13px] text-bg">
      <Icon name="cloud_off" size={18} />Sin conexión. Tus listas y los últimos precios guardados siguen disponibles.
    </div>
  );
}
