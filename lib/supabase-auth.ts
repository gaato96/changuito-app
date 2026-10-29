'use client';
// Cliente de Supabase con sesión, solo para el panel admin (magic link). La app pública usa lib/supabase.ts sin sesión.
import { lazyClient } from './supabase';

export const supabaseAuth = lazyClient({
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'changuito-admin' },
});
