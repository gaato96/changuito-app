// Fase 0: investiga diferencias entre catálogo y simulación para productos puntuales
import { CHAINS, vtexFetch, regionCookie } from './lib.mjs';
const [slug, ...terms] = process.argv.slice(2);
const { base } = CHAINS[slug];
const cookie = await regionCookie(base);
for (const term of terms) {
  const q = `${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=0`;
  const withC = (await (await vtexFetch(q, { cookie })).json())[0];
  const noC = (await (await vtexFetch(q)).json())[0];
  if (!withC) { console.log('sin resultado', term); continue; }
  const it = withC.items[0];
  const sim = async (extra = {}, ck) => {
    const r = await vtexFetch(`${base}/api/checkout/pub/orderForms/simulation?sc=1`, { method: 'POST', cookie: ck, body: { items: [{ id: it.itemId, quantity: 1, seller: '1' }], country: 'ARG', postalCode: '4000', ...extra } });
    const s = await r.json(); const x = s.items?.[0];
    return x ? `${x.price / 100}/${x.sellingPrice / 100} ${x.availability}` : 'n/a';
  };
  const o = withC.items[0].sellers[0].commertialOffer;
  console.log(`${withC.productName} | cat+cookie=${o.Price} (list ${o.ListPrice}, avail ${o.IsAvailable}) | cat sin cookie=${noC?.items[0].sellers[0].commertialOffer.Price}`);
  console.log(`    sim cp4000=${await sim()} | sim cp4000+cookie=${await sim({}, cookie)} | sim sin cp=${await sim({ postalCode: undefined, country: undefined })}`);
}
