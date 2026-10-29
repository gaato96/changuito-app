// Fase 0: recorre todas las categorías de súper de una cadena y guarda filas compactas para medir volumen
import { CHAINS, vtexFetch, regionCookie, totalFrom } from './lib.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const SUPER = {
  carrefour: [161, 222, 255, 292, 321, 330, 336, 347, 359, 402, 451, 471],
  changomas: [1000034, 1000035, 1000036, 1000037, 1000038, 1000041, 1000042, 1000043, 1000045, 1000047, 1000049, 1000050, 1000040],
  comodin: [7, 8, 320, 3, 15, 6, 5, 9, 10, 11, 14, 313, 324],
};
const [slug] = process.argv.slice(2);
const { base } = CHAINS[slug];
const cookie = await regionCookie(base);
const tree = JSON.parse(readFileSync('out/tree.json', 'utf8'))[slug];
const rows = new Map();
let requests = 0;
const started = Date.now();
async function crawl(node, path) {
  const q = `${base}/api/catalog_system/pub/products/search?fq=C:${path}/`;
  const total = totalFrom(await vtexFetch(`${q}&_from=0&_to=0`, { cookie })); requests++;
  if (total > 2500 && node.children?.length) {
    for (const ch of node.children) await crawl(ch, `${path}/${ch.id}`);
    return;
  }
  if (total > 2500) console.log('  AVISO: hoja con más de 2.500', path, total);
  for (let from = 0; from < Math.min(total, 2500); from += 50) {
    const res = await vtexFetch(`${q}&_from=${from}&_to=${from + 49}`, { cookie }); requests++;
    for (const p of await res.json()) {
      const it = p.items[0], o = it.sellers[0].commertialOffer;
      rows.set(p.productId, { id: p.productId, sku: it.itemId, ean: it.ean, name: p.productName, brand: p.brand, brandId: p.brandId, cat: p.categoryId, path: p.categories?.[0], mu: it.measurementUnit, um: it.unitMultiplier, price: o.Price, list: o.PriceWithoutDiscount, avail: o.IsAvailable && o.Price > 0, img: it.images?.[0]?.imageUrl, teasers: [...(o.Teasers || []), ...(o.DiscountHighLight || [])].map(t => t['<Name>k__BackingField']) });
    }
  }
}
for (const id of SUPER[slug]) {
  const node = tree.find(n => n.id === id);
  await crawl(node, `/${id}`);
  console.log(`${slug} ${node.name}: acumulado ${rows.size}`);
}
const all = [...rows.values()];
writeFileSync(`out/all-${slug}.json`, JSON.stringify(all));
console.log(`${slug} TOTAL ${all.length} productos, ${all.filter(r => r.avail).length} disponibles en Tucumán, ${requests} pedidos, ${Math.round((Date.now() - started) / 60000)} min`);
