// Frescos: carga los genéricos de data/frescos.csv y propone equivalencias por cadena (PLAN.md §5.1).
// Las equivalencias quedan "sugeridas"; solo se usan las que aprueba el administrador en el panel.
//   node ingest/frescos/suggest.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Sql } from '../shared/db.ts';
import { norm } from '../shared/text.ts';

export type Generic = { slug: string; name: string; unit: 'kg' | 'unidad'; category: string; include: string[][]; exclude: string[] };

export function loadGenerics(): Generic[] {
  const lines = readFileSync(join(import.meta.dirname, '..', '..', 'data', 'frescos.csv'), 'utf8').trim().split(/\r?\n/).slice(1);
  return lines.filter(Boolean).map(l => {
    const [slug, name, unit, category, include, exclude] = l.split(';');
    return {
      slug, name, unit: unit as Generic['unit'], category,
      include: include.split('|').map(a => norm(a).split(' ').filter(Boolean)).filter(a => a.length),
      exclude: (exclude ?? '').split('|').map(e => norm(e)).filter(Boolean),
    };
  });
}

type Candidate = { id: number; name_norm: string; kind: string; size_value: string | null; size_unit: string | null; chain_id: number };

/**
 * ¿El producto corresponde al genérico? Todas las palabras de alguna alternativa, ninguna exclusión, y la primera
 * palabra tiene que estar al principio del nombre: "Ravioles de jamón y muzzarella" no es muzzarella.
 */
export function matches(g: Generic, nameNorm: string): boolean {
  const n = ` ${nameNorm} `;
  if (g.exclude.some(e => n.includes(e))) return false;
  const head = nameNorm.replace(/[^a-z0-9ñ ]/g, ' ').split(' ').filter(Boolean).slice(0, 2);
  return g.include.some(words => words.every(w => n.includes(` ${w}`)) && head.some(h => h.startsWith(words[0])));
}

/** Factor para llevar el precio del producto a precio por kg (o por unidad). null si no se puede comparar. */
export function factorFor(g: Generic, c: Pick<Candidate, 'kind' | 'size_value' | 'size_unit' | 'name_norm'>): number | null {
  if (g.unit === 'unidad') return 1;
  if (c.kind === 'weighed' || /\b(x|por) ?kg\b/.test(c.name_norm)) return 1;
  if (c.size_unit === 'g' && c.size_value && Number(c.size_value) >= 100) return Math.round(Number(c.size_value)) / 1000;
  return null;
}

export function score(g: Generic, c: Pick<Candidate, 'kind' | 'name_norm'>): number {
  const words = norm(g.name).replace(/[()]/g, '').split(' ').filter(w => w.length > 2);
  const hit = words.filter(w => c.name_norm.includes(w)).length / Math.max(1, words.length);
  return Math.round(Math.min(1, hit * 0.8 + (c.kind === 'weighed' ? 0.2 : 0.1)) * 100) / 100;
}

export async function suggestFrescos(sql: Sql): Promise<{ generics: number; suggested: number }> {
  const generics = loadGenerics();
  const cats = new Map((await sql<{ id: number; slug: string }[]>`select id, slug from categories`).map(c => [c.slug, c.id]));
  const rows = generics.map(g => ({
    slug: g.slug, name: g.name, unit: g.unit, category_id: cats.get(g.category)!,
    keywords: [...g.include.map(w => w.join(' ')), ...g.exclude.map(e => `-${e}`)], name_norm: norm(g.name),
  }));
  await sql`
    insert into fresh_generics (slug, name, unit, category_id, keywords, name_norm)
    select r.slug, r.name, r.unit, r.category_id, r.keywords, r.name_norm
    from jsonb_to_recordset(${sql.json(rows as never)}) as r(slug text, name text, unit text, category_id smallint, keywords text[], name_norm text)
    on conflict (slug) do update set name = excluded.name, unit = excluded.unit, category_id = excluded.category_id,
      keywords = excluded.keywords, name_norm = excluded.name_norm`;
  const ids = new Map((await sql<{ id: number; slug: string }[]>`select id, slug from fresh_generics`).map(g => [g.slug, g.id]));

  // Las sugerencias pendientes se recalculan; las aprobadas y rechazadas se conservan
  await sql`delete from fresh_mappings where status = 'suggested'`;

  // Candidatos: productos con precio disponible en categorías de frescos (o sin categoría)
  const freshCats = ['verduleria', 'carnes', 'fiambreria', 'lacteos', 'panaderia'].map(s => cats.get(s)!);
  const candidates = await sql<Candidate[]>`
    select distinct on (p.id) p.id, p.name_norm, p.kind, p.size_value, p.size_unit, z.chain_id
    from products p join prices_current pc on pc.product_id = p.id and pc.available join price_zones z on z.id = pc.zone_id
    where p.category_id is null or p.category_id = any(${freshCats})
    order by p.id, z.chain_id`;

  const out: { generic_id: number; product_id: number; chain_id: number; factor_to_unit: number; score: number }[] = [];
  for (const g of generics) {
    for (const c of candidates) {
      if (!matches(g, c.name_norm)) continue;
      const factor = factorFor(g, c);
      if (!factor) continue;
      out.push({ generic_id: ids.get(g.slug)!, product_id: Number(c.id), chain_id: c.chain_id, factor_to_unit: factor, score: score(g, c) });
    }
  }
  let suggested = 0;
  for (let i = 0; i < out.length; i += 1000) {
    const r = await sql`
      insert into fresh_mappings (generic_id, product_id, chain_id, factor_to_unit, score)
      select * from jsonb_to_recordset(${sql.json(out.slice(i, i + 1000) as never)})
        as r(generic_id int, product_id bigint, chain_id smallint, factor_to_unit numeric, score real)
      on conflict (generic_id, product_id) do nothing`;
    suggested += r.count;
  }
  return { generics: generics.length, suggested };
}

if (import.meta.main) {
  const { connect } = await import('../shared/db.ts');
  const sql = connect();
  try {
    console.log(await suggestFrescos(sql));
  } finally {
    await sql.end();
  }
}
