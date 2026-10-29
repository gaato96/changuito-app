import { test } from 'node:test';
import assert from 'node:assert/strict';
import { factorFor, loadGenerics, matches } from './suggest.ts';
import { norm } from '../shared/text.ts';

const g = (slug: string) => loadGenerics().find(x => x.slug === slug)!;

test('el catálogo de frescos carga bien', () => {
  const all = loadGenerics();
  assert.ok(all.length >= 150, `hay ${all.length} genéricos`);
  assert.equal(new Set(all.map(x => x.slug)).size, all.length);
});

test('equivalencias de frescos', () => {
  assert.ok(matches(g('nalga'), norm('Nalga feteada x kg')));
  assert.ok(!matches(g('nalga'), norm('Milanesa de nalga x kg')));
  assert.ok(!matches(g('nalga'), norm('TAPA DE NALGA E/V, FB MEATS, 1 kgr')));
  assert.ok(matches(g('tapa-de-nalga'), norm('TAPA DE NALGA E/V, FB MEATS, 1 kgr')));
  assert.ok(matches(g('tomate-perita'), norm('Tomate perita bandeja 0,4 kg')));
  assert.ok(!matches(g('tomate-perita'), norm('tomate perita ARCOR Cubeteado')));
  assert.ok(matches(g('jamon-cocido'), norm('Jamon cocido paladini sob. x kg. feteado')));
  assert.ok(!matches(g('jamon-cocido'), norm('Jamón cocido natural Lario x kg')));
  assert.ok(matches(g('jamon-cocido-natural'), norm('Jamón cocido natural Lario x kg')));
  assert.ok(!matches(g('queso-mozzarella'), norm('Ravioles De Calabaza Y Muzzarella')));
  assert.ok(matches(g('queso-mozzarella'), norm('Queso Mozzarella La Paulina 1Kg')));
  assert.ok(matches(g('lechuga-mantecosa'), norm('Hojas lechuga mantecosa lavada')));
});

test('factor a kg', () => {
  assert.equal(factorFor(g('tomate-perita'), { kind: 'packaged', size_value: '400', size_unit: 'g', name_norm: 'tomate perita bandeja' }), 0.4);
  assert.equal(factorFor(g('nalga'), { kind: 'weighed', size_value: null, size_unit: null, name_norm: 'nalga' }), 1);
  assert.equal(factorFor(g('nalga'), { kind: 'packaged', size_value: null, size_unit: null, name_norm: 'nalga feteada' }), null);
  assert.equal(factorFor(g('huevo-blanco-12'), { kind: 'packaged', size_value: '12', size_unit: 'u', name_norm: 'huevos blancos x 12' }), 1);
});
