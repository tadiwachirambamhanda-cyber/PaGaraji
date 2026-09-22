-- InDrive-style sourcing: a buyer posts a request with an optional asking price,
-- it's visible to any seller while open, sellers respond with a price offer, the
-- buyer accepts one and it becomes a chat.

-- The buyer's proposed price, and a third status for "matched, no longer bidding".
alter table public.requests add column if not exists budget numeric check (budget is null or budget > 0);
alter table public.requests drop constraint requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status = any (array['Open', 'Matched', 'Closed']));

create table public.request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  seller_id uuid not null references auth.users (id) on delete cascade,
  price numeric not null check (price > 0),
  message text not null default '' check (char_length(message) <= 500),
  -- Optional: this offer is backed by one of the seller's existing listings.
  listing_id uuid references public.listings (id) on delete set null,
  status text not null default 'pending' check (status = any (array['pending', 'accepted', 'declined', 'withdrawn'])),
  created_at timestamptz not null default now(),
  unique (request_id, seller_id)
);

alter table public.requests add column if not exists matched_offer_id uuid references public.request_offers (id) on delete set null;

alter table public.request_offers enable row level security;

-- Buyers see every offer on their own request; sellers only ever see their own —
-- competing sellers can't see each other's prices, same as a sealed bid.
create policy "offers: buyer or seller read" on public.request_offers
  for select
  using (
    seller_id = (select auth.uid())
    or exists (select 1 from public.requests r where r.id = request_id and r.user_id = (select auth.uid()))
  );

-- Anyone can offer on an Open request that isn't their own.
create policy "offers: seller creates" on public.request_offers
  for insert
  with check (
    seller_id = (select auth.uid())
    and exists (
      select 1 from public.requests r
      where r.id = request_id and r.status = 'Open' and r.user_id <> (select auth.uid())
    )
  );

-- A seller can edit or withdraw their own offer while it's still pending.
create policy "offers: seller updates own pending" on public.request_offers
  for update
  using (seller_id = (select auth.uid()) and status = 'pending')
  with check (seller_id = (select auth.uid()));

create policy "offers: seller deletes own pending" on public.request_offers
  for delete
  using (seller_id = (select auth.uid()) and status = 'pending');

grant select, insert, update, delete on public.request_offers to authenticated;

-- Anyone can browse Open requests to decide whether to bid — the existing
-- "requests: own" policy still governs insert/update/delete (owner only).
create policy "requests: browse open" on public.requests
  for select
  to authenticated
  using (status = 'Open');

-- Sellers need to see photos on a request while they're deciding whether to bid,
-- not just the owner. Read-only, and only while the request is still Open.
create policy "request photos: read while request is open" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'request-photos'
    and exists (select 1 from public.requests r where r.status = 'Open' and storage.objects.name = any (r.photos))
  );

-- Accepting an offer touches three tables atomically (the offer, its rivals, the
-- request) and starts a chat, so it's a function rather than a raw client update —
-- that also keeps a buyer from being able to edit an offer's price/message, only
-- ever its status, and only via this narrow, validated path.
create or replace function public.accept_request_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_buyer_id uuid;
  v_seller_id uuid;
  v_conversation_id uuid;
begin
  select o.request_id, r.user_id, o.seller_id
    into v_request_id, v_buyer_id, v_seller_id
  from public.request_offers o
  join public.requests r on r.id = o.request_id
  where o.id = p_offer_id and o.status = 'pending';

  if v_request_id is null then
    raise exception 'Offer not found or no longer pending';
  end if;

  if v_buyer_id <> auth.uid() then
    raise exception 'Only the person who posted the request can accept an offer';
  end if;

  update public.request_offers set status = 'accepted' where id = p_offer_id;
  update public.request_offers set status = 'declined' where request_id = v_request_id and id <> p_offer_id and status = 'pending';
  update public.requests set status = 'Matched', matched_offer_id = p_offer_id where id = v_request_id;

  select id into v_conversation_id
  from public.conversations
  where buyer_id = v_buyer_id and seller_id = v_seller_id;

  if v_conversation_id is null then
    insert into public.conversations (buyer_id, seller_id, request_id)
    values (v_buyer_id, v_seller_id, v_request_id)
    returning id into v_conversation_id;
  else
    update public.conversations set request_id = coalesce(request_id, v_request_id) where id = v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

grant execute on function public.accept_request_offer(uuid) to authenticated;

-- A chat can now start from an accepted request offer too, not just a listing.
alter table public.conversations add column if not exists request_id uuid references public.requests (id) on delete set null;

-- Rebuilt (not CREATE OR REPLACE) since the new column isn't last in the list.
drop view public.my_conversations;

create view public.my_conversations
  with (security_invoker = true) as
select
  c.id,
  c.listing_id,
  c.request_id,
  c.created_at,
  c.buyer_id = (select auth.uid()) as is_buyer,
  case when c.buyer_id = (select auth.uid()) then c.seller_id else c.buyer_id end as other_user_id,
  p.name as other_name,
  coalesce(l.title, rq.part_name) as listing_title,
  l.seller_phone as listing_seller_phone,
  lm.body as last_message,
  lm.created_at as last_message_at,
  lm.sender_id as last_message_sender_id,
  coalesce(uc.unread_count, 0) as unread_count
from public.conversations c
join public.profiles p on p.id = (case when c.buyer_id = (select auth.uid()) then c.seller_id else c.buyer_id end)
left join public.listings l on l.id = c.listing_id
left join public.requests rq on rq.id = c.request_id
left join lateral (
  select body, created_at, sender_id
  from public.messages m
  where m.conversation_id = c.id
  order by m.created_at desc
  limit 1
) lm on true
left join lateral (
  select count(*)::int as unread_count
  from public.messages m
  where m.conversation_id = c.id and m.sender_id <> (select auth.uid()) and m.read_at is null
) uc on true
where (select auth.uid()) in (c.buyer_id, c.seller_id);

grant select on public.my_conversations to authenticated;
