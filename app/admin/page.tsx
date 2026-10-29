'use client';
// Panel de administración (/admin): ingreso con magic link y acceso solo para emails en admin_emails (RLS).
// Diseño: design/admin/index.html (misma línea que Stitch).
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseAuth as sb } from '@/lib/supabase-auth';
import { CHAINS, chainById, isStale, money } from '@/lib/catalog';
import { ChainTag, Chip, Icon } from '@/components/ui';

type Tab = 'estado' | 'frescos' | 'busquedas';

function Login({ error }: { error?: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(error ?? '');
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/admin`, shouldCreateUser: false } });
    if (error) setErr(error.message.includes('Signups not allowed') ? 'Este email no tiene acceso al panel.' : error.message);
    else setSent(true);
  }
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 font-head text-[28px] font-extrabold text-primary"><Icon name="shopping_cart" size={28} />changuito</span>
          <p className="text-[15px] text-ink2">Panel de administración</p>
        </div>
        {sent ? (
          <div className="card p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-primary"><Icon name="mark_email_read" size={30} /></div>
            <h1 className="mt-4 font-head text-[22px] font-bold">Revisá tu correo</h1>
            <p className="mt-2 text-[15px] text-ink2">Te mandamos un link a <b className="text-ink">{email}</b>. Abrilo desde este dispositivo.</p>
            <button className="btn btn-ghost mt-3" onClick={() => setSent(false)}>Usar otro email</button>
          </div>
        ) : (
          <form className="card p-6" onSubmit={send}>
            <h1 className="font-head text-[22px] font-bold">Ingresá al panel</h1>
            <p className="mt-1 text-[15px] text-ink2">Te mandamos un link de acceso. No hace falta contraseña.</p>
            <label className="mt-5 block text-[13px] font-semibold text-ink2" htmlFor="email">Tu email</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@ejemplo.com"
              className="mt-1.5 h-12 w-full rounded-[12px] border border-line bg-subtle px-4 outline-none focus:border-primary focus:bg-card" />
            {err && <p className="mt-3 flex gap-2 rounded-[12px] bg-err-bg p-3 text-[15px] text-err"><Icon name="block" />{err}</p>}
            <button className="btn btn-primary mt-4 w-full">Enviarme el link de acceso</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Estado

type Run = { id: number; source: string; chain_id: number | null; mode: string | null; started_at: string; finished_at: string | null; status: string; items_read: number | null; items_written: number | null; stats: Record<string, unknown>; error: string | null };

function Estado() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [fresh, setFresh] = useState<Map<number, string>>(new Map());
  const [kpi, setKpi] = useState<{ products: number; prices: number; db: number | null; approved: number; generics: number } | null>(null);
  useEffect(() => {
    (async () => {
      const [r, f, p, pc, db, ap, g] = await Promise.all([
        sb.from('ingest_runs').select('*').order('started_at', { ascending: false }).limit(40),
        sb.rpc('chain_freshness'),
        sb.from('products').select('id', { count: 'estimated', head: true }),
        sb.from('prices_current').select('product_id', { count: 'estimated', head: true }).eq('available', true),
        sb.rpc('db_size_bytes'),
        sb.from('fresh_mappings').select('generic_id').eq('status', 'approved'),
        sb.from('fresh_generics').select('id', { count: 'exact', head: true }),
      ]);
      setRuns((r.data ?? []) as Run[]);
      setFresh(new Map((f.data ?? []).map((x: { chain_id: number; last_captured: string }) => [Number(x.chain_id), x.last_captured])));
      setKpi({ products: p.count ?? 0, prices: pc.count ?? 0, db: db.data ? Number(db.data) : null, approved: new Set((ap.data ?? []).map(x => x.generic_id)).size, generics: g.count ?? 0 });
    })();
  }, []);
  const lastOf = (chainId: number) => runs.find(r => r.chain_id === chainId || (chainId > 3 && r.source === 'sepa'));
  const dbMb = kpi?.db ? Math.round(kpi.db / 1024 / 1024) : null;
  const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const dur = (r: Run) => r.finished_at ? `${Math.max(1, Math.round((+new Date(r.finished_at) - +new Date(r.started_at)) / 60000))} min` : '…';
  const statusChip = (s: string) => s === 'ok' ? <Chip tone="save">Ok</Chip> : s === 'failed' ? <Chip tone="err">Falló</Chip> : s === 'skipped' ? <Chip>Sin cambios</Chip> : <Chip tone="primary">Corriendo</Chip>;
  return (
    <section>
      <h1 className="font-head text-[24px] font-bold">Estado</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ['Productos en catálogo', kpi?.products.toLocaleString('es-AR')],
          ['Precios disponibles', kpi?.prices.toLocaleString('es-AR')],
          ['Frescos con equivalencias', kpi && `${kpi.approved} / ${kpi.generics}`],
          ['Tamaño de la base', dbMb !== null ? `${dbMb} MB / 500` : '—'],
        ].map(([l, v]) => (
          <div key={l} className="card p-4"><div className="text-[13px] font-semibold text-ink2">{l}</div><div className="num mt-1 text-[26px] font-bold">{v ?? '…'}</div></div>
        ))}
      </div>
      {dbMb !== null && <div className="mt-2 h-2 rounded-full bg-subtle"><div className={`h-2 rounded-full ${dbMb > 400 ? 'bg-warn' : 'bg-primary'}`} style={{ width: `${Math.min(100, dbMb / 5)}%` }} /></div>}

      <div className="card mt-6 overflow-x-auto">
        <table className="num w-full min-w-[760px] text-[15px]">
          <thead className="bg-subtle text-[13px] text-ink2"><tr>{['Super', 'Fuente', 'Última corrida', 'Duración', 'Leídos', 'Escritos', 'Precios', 'Estado'].map(h => <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {CHAINS.map(c => {
              const r = lastOf(c.id), last = fresh.get(c.id);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-semibold"><ChainTag chainId={c.id} /></td>
                  <td className="px-4 text-ink2">{c.id <= 3 ? 'Web' : 'SEPA'}</td>
                  <td className="px-4">{r ? fmt(r.started_at) : '—'}</td>
                  <td className="px-4">{r ? dur(r) : '—'}</td>
                  <td className="px-4">{r?.items_read?.toLocaleString('es-AR') ?? '—'}</td>
                  <td className="px-4">{r?.items_written?.toLocaleString('es-AR') ?? '—'}</td>
                  <td className="px-4">{last ? (isStale(last) ? <Chip tone="warn">Viejos</Chip> : <Chip tone="save">Al día</Chip>) : <Chip tone="err">Sin datos</Chip>}</td>
                  <td className="px-4">{r ? statusChip(r.status) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 font-head text-[18px] font-semibold">Últimas corridas</h2>
      <ul className="card mt-3 divide-y divide-line">
        {runs.slice(0, 15).map(r => (
          <li key={r.id} className="px-4 py-3">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <Icon name={r.status === 'ok' ? 'check_circle' : r.status === 'failed' ? 'cancel' : 'do_not_disturb_on'} className={r.status === 'ok' ? 'text-save' : r.status === 'failed' ? 'text-err' : 'text-muted'} />
                <span className="flex-1">
                  <span className="font-semibold">{r.source}{r.chain_id ? ` · ${chainById(r.chain_id).name}` : ''}{r.mode ? ` (${r.mode})` : ''}</span>
                  <span className="num block text-[13px] text-muted">{fmt(r.started_at)} · {dur(r)} · {r.items_written?.toLocaleString('es-AR') ?? 0} escritos</span>
                </span>
                {statusChip(r.status)}
              </summary>
              {r.error && <p className="mt-2 rounded-[12px] bg-err-bg p-3 text-[13px] text-err">{r.error}</p>}
              <pre className="mt-2 max-h-60 overflow-auto rounded-[12px] bg-subtle p-3 text-[12px] whitespace-pre-wrap">{JSON.stringify(r.stats, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- Frescos

type Mapping = {
  generic_id: number; product_id: number; chain_id: number; factor_to_unit: number; status: string; score: number | null;
  fresh_generics: { name: string; unit: string; category_id: number };
  products: { name: string; prices_current: { price: number; available: boolean; zone_id: number }[] };
};

function Frescos() {
  const [status, setStatus] = useState<'suggested' | 'approved' | 'rejected'>('suggested');
  const [rows, setRows] = useState<Mapping[] | null>(null);
  const [q, setQ] = useState('');
  const [factors, setFactors] = useState<Record<string, number>>({});
  const load = useCallback(async () => {
    setRows(null);
    const all: Mapping[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from('fresh_mappings')
        .select('generic_id, product_id, chain_id, factor_to_unit, status, score, fresh_generics(name, unit, category_id), products(name, prices_current(price, available, zone_id))')
        .eq('status', status).order('generic_id').range(from, from + 999);
      all.push(...((data ?? []) as unknown as Mapping[]));
      if (!data || data.length < 1000) break;
    }
    setRows(all);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const m = new Map<number, Mapping[]>();
    for (const r of rows ?? []) {
      if (q && !`${r.fresh_generics.name} ${r.products.name}`.toLowerCase().includes(q.toLowerCase())) continue;
      if (!m.has(r.generic_id)) m.set(r.generic_id, []);
      m.get(r.generic_id)!.push(r);
    }
    return [...m.values()];
  }, [rows, q]);

  const key = (r: Mapping) => `${r.generic_id}:${r.product_id}`;
  async function decide(list: Mapping[], next: 'approved' | 'rejected' | 'suggested') {
    for (const r of list) {
      await sb.from('fresh_mappings').update({ status: next, factor_to_unit: factors[key(r)] ?? r.factor_to_unit, decided_at: new Date().toISOString() })
        .eq('generic_id', r.generic_id).eq('product_id', r.product_id);
    }
    const done = new Set(list.map(key));
    setRows(rs => rs?.filter(r => !done.has(key(r))) ?? null);
  }

  return (
    <section>
      <h1 className="font-head text-[24px] font-bold">Frescos</h1>
      <p className="text-[15px] text-ink2">Solo se usan las equivalencias aprobadas. El factor lleva el precio a kg (bandeja de 400 g → 0,4).</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-[12px] bg-subtle p-1 text-[15px] font-semibold">
          {([['suggested', 'Pendientes'], ['approved', 'Aprobadas'], ['rejected', 'Rechazadas']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`h-9 rounded-[9px] px-3 ${status === k ? 'bg-card shadow-sm' : 'text-ink2'}`}>{l}</button>
          ))}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar genérico o producto" className="h-10 min-w-[220px] flex-1 rounded-[12px] border border-line bg-subtle px-3 outline-none focus:border-primary focus:bg-card" />
        <span className="num text-[13px] text-muted">{rows ? `${rows.length} equivalencias` : 'Cargando…'}</span>
      </div>
      {groups.map(list => {
        const g = list[0].fresh_generics;
        return (
          <div key={list[0].generic_id} className="card mt-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <span className="font-head text-[18px] font-semibold">{g.name}</span>
              <span className="text-[13px] text-ink2">por {g.unit}</span>
              {status !== 'approved' && <button className="btn btn-primary ml-auto min-h-9 px-3 text-[15px]" onClick={() => decide(list, 'approved')}>Aprobar las {list.length}</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="num w-full min-w-[720px] text-[15px]">
                <tbody className="divide-y divide-line">
                  {list.map(r => {
                    const f = factors[key(r)] ?? Number(r.factor_to_unit);
                    const price = Math.min(...r.products.prices_current.filter(p => p.available).map(p => Number(p.price)));
                    return (
                      <tr key={key(r)}>
                        <td className="px-4 py-2.5 whitespace-nowrap"><ChainTag chainId={r.chain_id} /></td>
                        <td className="px-2"><span className="line-clamp-2">{r.products.name}</span></td>
                        <td className="px-2 text-right whitespace-nowrap">{Number.isFinite(price) ? money(price) : '—'}</td>
                        <td className="px-2"><input type="number" step="0.05" min="0.05" value={f} onChange={e => setFactors(x => ({ ...x, [key(r)]: Number(e.target.value) }))} className="h-9 w-20 rounded-lg border border-line bg-card px-2 text-right" aria-label="Factor a kg" /></td>
                        <td className="px-2 text-right font-semibold whitespace-nowrap">{Number.isFinite(price) && f ? `${money(price / f, true)} /${g.unit === 'kg' ? 'kg' : 'u'}` : '—'}</td>
                        <td className="px-2 text-[13px] text-muted">{r.score ? `${Math.round(r.score * 100)}%` : ''}</td>
                        <td className="px-4 whitespace-nowrap text-right">
                          {status !== 'rejected' && <button className="btn btn-outline mr-2 min-h-9 px-3 text-[15px]" onClick={() => decide([r], 'rejected')}>Rechazar</button>}
                          {status !== 'approved' && <button className="btn btn-primary min-h-9 px-3 text-[15px]" onClick={() => decide([r], 'approved')}>Aprobar</button>}
                          {status === 'approved' && <button className="btn btn-ghost min-h-9 px-3 text-[15px]" onClick={() => decide([r], 'suggested')}>Deshacer</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------- Búsquedas sin resultado

function Busquedas() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<{ term: string; n: number; last: string }[] | null>(null);
  const [top, setTop] = useState<{ term: string; n: number }[]>([]);
  const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const [{ data }, { data: ignored }] = await Promise.all([
      sb.from('search_log').select('term_norm, results, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
      sb.from('search_synonyms').select('term_norm').eq('ignored', true),
    ]);
    const skip = new Set((ignored ?? []).map(i => i.term_norm));
    const zero = new Map<string, { n: number; last: string }>(), ok = new Map<string, number>();
    for (const r of data ?? []) {
      if (r.results === 0 && !skip.has(r.term_norm)) {
        const z = zero.get(r.term_norm);
        zero.set(r.term_norm, { n: (z?.n ?? 0) + 1, last: z?.last ?? r.created_at });
      } else if (r.results > 0) ok.set(r.term_norm, (ok.get(r.term_norm) ?? 0) + 1);
    }
    setTotal(data?.length ?? 0);
    setRows([...zero].map(([term, v]) => ({ term, ...v })).sort((a, b) => b.n - a.n));
    setTop([...ok].map(([term, n]) => ({ term, n })).sort((a, b) => b.n - a.n).slice(0, 10));
  }, [days]);
  useEffect(() => { load(); }, [load]);
  async function ignore(term: string) {
    await sb.from('search_synonyms').upsert({ term_norm: term, ignored: true });
    setRows(r => r?.filter(x => x.term !== term) ?? null);
  }
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-head text-[24px] font-bold">Búsquedas sin resultado</h1>
          <p className="text-[15px] text-ink2">Se guardan sin IP ni datos personales. {total.toLocaleString('es-AR')} búsquedas en el período.</p>
        </div>
        <div className="inline-flex rounded-[12px] bg-subtle p-1 text-[15px] font-semibold">
          {[7, 30].map(d => <button key={d} onClick={() => setDays(d)} className={`h-9 rounded-[9px] px-3 ${days === d ? 'bg-card shadow-sm' : 'text-ink2'}`}>{d} días</button>)}
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ul className="card divide-y divide-line lg:col-span-2">
          {rows?.length === 0 && <li className="p-4 text-ink2">No hubo búsquedas sin resultado.</li>}
          {rows?.map(r => (
            <li key={r.term} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 font-semibold">{r.term}</span>
              <span className="num text-ink2">{r.n}</span>
              <span className="num w-28 text-[13px] text-muted">{new Date(r.last).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <a className="btn btn-ghost min-h-9 px-3 text-[15px]" href={`/buscar?q=${encodeURIComponent(r.term)}`} target="_blank" rel="noreferrer">Probar</a>
              <button className="btn btn-ghost min-h-9 px-3 text-[15px] text-ink2" onClick={() => ignore(r.term)}>Ignorar</button>
            </li>
          ))}
        </ul>
        <div className="card p-4">
          <h2 className="font-head text-[18px] font-semibold">Lo más buscado</h2>
          <ol className="num mt-2 space-y-1.5 text-[15px]">
            {top.map((t, i) => <li key={t.term} className="flex gap-3"><span className="w-5 text-muted">{i + 1}</span><span className="flex-1">{t.term}</span><b>{t.n}</b></li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Shell

export default function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('estado');

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    const fromHash = location.hash.slice(1) as Tab;
    if (['estado', 'frescos', 'busquedas'].includes(fromHash)) setTab(fromHash);
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    sb.from('admin_emails').select('email').then(({ data }) => setIsAdmin(!!data?.length));
  }, [session]);

  if (session === undefined) return null;
  if (!session) return <Login />;
  if (isAdmin === null) return <p className="py-20 text-center text-ink2">Verificando acceso…</p>;
  if (!isAdmin) return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="rounded-[12px] bg-err-bg p-4 text-err">El email {session.user.email} no tiene acceso al panel.</p>
      <button className="btn btn-outline" onClick={() => sb.auth.signOut()}>Salir</button>
    </div>
  );

  const nav: [Tab, string, string][] = [['estado', 'Estado', 'monitor_heart'], ['frescos', 'Frescos', 'nutrition'], ['busquedas', 'Búsquedas', 'search_off']];
  const go = (t: Tab) => { setTab(t); history.replaceState(null, '', `#${t}`); };
  return (
    // El panel es web: se sale del contenedor de 480 px de la app
    <div className="fixed inset-0 overflow-auto bg-bg lg:flex">
      <aside className="sticky top-0 z-10 border-b border-line bg-card lg:h-dvh lg:w-[248px] lg:flex-none lg:border-r lg:border-b-0 lg:p-4">
        <div className="flex items-center justify-between px-4 pt-3 lg:block lg:px-2 lg:pt-0">
          <span className="flex items-center gap-1.5 font-head text-[22px] font-extrabold text-primary"><Icon name="shopping_cart" />changuito</span>
          <p className="hidden text-[13px] text-muted lg:block">Panel de administración</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-2 lg:mt-4 lg:flex-col lg:px-0">
          {nav.map(([k, l, i]) => (
            <button key={k} onClick={() => go(k)} className={`flex h-11 flex-none items-center gap-2.5 rounded-[12px] px-3 font-semibold ${tab === k ? 'bg-primary-tint text-primary' : 'text-ink2'}`}><Icon name={i} />{l}</button>
          ))}
        </nav>
        <div className="hidden px-2 lg:mt-6 lg:block">
          <p className="truncate text-[13px] text-ink2">{session.user.email}</p>
          <button className="btn btn-ghost -ml-3 min-h-9 px-3 text-[15px]" onClick={() => sb.auth.signOut()}><Icon name="logout" />Salir</button>
        </div>
      </aside>
      <main className="w-full max-w-[1200px] px-4 py-6 lg:px-8">
        {tab === 'estado' && <Estado />}
        {tab === 'frescos' && <Frescos />}
        {tab === 'busquedas' && <Busquedas />}
      </main>
    </div>
  );
}
