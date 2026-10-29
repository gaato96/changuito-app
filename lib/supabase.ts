// Cliente de Supabase con la clave pública (anon). Solo lee catálogo y precios; RLS protege el resto.
// Se crea recién cuando se usa: así el build no depende de las variables de entorno y, si faltan,
// el error dice exactamente cuáles cargar.
import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';

export function lazyClient(options: SupabaseClientOptions<'public'>): SupabaseClient {
  let client: SupabaseClient | null = null;
  const get = () => {
    if (!client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error('Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (en Vercel: Settings → Environment Variables).');
      }
      client = createClient(url, key, options);
    }
    return client;
  };
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      const c = get();
      const v = Reflect.get(c, prop);
      return typeof v === 'function' ? v.bind(c) : v;
    },
  });
}

export const supabase = lazyClient({ auth: { persistSession: false } });
