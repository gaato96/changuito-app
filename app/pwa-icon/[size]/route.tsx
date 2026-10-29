// Íconos PNG para el manifest de la PWA: /pwa-icon/192, /pwa-icon/512, /pwa-icon/512-maskable
import { appIcon } from '@/lib/app-icon';

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const maskable = size.endsWith('-maskable');
  const px = Math.min(1024, Math.max(16, Number.parseInt(size, 10) || 192));
  const res = appIcon(px, { maskable });
  res.headers.set('cache-control', 'public, max-age=604800, immutable');
  return res;
}
