// Fase 0: muestra estructura y campos útiles de un archivo crudo
import { readFileSync } from 'node:fs';
const [file] = process.argv.slice(2);
const data = JSON.parse(readFileSync(file, 'utf8'));
const p = data.find(x => x.items[0].sellers[0].commertialOffer.Price > 0);
console.log('product keys:', Object.keys(p).join(', '));
console.log('item keys:', Object.keys(p.items[0]).join(', '));
console.log('offer keys:', Object.keys(p.items[0].sellers[0].commertialOffer).join(', '));
const extra = Object.keys(p).filter(k => !['items','description','metaTagDescription','link','linkText','categories','categoriesIds','clusterHighlights','productClusters','searchableClusters','skuSpecifications','allSpecifications','allSpecificationsGroups','specificationGroups','properties','releaseDate','origin','brandImageUrl','productTitle','productReference','productReferenceCode','productId','productName','brand','brandId','categoryId'].includes(k));
console.log('extra product fields sample:', JSON.stringify(Object.fromEntries(extra.map(k => [k, p[k]]))).slice(0, 1500));
console.log('item measurementUnit/unitMultiplier:', p.items[0].measurementUnit, p.items[0].unitMultiplier);
// teasers
const teasers = new Map();
for (const x of data) {
  const o = x.items[0].sellers[0].commertialOffer;
  for (const k of ['Teasers', 'PromotionTeasers', 'DiscountHighLight']) {
    for (const t of o[k] || []) {
      const name = t['<Name>k__BackingField'] ?? t.Name ?? t.name ?? JSON.stringify(t).slice(0, 80);
      teasers.set(`${k}: ${name}`, (teasers.get(`${k}: ${name}`) || 0) + 1);
    }
  }
}
console.log('\nTeasers (top 40):');
[...teasers].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, n]) => console.log(String(n).padStart(5), k));
