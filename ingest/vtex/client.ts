// Cliente VTEX: catálogo clásico con la cookie de región y simulación de carrito (PLAN.md §3.1).
// Uso responsable: 1 pedido por segundo por sitio, reintentos con backoff y user-agent identificable.

export const UA = 'Changuito/1.0 (+https://github.com/gaato96/changuito-app; comparador de precios sin fines de lucro)';
export const POSTAL_CODE = '4000';

export type VtexOffer = {
  Price: number; ListPrice: number; PriceWithoutDiscount: number; IsAvailable: boolean;
  Teasers?: { '<Name>k__BackingField'?: string }[]; DiscountHighLight?: { '<Name>k__BackingField'?: string }[];
};
export type VtexProduct = {
  productId: string; productName: string; brand: string; brandId: number; categoryId: string; categories?: string[];
  link?: string; linkText?: string; pricePerUnit?: string[];
  'Gramaje de unidad de consumo'?: string[]; 'Gramaje de unidad de medida'?: string[];
  items: { itemId: string; ean: string; measurementUnit: string; unitMultiplier: number; images?: { imageUrl: string }[];
    sellers: { sellerId: string; commertialOffer: VtexOffer }[] }[];
};
export type CategoryNode = { id: number; name: string; children: CategoryNode[] };
export type SimItem = {
  id: string; price: number; listPrice: number; sellingPrice: number; quantity: number; availability: string;
  measurementUnit: string; unitMultiplier: number; priceDefinition?: { total: number };
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class VtexClient {
  private last = 0;
  private cookie: string | null = null;
  requests = 0;
  readonly base: string;
  private readonly minIntervalMs: number;

  constructor(base: string, minIntervalMs = 1000) {
    this.base = base;
    this.minIntervalMs = minIntervalMs;
  }

  private async fetch(path: string, init: { method?: string; body?: unknown; cookie?: boolean } = {}): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const wait = this.last + this.minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      this.last = Date.now();
      this.requests++;
      try {
        const res = await fetch(this.base + path, {
          method: init.method ?? 'GET',
          headers: {
            'user-agent': UA, accept: 'application/json',
            ...(init.cookie && this.cookie ? { cookie: this.cookie } : {}),
            ...(init.body ? { 'content-type': 'application/json' } : {}),
          },
          body: init.body ? JSON.stringify(init.body) : undefined,
          signal: AbortSignal.timeout(60_000),
        });
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status} en ${path}`);
        return res;
      } catch (e) {
        if (attempt >= 4) throw e;
        await sleep(2000 * 2 ** attempt);
      }
    }
  }

  /** Obtiene la región de VTEX para el CP y arma la cookie vtex_segment. Devuelve los vendedores de la región. */
  async useRegion(postalCode = POSTAL_CODE): Promise<{ regionId: string; sellers: string[] }> {
    const res = await this.fetch(`/api/checkout/pub/regions?country=ARG&postalCode=${postalCode}`);
    const regions = (await res.json()) as { id: string; sellers: { id: string; name: string }[] }[];
    if (!regions[0]?.id) throw new Error(`Sin región VTEX para CP ${postalCode}`);
    const regionId = regions[0].id;
    this.cookie = 'vtex_segment=' + Buffer.from(JSON.stringify({ regionId, channel: '1' })).toString('base64');
    return { regionId, sellers: regions[0].sellers.map(s => `${s.id}:${s.name}`) };
  }

  async categoryTree(): Promise<CategoryNode[]> {
    return (await this.fetch('/api/catalog_system/pub/category/tree/3')).json() as Promise<CategoryNode[]>;
  }

  /** Recorre una categoría completa. Si supera el límite de 2.500 de VTEX, baja por sus subcategorías. */
  async *crawlCategory(node: CategoryNode, path = `/${node.id}`): AsyncGenerator<VtexProduct[]> {
    const q = `/api/catalog_system/pub/products/search?fq=C:${path}/`;
    const head = await this.fetch(`${q}&_from=0&_to=0`, { cookie: true });
    const total = Number((head.headers.get('resources') ?? '0-0/0').split('/')[1]);
    if (total > 2500 && node.children.length) {
      for (const ch of node.children) yield* this.crawlCategory(ch, `${path}/${ch.id}`);
      return;
    }
    for (let from = 0; from < Math.min(total, 2500); from += 50) {
      const res = await this.fetch(`${q}&_from=${from}&_to=${from + 49}`, { cookie: true });
      yield (await res.json()) as VtexProduct[];
    }
  }

  /** Simula un carrito con CP 4000. Devuelve los ítems por SKU. */
  async simulate(skus: string[], quantity: number): Promise<Map<string, SimItem>> {
    const res = await this.fetch('/api/checkout/pub/orderForms/simulation?sc=1', {
      method: 'POST',
      body: { items: skus.map(id => ({ id, quantity, seller: '1' })), country: 'ARG', postalCode: POSTAL_CODE },
    });
    if (!res.ok) throw new Error(`Simulación HTTP ${res.status}`);
    const data = (await res.json()) as { items?: SimItem[] };
    return new Map((data.items ?? []).map(i => [i.id, i]));
  }
}

/** "Genérico" y vacío no son marcas reales: no comparten promos combinables. */
export function brandKey(brand: string | null, fallback: string): string {
  const b = (brand ?? '').trim().toLowerCase();
  return !b || /^gen[eé]rico$/.test(b) ? `__${fallback}` : b;
}

/**
 * Arma lotes de simulación con a lo sumo `maxPerBrand` productos de una misma marca: las promos
 * "Combinable" de una marca se aplican entre productos distintos y contaminarían el precio de cada uno (Fase 0).
 */
export function isolatedBatches<T extends { sku: string; brand: string | null }>(items: T[], maxSize = 100, maxPerBrand = 1): T[][] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = brandKey(it.brand, it.sku);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  const largest = Math.max(0, ...[...groups.values()].map(g => g.length));
  const n = Math.max(Math.ceil(largest / maxPerBrand), Math.ceil(items.length / maxSize));
  const batches: T[][] = Array.from({ length: n }, () => []);
  // Las marcas grandes primero, repartidas en ronda; cada lote recibe a lo sumo maxPerBrand de cada marca
  let cursor = 0;
  for (const g of [...groups.values()].sort((a, b) => b.length - a.length)) {
    for (let i = 0; i < g.length; i++) {
      let tries = 0;
      while (batches[cursor].length >= maxSize && tries++ < n) cursor = (cursor + 1) % n;
      batches[cursor].push(g[i]);
      cursor = (cursor + 1) % n;
    }
  }
  return batches.filter(b => b.length);
}
