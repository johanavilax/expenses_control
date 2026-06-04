// Acepta tanto la nueva llave "publishable" (sb_publishable_...) como la
// "anon" legacy. Las referencias a process.env.NEXT_PUBLIC_* deben ser
// literales para que Next las inyecte en el bundle.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY =
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
