-- Two-way ratings: a seller can now rate the buyer too, not just the other way
-- around — closing the trust loop in both directions, which matters more now
-- that live location sharing puts two strangers in the same place together.
-- `reviews.seller_id` (always "the person being rated") is renamed `subject_id`
-- since that person can now be either side of the deal; direction is derived
-- from the conversation each time, never stored redundantly.

drop view public.seller_ratings;

alter table public.reviews rename column seller_id to subject_id;

-- One review per person per conversation, not one review per conversation —
-- both sides can now leave one.
alter table public.reviews drop constraint reviews_conversation_id_key;
alter table public.reviews add constraint reviews_conversation_reviewer_key unique (conversation_id, reviewer_id);

drop policy "reviews_insert_buyer_only" on public.reviews;

create policy "reviews_insert_participant" on public.reviews
  for insert
  with check (
    reviewer_id = (select auth.uid())
    and reviewer_id <> subject_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          (c.buyer_id = (select auth.uid()) and c.seller_id = subject_id)
          or (c.seller_id = (select auth.uid()) and c.buyer_id = subject_id)
        )
    )
  );

-- Reputation as a seller: only reviews left on someone *while they were the
-- seller side* of that conversation. Same output columns as before the
-- rename, so nothing downstream (store/remote-listings.ts) needs to change.
create view public.seller_ratings
  with (security_invoker = true) as
select r.subject_id as seller_id, round(avg(r.rating)::numeric, 1) as avg_rating, count(*)::int as review_count
from public.reviews r
join public.conversations c on c.id = r.conversation_id
where r.subject_id = c.seller_id
group by r.subject_id;

grant select on public.seller_ratings to authenticated, anon;

-- Reputation as a buyer: the mirror — for a seller deciding whether to accept
-- an offer or meet someone.
create view public.buyer_ratings
  with (security_invoker = true) as
select r.subject_id as buyer_id, round(avg(r.rating)::numeric, 1) as avg_rating, count(*)::int as review_count
from public.reviews r
join public.conversations c on c.id = r.conversation_id
where r.subject_id = c.buyer_id
group by r.subject_id;

grant select on public.buyer_ratings to authenticated, anon;
