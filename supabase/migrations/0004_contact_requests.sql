-- Inbound marketing enquiries. Separate table from support_tickets: a ticket
-- belongs to a signed-in user, a contact request comes from a stranger.
create table if not exists public.contact_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text not null default '',
  interest   text not null default '',
  message    text not null default '',
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

-- The form is public, so anon may INSERT. It may not read: without this split
-- the contact form would double as a scraper for every lead in the table.
drop policy if exists contact_insert on public.contact_requests;
create policy contact_insert on public.contact_requests for insert
  to anon, authenticated with check (true);

drop policy if exists contact_select on public.contact_requests;
create policy contact_select on public.contact_requests for select
  using (public.is_admin());

drop policy if exists contact_update on public.contact_requests;
create policy contact_update on public.contact_requests for update
  using (public.is_admin()) with check (public.is_admin());
