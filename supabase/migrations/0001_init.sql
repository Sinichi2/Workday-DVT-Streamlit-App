-- Valigo — initial schema, RLS and storage.
--
-- Tenancy model: a WORKSPACE is the unit of ownership. Every run, finding and
-- ticket belongs to exactly one workspace, and access is decided by the
-- caller's membership row. `profiles.role = 'admin'` is a platform-wide
-- override for Valigo staff, not a workspace role.
--
-- Safe to re-run: everything is IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

do $$ begin create type app_role as enum ('subscriber', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type workspace_role as enum ('owner', 'editor', 'viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type severity as enum ('critical', 'high', 'medium', 'low'); exception when duplicate_object then null; end $$;
do $$ begin create type run_status as enum ('running', 'complete', 'failed'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_status as enum ('open', 'pending', 'resolved'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_priority as enum ('Low', 'Normal', 'High', 'Urgent'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- tables

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  first_name   text not null default '',
  last_name    text not null default '',
  job_title    text not null default '',
  timezone     text not null default 'America/New_York (EST)',
  date_format  text not null default 'MM/DD/YYYY',
  role         app_role not null default 'subscriber',
  -- Notification switches. A jsonb blob because the UI owns the list and the
  -- database has no opinion about which keys exist.
  notify       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists public.workspaces (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  go_live_date       date,
  minimum_score      numeric(5,2) not null default 95,
  -- Criticals are Workday hard stops; >0 is a deliberate decision to ship rows
  -- that will fail to load, so it defaults to zero.
  critical_tolerance integer not null default 0 check (critical_tolerance >= 0),
  created_by         uuid not null references public.profiles(id) on delete restrict,
  created_at         timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         workspace_role not null default 'viewer',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.runs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  created_by    uuid not null references public.profiles(id) on delete restrict,
  -- Object key in the `source-files` bucket. The file itself never lands in a
  -- column; the engine is stateless and reads it back from storage.
  source_path   text,
  source_name   text not null,
  status        run_status not null default 'running',
  rules_used    text not null default 'bundled_workday_hcm',
  total_rows    integer not null default 0,
  rows_passing  integer not null default 0,
  rows_failing  integer not null default 0,
  -- Derived server-side from rows_passing/total_rows so a client cannot claim a
  -- score its own findings contradict.
  quality_score numeric(5,2) generated always as (
    case when total_rows > 0 then round(rows_passing::numeric * 100 / total_rows, 2) else 0 end
  ) stored,
  error_message text,
  created_at    timestamptz not null default now()
);

create index if not exists runs_workspace_created_idx on public.runs (workspace_id, created_at desc);

create table if not exists public.findings (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.runs(id) on delete cascade,
  row_num       integer not null,
  field         text not null,
  rule_id       text,
  current_value text,
  issue         text not null,
  severity      severity not null,
  suggested_fix text,
  -- Manual remediation. `fixed_value` null means untouched — the Fix Manually
  -- screen derives "fixed" from this being present, not a separate flag.
  fixed_value   text,
  fixed_at      timestamptz,
  fixed_by      uuid references public.profiles(id) on delete set null
);

create index if not exists findings_run_idx on public.findings (run_id);

create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  subject      text not null,
  description  text not null default '',
  priority     ticket_priority not null default 'Normal',
  status       ticket_status not null default 'open',
  -- Snapshot of the session the user was in, captured at submit time. Kept as
  -- sent rather than re-derived later, when the workspace may have moved on.
  context      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists tickets_status_idx on public.support_tickets (status, created_at desc);

-- Help Center content, admin-authored.
create table if not exists public.help_articles (
  slug       text primary key,
  category   text not null,
  title      text not null,
  blurb      text not null default '',
  minutes    integer not null default 1,
  -- [{ strong?: string, text: string }] — the block shape the reader renders.
  body       jsonb not null default '[]'::jsonb,
  icon       text,
  position   integer not null default 0,
  published  boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.help_faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  position   integer not null default 0,
  published  boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers
-- SECURITY DEFINER so a policy can read membership without recursing back
-- through the very policy being evaluated. search_path is pinned: a definer
-- function that resolves names against the caller's path is a privilege hole.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- A signup must produce a profile row, and doing it here means it happens even
-- when the user is created outside our sign-up form (invite, OAuth, dashboard).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Whoever creates a workspace is its owner. Without this the creator would be
-- locked out by the very policies that protect it.
create or replace function public.handle_new_workspace()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- ---------------------------------------------------------------- RLS

alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.runs              enable row level security;
alter table public.findings          enable row level security;
alter table public.support_tickets   enable row level security;
alter table public.help_articles     enable row level security;
alter table public.help_faqs         enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- workspaces
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces for select
  using (public.is_member(id) or public.is_admin());

drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert on public.workspaces for insert
  with check (created_by = auth.uid());

drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces for update
  using (public.is_owner(id) or public.is_admin())
  with check (public.is_owner(id) or public.is_admin());

drop policy if exists workspaces_delete on public.workspaces;
create policy workspaces_delete on public.workspaces for delete
  using (public.is_owner(id) or public.is_admin());

-- workspace_members
drop policy if exists members_select on public.workspace_members;
create policy members_select on public.workspace_members for select
  using (public.is_member(workspace_id) or public.is_admin());

drop policy if exists members_write on public.workspace_members;
create policy members_write on public.workspace_members for all
  using (public.is_owner(workspace_id) or public.is_admin())
  with check (public.is_owner(workspace_id) or public.is_admin());

-- runs
drop policy if exists runs_select on public.runs;
create policy runs_select on public.runs for select
  using (public.is_member(workspace_id) or public.is_admin());

drop policy if exists runs_insert on public.runs;
create policy runs_insert on public.runs for insert
  with check (public.can_edit(workspace_id) and created_by = auth.uid());

drop policy if exists runs_update on public.runs;
create policy runs_update on public.runs for update
  using (public.can_edit(workspace_id) or public.is_admin())
  with check (public.can_edit(workspace_id) or public.is_admin());

drop policy if exists runs_delete on public.runs;
create policy runs_delete on public.runs for delete
  using (public.is_owner(workspace_id) or public.is_admin());

-- findings: reachable only through their run's workspace.
drop policy if exists findings_select on public.findings;
create policy findings_select on public.findings for select
  using (exists (
    select 1 from public.runs r
    where r.id = run_id and (public.is_member(r.workspace_id) or public.is_admin())
  ));

drop policy if exists findings_write on public.findings;
create policy findings_write on public.findings for all
  using (exists (
    select 1 from public.runs r
    where r.id = run_id and (public.can_edit(r.workspace_id) or public.is_admin())
  ))
  with check (exists (
    select 1 from public.runs r
    where r.id = run_id and (public.can_edit(r.workspace_id) or public.is_admin())
  ));

-- support tickets
drop policy if exists tickets_select on public.support_tickets;
create policy tickets_select on public.support_tickets for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists tickets_insert on public.support_tickets;
create policy tickets_insert on public.support_tickets for insert
  with check (user_id = auth.uid());

-- Only staff change status; a reporter must not be able to close their own
-- ticket out from under the queue.
drop policy if exists tickets_update on public.support_tickets;
create policy tickets_update on public.support_tickets for update
  using (public.is_admin()) with check (public.is_admin());

-- help content: everyone signed in reads what's published; admins write.
drop policy if exists articles_select on public.help_articles;
create policy articles_select on public.help_articles for select
  using (published or public.is_admin());

drop policy if exists articles_write on public.help_articles;
create policy articles_write on public.help_articles for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists faqs_select on public.help_faqs;
create policy faqs_select on public.help_faqs for select
  using (published or public.is_admin());

drop policy if exists faqs_write on public.help_faqs;
create policy faqs_write on public.help_faqs for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public)
values ('source-files', 'source-files', false)
on conflict (id) do nothing;

-- Object keys are `<workspace_id>/<run_id>/<filename>`, so the first path
-- segment decides who may touch the file. Private bucket: reads go through a
-- signed URL, never a public link — these are HR extracts.
drop policy if exists source_files_read on storage.objects;
create policy source_files_read on storage.objects for select
  using (
    bucket_id = 'source-files'
    and (public.is_member((storage.foldername(name))[1]::uuid) or public.is_admin())
  );

drop policy if exists source_files_write on storage.objects;
create policy source_files_write on storage.objects for insert
  with check (
    bucket_id = 'source-files'
    and public.can_edit((storage.foldername(name))[1]::uuid)
  );

drop policy if exists source_files_delete on storage.objects;
create policy source_files_delete on storage.objects for delete
  using (
    bucket_id = 'source-files'
    and (public.is_owner((storage.foldername(name))[1]::uuid) or public.is_admin())
  );
