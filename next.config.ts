import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Las imágenes de producto se enlazan directo desde las webs de cada cadena (no se copian)
    remotePatterns: [
      { protocol: 'https', hostname: '**.vtexassets.com' },
      { protocol: 'https', hostname: '**.vteximg.com.br' },
    ],
  },
  async headers() {
    return [
      // El service worker siempre se revisa: así las versiones nuevas llegan enseguida
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
};

export default nextConfig;
