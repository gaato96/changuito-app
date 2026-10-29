// Fase 0: recorre una categoría completa (recursiva si supera el límite de 2.500) y guarda los productos crudos
import { CHAINS, vtexFetch, regionCookie, totalFrom } from './lib.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [slug, rootId] = process.argv.slice(2);
const { base, useCookie } = CHAINS[slug];
const cookie = useCookie ? await regionCookie(base) : undefined;
const tree = JSON.parse(readFileSync('out/tree.json', 'utf8'))[slug];
const find = (nodes, id, path = '') => {
  for (const n of nodes) {
    const p = `${path}/${n.id}`;
    if (String(n.id) === String(id)) return { node: n, path: p };
    const r = find(n.children || [], id, p);
    if (r) return r;
  }
};
const { node: root, path: rootPath } = find(tree, rootId);
const started = Date.now();
const products = new Map();
let requests = 0;
async function crawl(node, path) {
  const q = `${base}/api/catalog_system/pub/products/search?fq=C:${path}/`;
  const head = await vtexFetch(`${q}&_from=0&_to=0`, { cookie }); requests++;
  const total = totalFrom(head);
  if (total > 2500 && node.children?.length) {
    for (const ch of node.children) await crawl(ch, `${path}/${ch.id}`);
    return;
  }
  for (let from = 0; from < Math.min(total, 2550); from += 50) {
    const res = await vtexFetch(`${q}&_from=${from}&_to=${from + 49}`, { cookie }); requests++;
    for (const p of await res.json()) products.set(p.productId, p);
  }
}
await crawl(root, rootPath);
const secs = Math.round((Date.now() - started) / 1000);
writeFileSync(`out/${slug}-${rootId}.json`, JSON.stringify([...products.values()]));
console.log(`${slug} ${root.name}: ${products.size} productos, ${requests} pedidos, ${secs} s`);
