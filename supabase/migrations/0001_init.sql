-- PaGaraji: initial schema.
-- Every table has Row Level Security on. Nothing is readable or writable unless a policy below allows it.
-- In policies, `(select auth.uid())` is used instead of `auth.uid()` so Postgres evaluates it once per query.

-- ---------------------------------------------------------------------------
-- Profiles: name and city are public (they appear on listings and in chats).
-- The WhatsApp number is NOT here: it lives in profile_contacts, visible only to its owner.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  city text not null default 'Harare',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: anyone can read" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create table public.profile_contacts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  whatsapp text not null default '' check (whatsapp = '' or whatsapp ~ '^[0-9]{9,15}$')
);

alter table public.profile_contacts enable row level security;

create policy "profile contacts: own" on public.profile_contacts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A profile row is created automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

-- Only the sign-up trigger should run this, never a client.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Suppliers: applications from Dubai / China sellers.
-- Users can apply and edit while pending or rejected. Only you (dashboard / service role)
-- can approve, which is what unlocks import listings and the Verified tag.
-- ---------------------------------------------------------------------------
create table public.suppliers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business text not null check (char_length(business) between 2 and 120),
  country text not null check (country in ('Dubai', 'China')),
  city text not null,
  category_id text not null,
  lead_time text not null,
  whatsapp text not null check (whatsapp ~ '^[0-9]{9,15}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

create policy "suppliers: read own" on public.suppliers
  for select to authenticated using (user_id = (select auth.uid()));
create policy "suppliers: apply" on public.suppliers
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy "suppliers: edit while not approved" on public.suppliers
  for update to authenticated
  using (user_id = (select auth.uid()) and status <> 'approved')
  with check (user_id = (select auth.uid()) and status = 'pending');

-- ---------------------------------------------------------------------------
-- Listings: public to read (sold ones only for the seller).
-- Only the seller can change or delete their own. Import listings need an approved supplier.
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  seller_name text not null,
  seller_phone text not null default '',
  category_id text not null,
  title text not null check (char_length(title) between 2 and 120),
  fitment text not null check (char_length(fitment) between 2 and 200),
  price numeric(10, 2) not null check (price > 0),
  condition text not null check (condition in ('New', 'Used', 'Refurb')),
  origin text not null check (origin in ('Local', 'Dubai', 'China')),
  location text not null,
  lead_time text not null,
  description text not null default '',
  photos text[] not null default '{}',
  sold boolean not null default false,
  created_at timestamptz not null default now()
);

create index listings_created_at_idx on public.listings (created_at desc);
create index listings_seller_idx on public.listings (seller_id);

alter table public.listings enable row level security;

create policy "listings: read live or own" on public.listings
  for select to anon, authenticated
  using (sold = false or seller_id = (select auth.uid()));

create policy "listings: post" on public.listings
  for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and (
      origin = 'Local'
      or exists (
        select 1 from public.suppliers s
        where s.user_id = (select auth.uid()) and s.status = 'approved' and s.country = listings.origin
      )
    )
  );

create policy "listings: edit own" on public.listings
  for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (
    seller_id = (select auth.uid())
    and (
      origin = 'Local'
      or exists (
        select 1 from public.suppliers s
        where s.user_id = (select auth.uid()) and s.status = 'approved' and s.country = listings.origin
      )
    )
  );

create policy "listings: delete own" on public.listings
  for delete to authenticated using (seller_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Requests: "I'm looking for this part". Private to the buyer for now.
-- ---------------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  part_name text not null check (char_length(part_name) between 2 and 120),
  vehicle text not null default '',
  source text not null check (source in ('Any', 'Local', 'Import')),
  category_id text not null,
  notes text not null default '',
  photos text[] not null default '{}',
  status text not null default 'Open' check (status in ('Open', 'Closed')),
  created_at timestamptz not null default now()
);

create index requests_user_idx on public.requests (user_id, created_at desc);

alter table public.requests enable row level security;

create policy "requests: own" on public.requests
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Saved listings (the hearts).
-- ---------------------------------------------------------------------------
create table public.saved_listings (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index saved_listings_listing_idx on public.saved_listings (listing_id);

alter table public.saved_listings enable row level security;

create policy "saved: own" on public.saved_listings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Conversations and messages: one thread per buyer and seller pair.
-- Only the two people in a thread can read it or write to it.
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users (id) on delete cascade,
  seller_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  unique (buyer_id, seller_id)
);

create index conversations_seller_idx on public.conversations (seller_id);

alter table public.conversations enable row level security;

create policy "conversations: participants read" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

create policy "conversations: buyer starts" on public.conversations
  for insert to authenticated
  with check (buyer_id = (select auth.uid()));

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_thread_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

alter table public.messages enable row level security;

create policy "messages: participants read" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

create policy "messages: participants send" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

-- The recipient can mark messages read, and nothing else about a message can be edited.
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

create policy "messages: recipient marks read" on public.messages
  for update to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

-- Live updates for chat.
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- Photo storage. listing-photos is public to read; request-photos is private.
-- Each person can only upload into, and delete from, a folder named after their user id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true), ('request-photos', 'request-photos', false)
on conflict (id) do nothing;

create policy "listing photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "listing photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "request photos: own only" on storage.objects
  for all to authenticated
  using (bucket_id = 'request-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'request-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
