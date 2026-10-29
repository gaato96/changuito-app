// Base de datos local para desarrollo, sin Docker: PGlite (Postgres en WebAssembly) servido por TCP.
// Crea los roles y el esquema "auth" mínimos de Supabase para que las migraciones corran igual que en producción.
// Uso: node scripts/local-db.ts  →  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { mkdirSync } from 'node:fs';

const dataDir = process.env.PGLITE_DIR ?? '.tmp/pglite';
mkdirSync(dataDir, { recursive: true });
const db = await PGlite.create({ dataDir, extensions: { pg_trgm, unaccent } });

await db.exec(`
  do $$ begin
    if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  end $$;
  create schema if not exists auth;
  create or replace function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
`);

const port = Number(process.env.PGLITE_PORT ?? 54329);
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
await server.start();
console.log(`PGlite escuchando: DATABASE_URL=postgres://postgres:postgres@127.0.0.1:${port}/postgres`);
process.on('SIGINT', async () => { await server.stop(); await db.close(); process.exit(0); });
