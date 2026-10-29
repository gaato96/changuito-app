// Fase 0: ¿el precio del catálogo cambia con la región? Compara sin cookie, CP 1000 (CABA) y CP 4000 (Tucumán),
// y contra la simulación de carrito con CP 4000.
const UA = 'Changuito/0.1 (fase0; uso personal no comercial)';
const chains = {
  carrefour: 'https://www.carrefour.com.ar',
  changomas: 'https://www.masonline.com.ar',
  comodin: 'https://www.comodinencasa.com.ar',
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async (url, cookie) => {
  await sleep(1000);
  const r = await fetch(url, { headers: { 'user-agent': UA, ...(cookie ? { cookie } : {}) } });
  return r.json();
};
const segFor = async (base, cp) => {
  const regions = await get(`${base}/api/checkout/pub/regions?country=ARG&postalCode=${cp}`);
  if (!regions[0]) return null;
  return 'vtex_segment=' + Buffer.from(JSON.stringify({ regionId: regions[0].id, channel: '1' })).toString('base64');
};
const term = process.argv[2] || 'yerba';
for (const [slug, base] of Object.entries(chains)) {
  const segTuc = await segFor(base, '4000');
  const segCaba = await segFor(base, '1425');
  const q = `${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=5`;
  const [none, caba, tuc] = [await get(q), segCaba ? await get(q, segCaba) : [], await get(q, segTuc)];
  const priceOf = (arr, id) => arr.find(p => p.productId === id)?.items[0]?.sellers[0]?.commertialOffer?.Price;
  console.log(`\n=== ${slug} (CABA region ${segCaba ? 'ok' : 'none'})`);
  for (const p of tuc) {
    const it = p.items[0];
    const seller = it.sellers[0].sellerId;
    // simulación de carrito con CP 4000
    await sleep(1000);
    const sim = await (await fetch(`${base}/api/checkout/pub/orderForms/simulation?sc=1`, {
      method: 'POST',
      headers: { 'user-agent': UA, 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ id: it.itemId, quantity: 1, seller }], country: 'ARG', postalCode: '4000' }),
    })).json();
    const si = sim.items?.[0];
    console.log(`${p.productName.padEnd(45).slice(0, 45)} none=${priceOf(none, p.productId)} caba=${priceOf(caba, p.productId)} tuc=${it.sellers[0].commertialOffer.Price} | sim4000=${si ? si.sellingPrice / 100 : 'n/a'} simSeller=${si?.seller} avail=${si?.availability}`);
  }
}
