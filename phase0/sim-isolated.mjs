// Fase 0: compara la simulación en lotes "aislados" (una marca y una categoría por lote) contra simulación
// individual (verdad), para ver si así se evitan las promos combinables entre productos.
import { CHAINS, vtexFetch } from './lib.mjs';
import { readFileSync } from 'node:fs';
const [slug, file, sample = 40] = process.argv.slice(2);
const { base } = CHAINS[slug];
const off = p => p.items[0].sellers[0].commertialOffer;
const data = JSON.parse(readFileSync(file, 'utf8')).filter(p => off(p).IsAvailable && off(p).Price > 0);
// arma lotes donde no se repite marca ni categoría hoja
const batches = [];
for (const p of data) {
  let b = batches.find(b => b.length < 100 && !b.some(x => x.brandId === p.brandId || x.categoryId === p.categoryId));
  if (!b) batches.push(b = []);
  b.push(p);
}
const sim = async (items, qty) => {
  const r = await vtexFetch(`${base}/api/checkout/pub/orderForms/simulation?sc=1`, { method: 'POST', body: { items: items.map(p => ({ id: p.items[0].itemId, quantity: qty, seller: '1' })), country: 'ARG', postalCode: '4000' } });
  const s = await r.json();
  return new Map((s.items || []).map(it => [it.id, (it.priceDefinition?.total ?? it.sellingPrice * qty) / 100]));
};
const batched = { 1: new Map(), 2: new Map() };
for (const b of batches) for (const q of [1, 2]) for (const [k, v] of await sim(b, q)) batched[q].set(k, v);
console.log(`${slug}: ${data.length} ítems en ${batches.length} lotes aislados`);
// verdad: simulación individual de una muestra (preferimos ítems con promo detectada en lote)
const promoFirst = [...data].sort((a, b) => {
  const pa = batched[2].get(a.items[0].itemId) < 2 * batched[1].get(a.items[0].itemId) - 0.5;
  const pb = batched[2].get(b.items[0].itemId) < 2 * batched[1].get(b.items[0].itemId) - 0.5;
  return pb - pa;
});
const pick = [...promoFirst.slice(0, sample / 2), ...data.filter((_, i) => i % 23 === 0).slice(0, sample / 2)];
let ok = 0, bad = 0;
for (const p of pick) {
  const id = p.items[0].itemId;
  const [t1, t2] = [(await sim([p], 1)).get(id), (await sim([p], 2)).get(id)];
  const match = Math.abs(t1 - batched[1].get(id)) < 1 && Math.abs(t2 - batched[2].get(id)) < 1;
  match ? ok++ : bad++;
  if (!match) console.log('  DIF', p.productName.slice(0, 50), 'individual', t1, t2, 'lote', batched[1].get(id), batched[2].get(id));
}
console.log(`  muestra ${pick.length}: ${ok} coinciden, ${bad} difieren`);
