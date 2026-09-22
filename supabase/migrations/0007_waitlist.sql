-- Landing-page email waitlist. Public can add themselves; nobody can read the list
-- back through the API (kept private — the owner reads it via the dashboard/SQL editor).
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create policy "waitlist_insert_anyone" on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

grant insert on public.waitlist to anon, authenticated;
