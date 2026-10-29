// Fase 0: simula toda una categoría en lotes (cantidades 1, 2 y 3) y compara contra el catálogo.
// Mide: diferencias catálogo vs simulación y promos detectadas por cantidad.
import { CHAINS, vtexFetch } from './lib.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [slug, file, batchSize = 100] = process.argv.slice(2);
const { base } = CHAINS[slug];
const off = p => p.items[0].sellers[0].commertialOffer;
const data = JSON.parse(readFileSync(file, 'utf8')).filter(p => off(p).IsAvailable && off(p).Price > 0);
const started = Date.now();
let requests = 0;
async function simulate(items, qty) {
  const out = new Map();
  for (let i = 0; i < items.length; i += Number(batchSize)) {
    const chunk = items.slice(i, i + Number(batchSize));
    const res = await vtexFetch(`${base}/api/checkout/pub/orderForms/simulation?sc=1`, {
      method: 'POST',
      body: { items: chunk.map(p => ({ id: p.items[0].itemId, quantity: qty, seller: '1' })), country: 'ARG', postalCode: '4000' },
    });
    requests++;
    const s = await res.json();
    if (!s.items) { console.log('error lote', res.status, JSON.stringify(s).slice(0, 200)); continue; }
    for (const it of s.items) out.set(it.id, it);
  }
  return out;
}
const [s1, s2, s3] = [await simulate(data, 1), await simulate(data, 2), await simulate(data, 3)];
const rows = [];
let diff = 0, unavailable = 0;
const kinds = {};
for (const p of data) {
  const id = p.items[0].itemId;
  const a = s1.get(id), b = s2.get(id), c = s3.get(id);
  if (!a || a.availability !== 'available' || !a.price) { unavailable++; continue; }
  const isKg = a.measurementUnit === 'kg';
  const unit = a.price / 100;                               // precio de lista (por kg si es pesable)
  const total = (x, q) => (x.priceDefinition?.total ?? x.sellingPrice * q) / 100;
  const t1 = total(a, 1), t2 = total(b, 2), t3 = total(c, 3);
  const cat = off(p).Price;
  const catVsSim = Math.abs(cat - (isKg ? a.sellingPrice / 100 / a.unitMultiplier : t1)) > 0.5;
  if (catVsSim) diff++;
  const one = isKg ? a.sellingPrice / 100 / a.unitMultiplier : t1;
  let kind = 'none';
  if (one < unit - 0.5) kind = `pct ${Math.round((1 - one / unit) * 100)}%`;
  else if (t2 < 2 * t1 - 0.5) kind = `nth 2do al ${Math.round((2 * t1 - t2) / t1 * 100)}%`;
  else if (t3 < 3 * t1 - 0.5) kind = Math.abs(t3 - 2 * t1) < 1 ? 'nxm 3x2' : `nth 3ro al ${Math.round((3 * t1 - t3) / t1 * 100)}%`;
  const k = kind.replace(/\d+%/, 'N%');
  kinds[kind] = (kinds[kind] || 0) + 1;
  rows.push({ name: p.productName, ean: p.items[0].ean, cat, unit, t1, t2, t3, kind, isKg });
}
writeFileSync(`out/sim-${slug}.json`, JSON.stringify(rows));
console.log(`${slug}: ${data.length} disponibles en catálogo, ${unavailable} no disponibles al simular, ${diff} con precio de catálogo distinto (${Math.round(diff / rows.length * 100)}%), ${requests} pedidos, ${Math.round((Date.now() - started) / 1000)} s`);
console.log('  promos:', Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join(' | '));
