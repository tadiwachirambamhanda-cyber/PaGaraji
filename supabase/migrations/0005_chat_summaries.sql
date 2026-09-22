-- Real-time chat: a conversation can now remember which listing it started from (for context
-- in the header — "About: Brake Pads"), and a view gives the Chats list everything it needs
-- (the other person's name, the last message, and how many are unread) in one query.

alter table public.conversations
  add column if not exists listing_id uuid references public.listings (id) on delete set null;

-- security_invoker: this view doesn't need to see anything the querying user couldn't already
-- see directly — conversations/messages RLS already restricts to participants, profiles are
-- public, and listings are public unless sold by someone else. Unlike verified_suppliers, no
-- bypass is needed here, so ordinary RLS keeps doing the real work; the WHERE clause below is
-- belt-and-braces on top of it.
create view public.my_conversations
  with (security_invoker = true) as
select
  c.id,
  c.listing_id,
  c.created_at,
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
