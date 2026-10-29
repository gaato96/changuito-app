import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Changuito — Precios de súper en Tucumán',
    short_name: 'Changuito',
    description: 'Compará precios de supermercados de Tucumán, armá tu lista y mirá cuánto ahorrás.',
    lang: 'es-AR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAFAF7',
    theme_color: '#1F7A4D',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512-maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Buscar', url: '/buscar' },
      { name: 'Mis listas', url: '/listas' },
    ],
  };
}
