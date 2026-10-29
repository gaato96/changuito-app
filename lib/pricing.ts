// Cálculo de costos con promos y comparación de listas (PLAN.md §5.2 y §5.3).
// Corre en el teléfono con los precios guardados, así funciona sin internet.

export type PromoKind = 'none' | 'pct' | 'nth_pct' | 'nxm' | 'qty_price' | 'text';

export type Price = {
  productId: number;
  chainId: number;
  price: number;          // 1 unidad (o 1 kg) con descuento directo
  listPrice: number;
  unitPrice: number | null;
  unitLabel: 'kg' | 'l' | 'u' | null;
  soldByWeight: boolean;
  promoKind: PromoKind;
  promoMinQty: number | null;
  promoValue: number | null;
  promoText: string | null;
  loyalty: 'mi_carrefour' | null;
  capturedAt: string;     // ISO
};

export type ListItem = { productId: number; qty: number };  // unidades, o kg si se vende por peso

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Costo de llevar q unidades (o q kg) con la promo aplicada. */
export function costFor(q: number, p: Pick<Price, 'price' | 'listPrice' | 'soldByWeight' | 'promoKind' | 'promoMinQty' | 'promoValue'>): number {
  if (q <= 0) return 0;
  if (p.soldByWeight) return round2(q * p.price);
  const n = p.promoMinQty ?? 0, v = p.promoValue ?? 0;
  switch (p.promoKind) {
    case 'nth_pct': {
      const groups = Math.floor(q / n);
      return round2(q * p.listPrice - groups * p.listPrice * (v / 100));
    }
    case 'nxm': {
      const groups = Math.floor(q / n);
      return round2(groups * v * p.listPrice + (q - groups * n) * p.listPrice);
    }
    case 'qty_price':
      return round2(q >= n ? q * v : q * p.listPrice);
    default:
      return round2(q * p.price);
  }
}

export function isFresh(p: Price, now: Date, staleHours = 72): boolean {
  return now.getTime() - new Date(p.capturedAt).getTime() <= staleHours * 3600_000;
}

export type Suggestion = { productId: number; chainId: number; fromQty: number; toQty: number; total: number; each: number; saving: number; text: string };

/**
 * "Si llevás 2, cada uno te sale $X; ahorrás $Y". Solo sugiere; no cambia la lista.
 * Propone completar el mínimo de la promo cuando eso baja el precio por unidad.
 */
export function promoSuggestion(q: number, p: Price): Suggestion | null {
  if (p.soldByWeight || !['nth_pct', 'nxm', 'qty_price'].includes(p.promoKind) || !p.promoMinQty) return null;
  const n = p.promoMinQty;
  const target = q < n ? n : q % n === 0 ? null : Math.ceil(q / n) * n;
  if (!target || target - q > n) return null;
  const now = costFor(q, p), then = costFor(target, p);
  const eachNow = now / q, eachThen = then / target;
  if (eachThen >= eachNow - 0.5) return null;
  return {
    productId: p.productId, chainId: p.chainId, fromQty: q, toQty: target, total: round2(then), each: round2(eachThen),
    saving: round2((eachNow - eachThen) * target), text: p.promoText ?? '',
  };
}

export type ChainResult = {
  chainId: number;
  coverage: number;
  total: number;
  costs: Map<number, number>;                 // productId → costo
  missing: number[];                          // productIds sin dato
  vs: { chainId: number; saving: number; common: number }[];  // ahorro contra cada otro super, sobre productos que tienen los dos
};

export type PairResult = {
  chains: [number, number];
  coverage: number;
  total: number;
  assignment: Map<number, number>;            // productId → chainId donde conviene comprarlo
  costs: Map<number, number>;
  savingVsBestSingle: number;                 // sobre los productos que tienen el par y el mejor super único
  common: number;
  worthIt: boolean;
};

export type Comparison = { items: number; singles: ChainResult[]; bestPair: PairResult | null; pairs: PairResult[]; suggestions: Suggestion[]; stale: number[] };

