// Conexión a Postgres para la ingesta (Supabase en producción, PGlite en local).
// Usa DATABASE_URL: en Actions es un secreto; nunca va al código porque el repo es público.
import postgres from 'postgres';

export type Sql = postgres.Sql;

export function connect(url = process.env.DATABASE_URL): Sql {
  if (!url) throw new Error('Falta DATABASE_URL');
  const local = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    max: 1,
    ssl: local ? false : 'require',
    prepare: false,          // el pooler de Supabase (modo transacción) no soporta statements preparados
    onnotice: () => {},
    connection: { application_name: 'changuito-ingest' },
  });
}

/** Inserta filas en lotes usando jsonb_to_recordset, que evita armar miles de parámetros. */
export async function inBatches<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}
