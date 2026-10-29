// Mantenimiento diario (PLAN.md §7): limpia historial viejo, mide la base, controla fuentes atrasadas
// y escribe status.json (se commitea una vez por mes para que GitHub no desactive los cron).
// Termina con error si algo requiere atención: GitHub le manda un mail al dueño del repo.
import { writeFileSync } from 'node:fs';
import { connect } from '../shared/db.ts';
import { finishRun, refreshProductCards, startRun } from '../shared/store.ts';

const HISTORY_DAYS = 60;
const SIZE_ALERT_MB = 400;
const STALE_HOURS = 48;

const sql = connect();
const runId = await startRun(sql, 'maintenance', null, null);
const problems: string[] = [];
const stats: Record<string, unknown> = {};
try {
  // El último precio de cada producto se conserva aunque sea más viejo, para que el gráfico tenga punto de partida
  const deleted = await sql`
    delete from price_history h
    where h.valid_from < now() - make_interval(days => ${HISTORY_DAYS})
      and exists (select 1 from price_history n where n.zone_id = h.zone_id and n.product_id = h.product_id and n.valid_from > h.valid_from)`;
  stats.historyDeleted = deleted.count;

  // Los precios de más de 72 h dejan de contar: el resumen por producto se recalcula a diario aunque no haya ingesta
  await refreshProductCards(sql);

  const [{ bytes }] = await sql<{ bytes: string }[]>`select pg_database_size(current_database()) as bytes`;
  const mb = Math.round(Number(bytes) / 1024 / 1024);
  stats.dbSizeMb = mb;
  if (mb > SIZE_ALERT_MB) problems.push(`La base ocupa ${mb} MB (alerta a ${SIZE_ALERT_MB} MB de 500)`);

  const freshness = await sql<{ slug: string; last_ok: Date | null }[]>`
    select c.slug, max(pc.captured_at) as last_ok
    from chains c left join price_zones z on z.chain_id = c.id left join prices_current pc on pc.zone_id = z.id
    where c.active group by c.slug order by c.slug`;
  stats.freshness = Object.fromEntries(freshness.map(f => [f.slug, f.last_ok?.toISOString() ?? null]));
  for (const f of freshness) {
    const hours = f.last_ok ? (Date.now() - f.last_ok.getTime()) / 36e5 : Infinity;
    if (hours > STALE_HOURS) problems.push(`${f.slug}: precios de hace ${Number.isFinite(hours) ? Math.round(hours) + ' h' : 'nunca'}`);
  }

  const counts = await sql<{ products: string; prices: string }[]>`
    select (select count(*) from products) as products, (select count(*) from prices_current where available) as prices`;
  stats.products = Number(counts[0].products);
  stats.availablePrices = Number(counts[0].prices);

  const runs = await sql<{ source: string; slug: string | null; status: string; started_at: Date }[]>`
    select distinct on (r.source, r.chain_id) r.source, c.slug, r.status, r.started_at
    from ingest_runs r left join chains c on c.id = r.chain_id
    where r.source <> 'maintenance' order by r.source, r.chain_id, r.started_at desc`;
  stats.lastRuns = runs.map(r => ({ source: r.source, chain: r.slug, status: r.status, at: r.started_at.toISOString() }));

  writeFileSync('status.json', JSON.stringify({ generatedAt: new Date().toISOString(), ...stats, problems }, null, 2) + '\n');
  await finishRun(sql, runId, problems.length ? 'failed' : 'ok', { stats, error: problems.join('; ') || undefined });
  console.log(JSON.stringify({ ...stats, problems }, null, 2));
  if (problems.length) process.exitCode = 1;
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error('ERROR', msg);
  await finishRun(sql, runId, 'failed', { stats, error: msg });
  process.exitCode = 1;
} finally {
  await sql.end();
}
