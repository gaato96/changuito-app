// Aplica las migraciones de supabase/migrations que falten y recarga category_map desde data/categorias.json.
// Uso: DATABASE_URL=... node scripts/migrate.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { connect } from '../ingest/shared/db.ts';
import { loadCategoryConfig } from '../ingest/shared/categories.ts';

const dir = join(import.meta.dirname, '..', 'supabase', 'migrations');
const sql = connect();
try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map(r => r.name));
  for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    await sql.begin(async tx => {
      await tx.unsafe(readFileSync(join(dir, file), 'utf8'));
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log('aplicada', file);
  }

  const { map } = loadCategoryConfig();
  const chains = await sql<{ id: number; slug: string }[]>`select id, slug from chains`;
  const cats = await sql<{ id: number; slug: string }[]>`select id, slug from categories`;
  const catId = new Map(cats.map(c => [c.slug, c.id]));
  const rows = chains.flatMap(c =>
    Object.entries(map[c.slug] ?? {}).map(([path, slug]) => {
      const id = catId.get(slug);
      if (!id) throw new Error(`Categoría desconocida en data/categorias.json: ${slug}`);
      return { chain_id: c.id, external_path: path, category_id: id };
    }),
  );
  await sql.begin(async tx => {
    await tx`delete from category_map`;
    await tx`insert into category_map ${tx(rows)}`;
  });
  console.log(`category_map: ${rows.length} rutas`);
} finally {
  await sql.end();
}
