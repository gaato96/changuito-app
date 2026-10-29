// Fase 0: inspecciona qué sellers devuelve cada cadena VTEX para CP 4000
const UA = 'Changuito/0.1 (fase0; uso personal no comercial)';
const chains = {
  carrefour: 'https://www.carrefour.com.ar',
  changomas: 'https://www.masonline.com.ar',
  comodin: 'https://www.comodinencasa.com.ar',
};
const term = process.argv[2] || 'aceite girasol';
for (const [slug, base] of Object.entries(chains)) {
  const regions = await (await fetch(`${base}/api/checkout/pub/regions?country=ARG&postalCode=4000`, { headers: { 'user-agent': UA } })).json();
  const regionId = regions[0].id;
  const seg = Buffer.from(JSON.stringify({ regionId, channel: '1' })).toString('base64');
  const url = `${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=4`;
  const res = await fetch(url, { headers: { 'user-agent': UA, cookie: `vtex_segment=${seg}` } });
  const data = await res.json();
  console.log(`\n=== ${slug} status=${res.status} resources=${res.headers.get('resources')} regionSellers=${regions[0].sellers.map(s => s.id + ':' + s.name).join(', ')}`);
  for (const p of data) {
    const it = p.items[0];
    console.log(`- ${p.productName} | ean=${it.ean}`);
    for (const s of it.sellers) console.log(`    seller ${s.sellerId} (${s.sellerName}) price=${s.commertialOffer.Price} list=${s.commertialOffer.PriceWithoutDiscount} avail=${s.commertialOffer.IsAvailable} default=${s.sellerDefault}`);
  }
}
