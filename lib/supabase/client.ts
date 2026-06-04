import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_KEY } from './env';

/** Cliente de Supabase para componentes de cliente ('use client'). */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
