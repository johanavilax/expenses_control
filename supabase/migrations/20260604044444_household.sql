-- Modelo de "hogar" compartido: varios usuarios ven el mismo estado (lf_state).

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text default 'Hogar',
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Cada usuario lee su propia membresía y el hogar al que pertenece.
drop policy if exists hm_select_own on public.household_members;
create policy hm_select_own on public.household_members
  for select to authenticated using (user_id = auth.uid());

drop policy if exists hh_select_member on public.households;
create policy hh_select_member on public.households
  for select to authenticated
  using (id = (select household_id from public.household_members where user_id = auth.uid()));

-- lf_state pasa a estar indexado por household_id (no por user_id).
drop policy if exists "own row select" on public.lf_state;
drop policy if exists "own row insert" on public.lf_state;
drop policy if exists "own row update" on public.lf_state;
drop policy if exists "own row delete" on public.lf_state;

create policy lf_select on public.lf_state for select to authenticated
  using (id = (select household_id::text from public.household_members where user_id = auth.uid()));
create policy lf_insert on public.lf_state for insert to authenticated
  with check (id = (select household_id::text from public.household_members where user_id = auth.uid()));
create policy lf_update on public.lf_state for update to authenticated
  using (id = (select household_id::text from public.household_members where user_id = auth.uid()))
  with check (id = (select household_id::text from public.household_members where user_id = auth.uid()));
create policy lf_delete on public.lf_state for delete to authenticated
  using (id = (select household_id::text from public.household_members where user_id = auth.uid()));

-- Auto-provisión: al crear un usuario, se le crea un hogar propio y su membresía.
-- (El seed luego puede unir a dos usuarios en un mismo hogar.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare hh uuid;
begin
  insert into public.households (name) values ('Hogar') returning id into hh;
  insert into public.household_members (user_id, household_id) values (new.id, hh);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
