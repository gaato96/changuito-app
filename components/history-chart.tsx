// Gráfico de 60 días: una línea escalonada por super con su color (SVG simple, sin librerías).
import { chainById, money } from '@/lib/catalog';
import type { HistoryPoint } from '@/lib/data';

const W = 340, H = 160, PAD = { l: 44, r: 8, t: 10, b: 22 };

export function HistoryChart({ points, now = new Date() }: { points: HistoryPoint[]; now?: Date }) {
  const chains = [...new Set(points.map(p => p.chainId))].sort();
  if (!points.length) return <p className="text-[15px] text-ink2">Todavía no hay historial: empieza a registrarse con cada cambio de precio.</p>;
  const t0 = Math.min(...points.map(p => +new Date(p.at)));
  const t1 = +now;
  const prices = points.map(p => p.price);
  let lo = Math.min(...prices), hi = Math.max(...prices);
  if (hi - lo < hi * 0.04) { lo *= 0.97; hi *= 1.03; }
  const x = (t: number) => PAD.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const fmtDate = (t: number) => new Date(t).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  const min = points.reduce((a, b) => (b.price < a.price ? b : a));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Historial de precios de los últimos 60 días">
        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--muted)" className="num">{money(v / 1000, false).replace('$ ', '$')}k</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} fontSize="10" fill="var(--muted)">{fmtDate(t0)}</text>
        <text x={W - PAD.r} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="end">hoy</text>
        {chains.map(c => {
          const pts = points.filter(p => p.chainId === c).sort((a, b) => a.at.localeCompare(b.at));
          let d = '';
          pts.forEach((p, i) => {
            const px = x(+new Date(p.at)), py = y(p.price);
            d += i === 0 ? `M${px},${py}` : `H${px}V${py}`;
          });
          d += `H${x(t1)}`;
          return <path key={c} d={d} fill="none" stroke={`var(--chain-${chainById(c).slug})`} strokeWidth="2.5" strokeLinejoin="round" />;
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink2">
        {chains.map(c => (
          <span key={c} className="inline-flex items-center gap-1.5"><span className="dot" style={{ background: `var(--chain-${chainById(c).slug})` }} />{chainById(c).name}</span>
        ))}
      </figcaption>
      <p className="mt-3 rounded-[12px] bg-subtle p-3 text-[13px] leading-[18px] text-ink2">
        Precio más bajo en 60 días: <b className="num text-ink">{money(min.price)}</b> en {chainById(min.chainId).name} ({fmtDate(+new Date(min.at))}).
      </p>
    </figure>
  );
}
