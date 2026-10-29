// Cliente de Supabase con la clave pública (anon). Solo lee catálogo y precios; RLS protege el resto.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, { auth: { persistSession: false } });
