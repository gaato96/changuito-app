import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Las imágenes de producto se enlazan directo desde las webs de cada cadena (no se copian)
    remotePatterns: [
      { protocol: 'https', hostname: '**.vtexassets.com' },
      { protocol: 'https', hostname: '**.vteximg.com.br' },
    ],
  },
};

export default nextConfig;
