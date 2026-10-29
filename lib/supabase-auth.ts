'use client';
// Cliente de Supabase con sesión, solo para el panel admin (magic link). La app pública usa lib/supabase.ts sin sesión.
import { createClient } from '@supabase/supabase-js';

export const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'changuito-admin' },
});
