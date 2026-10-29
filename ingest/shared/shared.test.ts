import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ean13, norm } from './text.ts';
import { parseSizeFromName, reconcileSize, sizeFromReference, unitPrice } from './units.ts';
import { classifyFromTotals, costFor, parseSepaPromo } from './promos.ts';
import { makeCategoryResolver, makeKeywordClassifier, loadCategoryConfig, topLevelPaths } from './categories.ts';

test('norm y ean13', () => {
  assert.equal(norm('  Leche  ENTERA Serenísima '), 'leche entera serenisima');
  assert.equal(ean13('7790742363107'), '7790742363107');
  assert.equal(ean13('77907423'), '0000077907423');
  assert.equal(ean13('07790742363107'), '7790742363107');
  assert.equal(ean13('999923422'), null);
  assert.equal(ean13(''), null);
});

test('talle desde el nombre (casos reales de la Fase 0)', () => {
  assert.deepEqual(parseSizeFromName('Aceite De Girasol Cañuelas 1.5 L'), { value: 1500, unit: 'ml' });
  assert.deepEqual(parseSizeFromName('Aceite Legitimo Girasol 1,5lt'), { value: 1500, unit: 'ml' });
  assert.deepEqual(parseSizeFromName('Yerba Rosamonte 500gr'), { value: 500, unit: 'g' });
  assert.deepEqual(parseSizeFromName('Aceite de girasol Cañuelas 900 cc'), { value: 900, unit: 'ml' });
  assert.deepEqual(parseSizeFromName('Yerba Amanda 1kg'), { value: 1000, unit: 'g' });
  assert.deepEqual(parseSizeFromName('Yogur La Serenisima Firme Entero Vainilla x 4un (480gr)'), { value: 480, unit: 'g' });
  assert.deepEqual(parseSizeFromName('Salchichas Paladini 6 U 225 G'), { value: 225, unit: 'g' });
  assert.deepEqual(parseSizeFromName('Gaseosa Coca-Cola 6 x 500 ml'), { value: 3000, unit: 'ml' });
  assert.deepEqual(parseSizeFromName('Huevos blancos x 12 u'), { value: 12, unit: 'u' });
  assert.equal(parseSizeFromName('Queso Cremoso Ricrem'), null);
});

test('Carrefour "15 l" se corrige a 1,5 L con pricePerUnit', () => {
  const s = parseSizeFromName('Aceite de girasol Natura 15 l');
  assert.deepEqual(s, { value: 15000, unit: 'ml' });
  assert.deepEqual(reconcileSize(s, 6990, 4660), { value: 1500, unit: 'ml' });
  assert.deepEqual(reconcileSize({ value: 1500, unit: 'ml' }, 6990, 4660), { value: 1500, unit: 'ml' });
});

test('talle desde la referencia de SEPA', () => {
  assert.deepEqual(sizeFromReference(3799.99, 39175.15, 1, 'KG'), { value: 97, unit: 'g' });
  assert.deepEqual(sizeFromReference(890, 1711.54, 1, 'KG'), { value: 520, unit: 'g' });
  assert.equal(sizeFromReference(890, 0, 1, 'KG'), null);
});

test('precio por unidad', () => {
  assert.deepEqual(unitPrice(3249, { value: 1500, unit: 'ml' }), { unitPrice: 2166, label: 'l' });
  assert.deepEqual(unitPrice(4890, { value: 1000, unit: 'g' }), { unitPrice: 4890, label: 'kg' });
});

test('promos desde la simulación de carrito', () => {
  // 2do al 50% (Ilolay en Carrefour): t2 = 2649·2 − 1324,5
  assert.deepEqual(classifyFromTotals(2649, 3973.5, 6622.5).promo, { kind: 'nth_pct', minQty: 2, value: 50, text: '2da al 50%' });
  // 2x1 (Tutti en ChangoMás)
  assert.equal(classifyFromTotals(969, 969, 1938).promo.kind, 'nxm');
  // 3x2
  assert.deepEqual(classifyFromTotals(1000, 2000, 2000).promo, { kind: 'nxm', minQty: 3, value: 2, text: '3x2' });
  // 25% directo (Comodín)
  const d = classifyFromTotals(3161.59, 4742.38, 7113.57);
  assert.equal(d.promo.kind, 'pct');
  assert.equal(d.promo.value, 25);
  assert.equal(d.unitPrice, 2371.19);
  // sin promo
  assert.equal(classifyFromTotals(1500, 3000, 4500).promo.kind, 'none');
});

