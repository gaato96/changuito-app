// Service worker de Changuito: la app abre sin internet (PLAN.md §6.2).
// - Archivos estáticos de Next, íconos y fuentes: se sirven del caché y se actualizan en segundo plano.
// - Páginas: primero la red (con tiempo límite); sin conexión, la última copia guardada.
// - Precios y listas no pasan por acá: viven en IndexedDB (lib/lists.ts).
const VERSION = 'v1';
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const SHELL = ['/', '/listas', '/buscar', '/ajustes'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(PAGES).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![STATIC, PAGES].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = url =>
  url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/pwa-icon/') ||
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' ||
  /\.(png|svg|ico|woff2?)$/.test(url.pathname);

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(res => { if (res.ok || res.type === 'opaque') cache.put(request, res.clone()); return res; }).catch(() => cached);
  return cached || fresh;
}

async function networkFirst(request, timeoutMs = 4000) {
  const cache = await caches.open(PAGES);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    // Navegación a una página no visitada: se muestra "Mis listas", que funciona sin conexión
    if (request.mode === 'navigate') return (await cache.match('/listas')) || (await cache.match('/')) || Response.error();
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isStatic(url)) { event.respondWith(staleWhileRevalidate(request)); return; }
  if (url.origin !== self.location.origin) return;             // Supabase y otros: directo a la red
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return;
  event.respondWith(networkFirst(request));
});
