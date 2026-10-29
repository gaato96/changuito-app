// Fase 0: simulación de carrito en lote con cantidad 2 para detectar promos y validar precios
import { CHAINS, vtexFetch } from './lib.mjs';
import { readFileSync } from 'node:fs';
const [slug, file, n = 50] = process.argv.slice(2);
const { base } = CHAINS[slug];
const off = p => p.items[0].sellers[0].commertialOffer;
const data = JSON.parse(readFileSync(file, 'utf8')).filter(p => off(p).IsAvailable && off(p).Price > 0).slice(0, Number(n));
const res = await vtexFetch(`${base}/api/checkout/pub/orderForms/simulation?sc=1`, {
  method: 'POST',
  body: { items: data.map(p => ({ id: p.items[0].itemId, quantity: 2, seller: '1' })), country: 'ARG', postalCode: '4000' },
});
const sim = await res.json();
console.log('status', res.status, 'items', sim.items?.length, 'benefits', (sim.ratesAndBenefitsData?.teaser || []).length);
let mismatch = 0, promo = 0;
for (const it of sim.items || []) {
  const p = data.find(x => x.items[0].itemId === it.id);
  const catalog = off(p).Price;
  const unit = it.measurementUnit === 'kg' ? catalog * it.unitMultiplier : catalog;
  const tags = (it.priceTags || []).map(t => `${t.name}:${t.value / 100}`);
  const sp = it.sellingPrice / 100;
  if (Math.abs(it.price / 100 - unit) > 0.02 && Math.abs(sp - unit) > 0.02) { mismatch++; console.log('  DIF', p.productName, 'catalog', catalog, 'unit', unit, 'sim price', it.price / 100, 'selling', sp, it.measurementUnit, it.unitMultiplier); }
  if (tags.length) { promo++; if (promo <= 12) console.log('  PROMO', p.productName.slice(0, 50), '| price', it.price / 100, 'selling', sp, '| qty', it.quantity, '|', tags.join(' ; ').slice(0, 200)); }
}
console.log(`resumen: ${sim.items?.length} ítems, ${mismatch} diferencias de precio, ${promo} con priceTags`);
for (const t of (sim.ratesAndBenefitsData?.teaser || []).slice(0, 10)) console.log('  teaser:', t.name, JSON.stringify(t.effects?.parameters || []).slice(0, 150));
