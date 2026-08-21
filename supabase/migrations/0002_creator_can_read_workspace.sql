-- RLS evaluates the SELECT policy on `insert ... returning` BEFORE the
-- AFTER-INSERT trigger writes the membership row. So a creator could insert a
-- workspace and then be refused the row back — the client saw null and every
-- downstream write (runs, uploads) silently no-opped.
--
-- Creator-based access doesn't depend on trigger ordering, so it closes the gap
-- without weakening membership checks.
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces for select
  using (created_by = auth.uid() or public.is_member(id) or public.is_admin());
