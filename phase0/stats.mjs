// Fase 0: estadísticas de calidad de datos de una categoría cruda
import { readFileSync } from 'node:fs';
const [file] = process.argv.slice(2);
const data = JSON.parse(readFileSync(file, 'utf8'));
const off = p => p.items[0].sellers[0].commertialOffer;
const avail = data.filter(p => off(p).IsAvailable && off(p).Price > 0);
const ean = e => (e || '').replace(/\D/g, '');
const validEan = e => /^\d{8}$|^\d{12,14}$/.test(ean(e));
const internal = avail.filter(p => ean(p.items[0].ean).padStart(13, '0').startsWith('2'));
const discounted = avail.filter(p => off(p).Price < off(p).PriceWithoutDiscount);
const withTeaser = avail.filter(p => (off(p).Teasers || []).length);
const withHL = avail.filter(p => (off(p).DiscountHighLight || []).length);
const hasPPU = avail.filter(p => p.pricePerUnit || p['Precio x unidad'] || p['Gramaje factor de conversión']);
const multiItems = data.filter(p => p.items.length > 1);
const clusters = new Map();
for (const p of avail) for (const v of Object.values(p.clusterHighlights || {})) clusters.set(v, (clusters.get(v) || 0) + 1);
console.log(`${file}: total=${data.length} disponibles=${avail.length} (${Math.round(avail.length / data.length * 100)}%)`);
console.log(`  EAN válido=${avail.filter(p => validEan(p.items[0].ean)).length} internos(2xx)=${internal.length} sin EAN=${avail.filter(p => !ean(p.items[0].ean)).length}`);
console.log(`  multi-SKU=${multiItems.length} con Price<Lista=${discounted.length} conTeasers=${withTeaser.length} conHighlight=${withHL.length} conPrecioUnidad=${hasPPU.length}`);
console.log(`  measurementUnit: ${JSON.stringify(Object.fromEntries([...avail.reduce((m, p) => m.set(p.items[0].measurementUnit + '×' + p.items[0].unitMultiplier, (m.get(p.items[0].measurementUnit + '×' + p.items[0].unitMultiplier) || 0) + 1), new Map())].sort((a,b)=>b[1]-a[1]).slice(0, 8)))}`);
console.log(`  clusterHighlights top: ${[...clusters].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} (${n})`).join(' | ')}`);
for (const p of [...withHL.slice(0, 3), ...discounted.filter(p => !(off(p).DiscountHighLight || []).length).slice(0, 3)]) {
  const o = off(p);
  console.log(`  ej: ${p.productName} | Price=${o.Price} List=${o.ListPrice} PWD=${o.PriceWithoutDiscount} | HL=${(o.DiscountHighLight || []).map(t => t['<Name>k__BackingField']).join(';')} | ppu=${JSON.stringify(p.pricePerUnit || p['Precio x unidad'] || null)} gram=${JSON.stringify([p['Gramaje factor de conversión'], p['Gramaje de unidad de medida']])}`);
}
