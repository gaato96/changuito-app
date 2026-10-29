// Fase 0: ¿Intelligent Search de ChangoMás expone promos (teasers) por producto?
import { CHAINS, vtexFetch } from './lib.mjs';
const { base } = CHAINS.changomas;
const regions = await (await vtexFetch(`${base}/api/checkout/pub/regions?country=ARG&postalCode=4000`)).json();
const url = `${base}/api/io/_v/api/intelligent-search/product_search/?query=yogurisimo&count=5&regionId=${encodeURIComponent(regions[0].id)}&locale=es-AR`;
const res = await vtexFetch(url);
const j = await res.json();
console.log('status', res.status, 'total', j.recordsFiltered);
for (const p of (j.products || []).slice(0, 5)) {
  const s = p.items[0].sellers[0].commertialOffer;
  console.log(p.productName, '| Price', s.Price, 'List', s.ListPrice, '| teasers', JSON.stringify(s.teasers || s.Teasers || []).slice(0, 200), '| discountHL', JSON.stringify(s.discountHighlights || []).slice(0, 150), '| specHL', JSON.stringify(p.clusterHighlights || []).slice(0, 120));
}