test('promos de SEPA', () => {
  const a = parseSepaPromo('25% de descuento con cualquier medio de pago - Vigencia: Desde el 21/10/2026 Hasta el 01/11/2026 - Stock: Hasta agotar stock.', 1000, 750);
  assert.deepEqual(a, { unitPrice: 750, promo: { kind: 'pct', minQty: null, value: 25, text: '25% de descuento con cualquier medio de pago' } });
  const b = parseSepaPromo('Llevando 2 unidades - Vigencia: Desde el 21/10/2026', 1000, 800);
  assert.deepEqual(b.promo, { kind: 'qty_price', minQty: 2, value: 800, text: 'Llevando 2 unidades' });
  assert.equal(parseSepaPromo('Promo A valida desde el 23/10/2026 hasta 29/10/2026', 1000, 900).promo.kind, 'text');
  assert.equal(parseSepaPromo('', 1000, null).promo.kind, 'none');
});

test('costo con promo', () => {
  assert.equal(costFor(3, 1000, 1000, { kind: 'nth_pct', minQty: 2, value: 70, text: null }), 2300);
  assert.equal(costFor(4, 1000, 1000, { kind: 'nxm', minQty: 3, value: 2, text: null }), 3000);
  assert.equal(costFor(1, 1000, 1000, { kind: 'qty_price', minQty: 2, value: 800, text: null }), 1000);
  assert.equal(costFor(2, 1000, 1000, { kind: 'qty_price', minQty: 2, value: 800, text: null }), 1600);
});

test('categorías', () => {
  const cfg = loadCategoryConfig();
  const cm = makeCategoryResolver(cfg.map.changomas);
  assert.equal(cm('/Frescos/Fiambres y Embutidos/Jamones/'), 'fiambreria');
  assert.equal(cm('/Frescos/Quesos/'), 'lacteos');
  assert.equal(cm('/Desayunos y Meriendas/Yerbas/'), 'almacen');
  assert.equal(cm('/Electro y Tecno/'), null);
  assert.equal(makeCategoryResolver(cfg.map.carrefour)('/Lacteos y productos frescos/Fiambres/'), 'fiambreria');
  assert.ok(topLevelPaths(cfg.map.comodin).includes('/Frescos/'));
  const kw = makeKeywordClassifier(cfg.keywords);
  assert.equal(kw('TAPA DE NALGA NOVILLITO BJA-1-Kg'), 'carnes');
  assert.equal(kw('Jamon cocido paladini sob. x kg. feteado'), 'fiambreria');
  assert.equal(kw('PURE DE TOMATE, VIGENTE, 520 gr'), 'almacen');
});

test('lotes de simulación por marca', async () => {
  const { isolatedBatches, brandKey } = await import('../vtex/client.ts');
  const items = [
    ...Array.from({ length: 10 }, (_, i) => ({ sku: `c${i}`, brand: 'Carrefour' })),
    ...Array.from({ length: 4 }, (_, i) => ({ sku: `s${i}`, brand: 'La Serenísima' })),
    ...Array.from({ length: 3 }, (_, i) => ({ sku: `g${i}`, brand: 'Genérico' })),
  ];
  const strict = isolatedBatches(items, 100, 1);
  assert.equal(strict.length, 10);
  for (const b of strict) assert.equal(new Set(b.map(i => brandKey(i.brand, i.sku))).size, b.length);
  const loose = isolatedBatches(items, 100, 5);
  assert.equal(loose.length, 2);
  assert.equal(loose.flat().length, items.length);
  assert.equal(brandKey('Genérico', 'x'), '__x');
});

test('talles de SEPA (Cencosud y La Anónima)', async () => {
  const { parseSepaSize } = await import('./units.ts');
  assert.deepEqual(parseSepaSize('gin LARIOS 700cc BOT-75-cc.', null), { value: 700, unit: 'ml' });
  assert.deepEqual(parseSepaSize('vino CRUX Malbec BOT-75-ml.', null), { value: 750, unit: 'ml' });
  assert.deepEqual(parseSepaSize('Puré de tomate VIGENTE BRK-520-gr.', null), { value: 520, unit: 'g' });
  assert.deepEqual(parseSepaSize('Aceite NATURA de girasol PVC-1.5-lt.', null), { value: 1500, unit: 'ml' });
  assert.deepEqual(parseSepaSize('ACEITE MEZCLA GIRASOL- OLIVA, NATURA, 1500 cm3', null), { value: 1500, unit: 'ml' });
  assert.deepEqual(parseSepaSize('TOALLA HIG. NOCTURNA C/ALAS, LINA, 8 cu', null), { value: 8, unit: 'u' });
  assert.equal(sizeFromReference(13790, 17237500, 100, 'ml.'), null);
});

test('talles de SEPA con litros escritos como cc', async () => {
  const { parseSepaSize } = await import('./units.ts');
  assert.deepEqual(parseSepaSize('beb.hierb.TERMA Serrano CERO 1.35cc BOT-1350-ml.', null), { value: 1350, unit: 'ml' });
  assert.deepEqual(parseSepaSize('Poett Desinf. Flores de Primavera 1.8ml BOT-1800-ml.', null), { value: 1800, unit: 'ml' });
  assert.equal(unitPrice(3240, { value: 1, unit: 'g' }), null);
});
