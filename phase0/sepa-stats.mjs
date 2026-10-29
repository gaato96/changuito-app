// Fase 0: sobre el CSV filtrado de Tucumán, mide (1) si las sucursales de una bandera tienen precios idénticos
// y (2) la cobertura de frescos por bandera.
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
const head = parseLine(lines[0]);
function parseLine(l) { // CSV simple con comillas
  const out = []; let cur = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur); return out;
}
const rows = lines.slice(1).map(l => Object.fromEntries(parseLine(l).map((v, i) => [head[i], v])));
const byBandera = {};
for (const r of rows) ((byBandera[r.bandera] ??= {})[r.id_sucursal] ??= new Map()).set(r.id_producto, r);

console.log('== Igualdad de precios entre sucursales (sobre productos en común)');
for (const [b, sucs] of Object.entries(byBandera)) {
  const ids = Object.keys(sucs);
  if (ids.length < 2) continue;
  const ref = ids.sort((a, c) => sucs[c].size - sucs[a].size)[0];
  for (const id of ids.filter(x => x !== ref)) {
    let common = 0, same = 0;
    for (const [pid, r] of sucs[id]) { const o = sucs[ref].get(pid); if (!o) continue; common++; if (o.productos_precio_lista === r.productos_precio_lista) same++; }
    console.log(`  ${b} #${id} vs #${ref}: ${common} en común, ${Math.round(same / common * 100)}% mismo precio`);
  }
}

const FRESH = {
  'tomate': /\btomate\b(?!.*(pure|puré|salsa|triturado|perita en lata|lata|seco|ketchup|extracto|cherry en))/i,
  'banana': /\bbanana\b(?!.*(chips|yogur|licuado))/i, 'papa': /^papa\b|\bpapa (negra|blanca|x kg)/i,
  'cebolla': /^cebolla\b/i, 'lechuga': /^lechuga\b/i, 'manzana': /^manzana\b/i, 'naranja': /^naranja\b/i,
  'zanahoria': /^zanahoria\b/i, 'zapallo': /^zapallo\b/i, 'limón': /^lim[oó]n\b/i,
  'nalga': /\bnalga\b/i, 'carne picada': /carne picada/i, 'asado': /\basado\b/i, 'vacío': /\bvac[ií]o\b(?!.*envas)/i,
  'milanesa': /milanesa/i, 'pollo entero': /pollo entero/i, 'pechuga': /pechuga/i,
  'jamón cocido': /jam[oó]n cocido/i, 'queso cremoso': /queso cremoso/i, 'salame': /salame/i, 'pan francés': /pan franc[eé]s/i,
  'huevos': /^huevo/i,
};
const KG = r => /kg|kilo/i.test(r.productos_unidad_medida_presentacion) || /x ?kg|por kg/i.test(r.productos_descripcion);
console.log('\n== Cobertura de frescos (cantidad de productos que matchean; entre paréntesis, vendidos por kg)');
const bands = Object.keys(byBandera);
console.log('genérico'.padEnd(15) + bands.map(b => b.slice(0, 12).padStart(14)).join(''));
for (const [g, re] of Object.entries(FRESH)) {
  console.log(g.padEnd(15) + bands.map(b => {
    const best = Object.values(byBandera[b]).sort((x, y) => y.size - x.size)[0];
    const m = [...best.values()].filter(r => re.test(r.productos_descripcion));
    return `${m.length}(${m.filter(KG).length})`.padStart(14);
  }).join(''));
}
const show = (b, re) => { const best = Object.values(byBandera[b]).sort((x, y) => y.size - x.size)[0]; return [...best.values()].filter(r => re.test(r.productos_descripcion)).slice(0, 4).map(r => `${r.productos_descripcion} [${r.productos_cantidad_presentacion} ${r.productos_unidad_medida_presentacion}] $${r.productos_precio_lista} ean=${r.productos_ean}`); };
for (const b of ['Vea', 'Jumbo', 'La Anonima']) { console.log(`\nEjemplos ${b}:`); for (const g of ['tomate', 'nalga', 'jamón cocido', 'banana']) console.log(`  ${g}:`, show(b, FRESH[g]).join(' || ')); }
const promos = rows.filter(r => r.productos_leyenda_promo1).reduce((m, r) => m.set(r.productos_leyenda_promo1, (m.get(r.productos_leyenda_promo1) || 0) + 1), new Map());
console.log('\nLeyendas de promo más comunes:', [...promos].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${k} (${n})`).join(' | '));
