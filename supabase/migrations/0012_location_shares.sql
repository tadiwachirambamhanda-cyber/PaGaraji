-- Live location sharing, scoped to a conversation. Opt-in per person, per thread:
-- sharing your location in one chat never shares it in another, and either side
-- can stop at any time. A row existing IS the "I'm sharing" state — no separate
-- boolean to fall out of sync with. Rows expire on their own (see expires_at)
-- so a forgotten share doesn't linger forever if someone just closes the app.
create table public.location_shares (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  primary key (conversation_id, user_id)
);

alter table public.location_shares enable row level security;

-- Only the two people in the conversation can see either side's shared location.
create policy "location shares: participants read" on public.location_shares
  for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

-- You can only ever start, update, or stop sharing *your own* location, and only
-- in a conversation you're actually part of.
create policy "location shares: own only" on public.location_shares
  for all
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

grant select, insert, update, delete on public.location_shares to authenticated;

-- Live updates over Realtime, same pattern as messages.
alter publication supabase_realtime add table public.location_shares;
