-- Pasa lf_state de "fila única abierta" a "una fila por usuario".
-- Cada usuario guarda su estado con id = su auth.uid().

-- Quita la política abierta anterior (si existe).
drop policy if exists "anon full access" on public.lf_state;

-- Limpia filas viejas que no pertenezcan a un usuario (p.ej. la fila 'default').
delete from public.lf_state
where id !~ '^[0-9a-fA-F-]{36}$';

-- Políticas por-usuario: cada quien solo ve/edita su propia fila.
create policy "own row select" on public.lf_state
  for select to authenticated
  using (id = auth.uid()::text);

create policy "own row insert" on public.lf_state
  for insert to authenticated
  with check (id = auth.uid()::text);

create policy "own row update" on public.lf_state
  for update to authenticated
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

create policy "own row delete" on public.lf_state
  for delete to authenticated
  using (id = auth.uid()::text);
