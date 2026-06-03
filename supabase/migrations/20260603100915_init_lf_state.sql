-- Estado de la app (un solo usuario): config + presupuesto + notas, etc. como JSON.
create table if not exists public.lf_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.lf_state enable row level security;

-- ⚠️ Política ABIERTA: cualquiera con la anon key puede leer/escribir.
-- Aceptable solo para uso personal. Para privacidad real, migra a Supabase Auth
-- y reemplaza esta política por una basada en auth.uid() / user_id.
drop policy if exists "anon full access" on public.lf_state;
create policy "anon full access" on public.lf_state
  for all
  to anon, authenticated
  using (true)
  with check (true);
