// Fase 0: volumen de productos, solapamiento de EAN entre cadenas y comparación web vs SEPA
import { readFileSync, existsSync } from 'node:fs';
const SEPA = process.argv[2];
const ean13 = e => { const d = (e || '').replace(/\D/g, ''); return d.length >= 8 && d.length <= 14 ? d.padStart(13, '0') : null; };
const web = {};
for (const slug of ['carrefour', 'changomas', 'comodin']) {
  const f = `out/all-${slug}.json`;
  if (!existsSync(f)) { console.log('falta', f); continue; }
  const rows = JSON.parse(readFileSync(f, 'utf8'));
  const av = rows.filter(r => r.avail);
  web[slug] = new Map(av.filter(r => ean13(r.ean)).map(r => [ean13(r.ean), r]));
  const internal = av.filter(r => (ean13(r.ean) || '').startsWith('2')).length;
  console.log(`${slug}: ${rows.length} en catálogo, ${av.length} disponibles en Tucumán, ${internal} con EAN interno (2…), ${av.filter(r => r.mu === 'kg').length} pesables`);
}
// SEPA
const lines = readFileSync(SEPA, 'utf8').split(/\r?\n/).filter(Boolean);
const head = lines[0].split(',');
const idx = Object.fromEntries(head.map((h, i) => [h, i]));
const sepa = {};
for (const l of lines.slice(1)) {
  const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, '').replace(/^"|"$/g, ''));
  const key = `${c[idx.bandera]}#${c[idx.id_sucursal]}`;
  if (c[idx.productos_ean] !== '1') continue;
  (sepa[key] ??= new Map()).set(ean13(c[idx.id_producto]), { price: Number(c[idx.productos_precio_lista]), desc: c[idx.productos_descripcion], promo: c[idx.productos_precio_unitario_promo1] });
}
// Canónicos: unión de EAN universales (no internos) de web + una sucursal por bandera SEPA
const pick = ['Vea#70', 'Jumbo#5227', 'La Anonima#382'];
const all = new Set();
for (const m of Object.values(web)) for (const e of m.keys()) if (!e.startsWith('2')) all.add(e);
for (const k of pick) for (const e of sepa[k]?.keys() || []) if (e && !e.startsWith('2')) all.add(e);
console.log(`\nProductos canónicos (EAN universales, 6 cadenas): ${all.size}`);
const counts = {};
for (const e of all) { let n = 0; for (const m of Object.values(web)) if (m.has(e)) n++; for (const k of pick) if (sepa[k]?.has(e)) n++; counts[n] = (counts[n] || 0) + 1; }
console.log('  presentes en N cadenas:', JSON.stringify(counts));
const rowsPrecios = Object.values(web).reduce((a, m) => a + m.size, 0) + Object.entries(sepa).filter(([k]) => /^(Vea|Jumbo|La Anonima)#/.test(k)).reduce((a, [, m]) => a + m.size, 0);
console.log(`  filas de precios actuales (todas las sucursales SEPA de Vea/Jumbo/LA): ${rowsPrecios}`);
const rowsZona = Object.values(web).reduce((a, m) => a + m.size, 0) + pick.reduce((a, k) => a + (sepa[k]?.size || 0), 0);
console.log(`  filas de precios actuales agrupando por zona (1 por cadena): ~${rowsZona}`);
// Web vs SEPA de la misma cadena
const cmp = (slug, key) => {
  const w = web[slug], s = sepa[key]; if (!w || !s) return;
  let n = 0, same = 0, within2 = 0; const ex = [];
  for (const [e, r] of w) { const x = s.get(e); if (!x) continue; n++; const ref = r.list || r.price; if (Math.abs(ref - x.price) < 1) same++; else if (Math.abs(ref - x.price) / x.price < 0.02) within2++; else if (ex.length < 5) ex.push(`${r.name} web=${ref} sepa=${x.price}`); }
  console.log(`\n${slug} web vs SEPA ${key}: ${n} EAN en común, ${Math.round(same / n * 100)}% igual, ${Math.round(within2 / n * 100)}% dentro de 2%`);
  ex.forEach(x => console.log('   ', x));
};
cmp('carrefour', 'Hipermercado Carrefour#46'); cmp('carrefour', 'Market#176');
cmp('changomas', 'HiperChangomas#1020'); cmp('changomas', 'Changomas#1033');
