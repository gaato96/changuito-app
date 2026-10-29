// Fase 0: árbol de categorías y cantidad de productos por categoría de primer nivel
import { CHAINS, vtexFetch, regionCookie, totalFrom } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const out = {};
for (const [slug, { base, useCookie }] of Object.entries(CHAINS)) {
  const cookie = useCookie ? await regionCookie(base) : undefined;
  const tree = await (await vtexFetch(`${base}/api/catalog_system/pub/category/tree/3`)).json();
  out[slug] = [];
  console.log(`\n=== ${slug}`);
  for (const c of tree) {
    const res = await vtexFetch(`${base}/api/catalog_system/pub/products/search?fq=C:/${c.id}/&_from=0&_to=0`, { cookie });
    const n = totalFrom(res);
    out[slug].push({ id: c.id, name: c.name, total: n, children: c.children.map(ch => ({ id: ch.id, name: ch.name, children: ch.children.map(g => ({ id: g.id, name: g.name })) })) });
    console.log(`${String(c.id).padStart(6)} ${c.name.padEnd(40)} ${n}  [${c.children.map(ch => ch.name).join(', ').slice(0, 110)}]`);
  }
}
writeFileSync('out/tree.json', JSON.stringify(out, null, 2));
