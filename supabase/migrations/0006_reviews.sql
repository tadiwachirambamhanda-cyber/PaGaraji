-- Reviews: one per conversation, left by the buyer about the seller, aggregated
-- into a public rating shown on the seller's listings.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  seller_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (conversation_id)
);

alter table public.reviews enable row level security;

-- Ratings are a public trust signal, same spirit as verified_suppliers.
create policy "reviews_select_all" on public.reviews
  for select using (true);

-- Only the buyer side of a conversation can rate that seller, and only as themselves.
create policy "reviews_insert_buyer_only" on public.reviews
  for insert
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.buyer_id = (select auth.uid())
        and c.seller_id = reviews.seller_id
    )
  );

create policy "reviews_update_own" on public.reviews
  for update using (reviewer_id = (select auth.uid()))
  with check (reviewer_id = (select auth.uid()));

create policy "reviews_delete_own" on public.reviews
  for delete using (reviewer_id = (select auth.uid()));

grant select, insert, update, delete on public.reviews to authenticated;

-- Public per-seller aggregate. security_invoker is safe here: reviews are already
-- publicly selectable via RLS above, so no elevated privileges are needed to read them.
create view public.seller_ratings
  with (security_invoker = true) as
select
  seller_id,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(*)::int as review_count
from public.reviews
group by seller_id;

grant select on public.seller_ratings to authenticated, anon;

-- The "Rate this seller" prompt needs to know which side of a conversation the
-- viewer is on. Dropped and recreated (rather than CREATE OR REPLACE) since the
-- new column isn't at the end of the existing column list.
drop view public.my_conversations;

create view public.my_conversations
  with (security_invoker = true) as
select
  c.id,
  c.listing_id,
  c.created_at,
  c.buyer_id = (select auth.uid()) as is_buyer,
  case when c.buyer_id = (select auth.uid()) then c.seller_id else c.buyer_id end as other_user_id,
  p.name as other_name,
  l.title as listing_title,
  l.seller_phone as listing_seller_phone,
  lm.body as last_message,
  lm.created_at as last_message_at,
  lm.sender_id as last_message_sender_id,
  coalesce(uc.unread_count, 0) as unread_count
from public.conversations c
join public.profiles p on p.id = (case when c.buyer_id = (select auth.uid()) then c.seller_id else c.buyer_id end)
left join public.listings l on l.id = c.listing_id
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