export const SPLIT_MIN_SAVING = 1000;
export const SPLIT_MIN_SHARE = 0.03;

const byCoverageThenTotal = <T extends { coverage: number; total: number }>(a: T, b: T) => b.coverage - a.coverage || a.total - b.total;

/**
 * Compara una lista en todos los supers.
 * Ranking por cobertura y después por total. El ahorro contra otro super se calcula solo sobre los productos
 * que tienen los dos, para que la comparación sea justa.
 */
export function compareList(list: ListItem[], prices: Price[], chainIds: number[], now = new Date(), staleHours = 72): Comparison {
  const items = list.filter(i => i.qty > 0);
  const index = new Map<string, Price>();
  const stale = new Set<number>();
  for (const p of prices) {
    if (!isFresh(p, now, staleHours)) { stale.add(p.chainId); continue; }
    index.set(`${p.productId}:${p.chainId}`, p);
  }
  const cost = (productId: number, chainId: number, qty: number): number | null => {
    const p = index.get(`${productId}:${chainId}`);
    return p ? costFor(qty, p) : null;
  };

  const singles: ChainResult[] = chainIds.map(chainId => {
    const costs = new Map<number, number>();
    const missing: number[] = [];
    for (const it of items) {
      const c = cost(it.productId, chainId, it.qty);
      if (c === null) missing.push(it.productId); else costs.set(it.productId, c);
    }
    return { chainId, coverage: costs.size, total: round2([...costs.values()].reduce((a, b) => a + b, 0)), costs, missing, vs: [] };
  });
  for (const s of singles) {
    s.vs = singles.filter(t => t.chainId !== s.chainId).map(t => {
      let saving = 0, common = 0;
      for (const [pid, c] of s.costs) {
        const other = t.costs.get(pid);
        if (other === undefined) continue;
        common++;
        saving += other - c;
      }
      return { chainId: t.chainId, saving: round2(saving), common };
    });
  }
  singles.sort(byCoverageThenTotal);
  const best = singles[0];

  const pairs: PairResult[] = [];
  for (let a = 0; a < chainIds.length; a++) {
    for (let b = a + 1; b < chainIds.length; b++) {
      const ca = singles.find(s => s.chainId === chainIds[a])!, cb = singles.find(s => s.chainId === chainIds[b])!;
      const assignment = new Map<number, number>(), costs = new Map<number, number>();
      for (const it of items) {
        const x = ca.costs.get(it.productId), y = cb.costs.get(it.productId);
        if (x === undefined && y === undefined) continue;
        const useA = y === undefined || (x !== undefined && x <= y);
        assignment.set(it.productId, useA ? ca.chainId : cb.chainId);
        costs.set(it.productId, useA ? x! : y!);
      }
      let saving = 0, common = 0;
      if (best) {
        for (const [pid, c] of costs) {
          const single = best.costs.get(pid);
          if (single === undefined) continue;
          common++;
          saving += single - c;
        }
      }
      const total = round2([...costs.values()].reduce((s, c) => s + c, 0));
      const usesBoth = new Set(assignment.values()).size === 2;
      const base = best ? [...costs.keys()].filter(pid => best.costs.has(pid)).reduce((s, pid) => s + best.costs.get(pid)!, 0) : 0;
      pairs.push({
        chains: [ca.chainId, cb.chainId], coverage: costs.size, total, assignment, costs,
        savingVsBestSingle: round2(saving), common,
        worthIt: usesBoth && (saving >= SPLIT_MIN_SAVING || (base > 0 && saving / base >= SPLIT_MIN_SHARE)),
      });
    }
  }
  pairs.sort(byCoverageThenTotal);

  const suggestions: Suggestion[] = [];
  for (const it of items) {
    for (const chainId of chainIds) {
      const p = index.get(`${it.productId}:${chainId}`);
      const s = p && promoSuggestion(it.qty, p);
      if (s) suggestions.push(s);
    }
  }
  suggestions.sort((a, b) => b.saving - a.saving);

  return { items: items.length, singles, bestPair: pairs[0] ?? null, pairs, suggestions, stale: [...stale] };
}
