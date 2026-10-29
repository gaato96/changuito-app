import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareList, costFor, promoSuggestion, type Price } from './pricing.ts';

const NOW = new Date('2026-10-29T15:00:00Z');
const p = (productId: number, chainId: number, price: number, extra: Partial<Price> = {}): Price => ({
  productId, chainId, price, listPrice: price, unitPrice: null, unitLabel: null, soldByWeight: false,
  promoKind: 'none', promoMinQty: null, promoValue: null, promoText: null, loyalty: null,
  capturedAt: '2026-10-29T12:00:00Z', ...extra,
});

test('costo con promos', () => {
  assert.equal(costFor(3, p(1, 1, 1000, { promoKind: 'nth_pct', promoMinQty: 2, promoValue: 70 })), 2300);
  assert.equal(costFor(4, p(1, 1, 1000, { promoKind: 'nxm', promoMinQty: 3, promoValue: 2 })), 3000);
  assert.equal(costFor(2, p(1, 1, 1000, { promoKind: 'qty_price', promoMinQty: 2, promoValue: 800 })), 1600);
  assert.equal(costFor(1.5, p(1, 1, 12000, { soldByWeight: true })), 18000);
  assert.equal(costFor(2, p(1, 1, 750, { listPrice: 1000, promoKind: 'pct', promoValue: 25 })), 1500);
});

test('sugerencia de promo', () => {
  const s = promoSuggestion(1, p(1, 1, 1000, { promoKind: 'nth_pct', promoMinQty: 2, promoValue: 70, promoText: '2da al 70%' }));
  assert.deepEqual(s, { productId: 1, chainId: 1, fromQty: 1, toQty: 2, total: 1300, each: 650, saving: 700, text: '2da al 70%' });
  assert.equal(promoSuggestion(2, p(1, 1, 1000, { promoKind: 'nth_pct', promoMinQty: 2, promoValue: 70 })), null);
  assert.equal(promoSuggestion(1, p(1, 1, 1000)), null);
});

test('ranking: primero cobertura, después total; ahorro sobre productos en común', () => {
  const list = [{ productId: 1, qty: 1 }, { productId: 2, qty: 2 }, { productId: 3, qty: 1 }];
  const prices = [
    p(1, 1, 100), p(2, 1, 200), p(3, 1, 300),          // super 1: tiene todo, total 800
    p(1, 2, 90), p(2, 2, 150),                          // super 2: más barato pero le falta el 3
    p(1, 3, 120), p(2, 3, 210), p(3, 3, 310),          // super 3: tiene todo, total 850
  ];
  const r = compareList(list, prices, [1, 2, 3], NOW);
  assert.deepEqual(r.singles.map(s => [s.chainId, s.coverage, s.total]), [[1, 3, 800], [3, 3, 850], [2, 2, 390]]);
  const vs2 = r.singles[0].vs.find(v => v.chainId === 2)!;
  assert.deepEqual(vs2, { chainId: 2, saving: -110, common: 2 });   // contra el 2, el 1 es más caro en lo común
  assert.deepEqual(r.singles[0].vs.find(v => v.chainId === 3), { chainId: 3, saving: 50, common: 3 });
  // Mejor par: 1 + 2 (el 3 en el super 1, lo demás en el 2): 90 + 300 + 300 = 690
  assert.deepEqual(r.bestPair!.chains, [1, 2]);
  assert.equal(r.bestPair!.total, 690);
  assert.equal(r.bestPair!.savingVsBestSingle, 110);
  assert.equal(r.bestPair!.worthIt, true);   // 110 / 800 = 13,75% ≥ 3%
  assert.equal(r.bestPair!.assignment.get(3), 1);
});

test('precios de más de 72 h no cuentan', () => {
  const r = compareList([{ productId: 1, qty: 1 }], [p(1, 1, 100, { capturedAt: '2026-10-25T00:00:00Z' }), p(1, 2, 120)], [1, 2], NOW);
  assert.equal(r.singles[0].chainId, 2);
  assert.deepEqual(r.stale, [1]);
});

test('no vale la pena dividir con ahorro chico', () => {
  const list = [{ productId: 1, qty: 1 }, { productId: 2, qty: 1 }];
  const prices = [p(1, 1, 50000), p(2, 1, 50000), p(1, 2, 50100), p(2, 2, 49900)];
  const r = compareList(list, prices, [1, 2], NOW);
  assert.equal(r.bestPair!.savingVsBestSingle, 100);
  assert.equal(r.bestPair!.worthIt, false);
});
