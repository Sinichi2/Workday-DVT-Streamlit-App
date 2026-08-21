-- PRIVILEGE ESCALATION FIX.
--
-- `profiles_update` has to let a user edit their own profile (the Settings
-- page), but RLS grants are row-level, not column-level: "you may update this
-- row" also meant "you may set role='admin' on this row". A subscriber could
-- promote themselves, and from that point every is_admin() check in every other
-- policy passed — tickets, help content, other tenants' data.
--
-- WITH CHECK cannot see OLD, so a policy can't express "this column may not
-- change". A BEFORE UPDATE trigger can, and it holds no matter which client
-- issues the update.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- A null auth.uid() means service_role or a direct DB session; both already
  -- bypass RLS, so guarding them here would only break admin tooling. RLS
  -- itself denies anonymous callers, so this is not a gap.
  --
  -- is_admin() reads the COMMITTED role, so an admin editing their own row is
  -- still an admin here, and a self-promotion in this very statement is not.
  if auth.uid() is not null and not public.is_admin() then
    new.role  := old.role;   -- staff-only
    new.email := old.email;  -- identity belongs to auth.users
    new.id    := old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();
