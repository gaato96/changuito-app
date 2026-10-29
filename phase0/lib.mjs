// Utilidades compartidas de la Fase 0
export const UA = 'Changuito/0.1 (fase0; uso personal no comercial)';
export const CHAINS = {
  carrefour: { base: 'https://www.carrefour.com.ar', useCookie: true },
  changomas: { base: 'https://www.masonline.com.ar', useCookie: true },
  comodin: { base: 'https://www.comodinencasa.com.ar', useCookie: false },
};
export const sleep = ms => new Promise(r => setTimeout(r, ms));

let last = 0;
// 1 pedido por segundo por proceso, con reintentos y backoff
export async function vtexFetch(url, { cookie, method = 'GET', body } = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = last + 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: { 'user-agent': UA, ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(2000 * 2 ** attempt);
    }
  }
}

export async function regionCookie(base, cp = '4000') {
  const regions = await (await vtexFetch(`${base}/api/checkout/pub/regions?country=ARG&postalCode=${cp}`)).json();
  return 'vtex_segment=' + Buffer.from(JSON.stringify({ regionId: regions[0].id, channel: '1' })).toString('base64');
}

export const totalFrom = res => Number((res.headers.get('resources') || '0-0/0').split('/')[1]);
