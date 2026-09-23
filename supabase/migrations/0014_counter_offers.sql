-- Lets a buyer counter a seller's offer instead of only accept-or-ignore it —
-- the other half of InDrive's negotiation, not just the driver-offers-a-price half
-- already built in 0008. A countered offer keeps its original `price` (the
-- seller's ask) and adds `counter_price` (the buyer's counter) so both are visible;
-- accepting a counter promotes counter_price into price, same as InDrive settling
-- on the passenger's proposed fare.

alter table public.request_offers add column counter_price numeric check (counter_price is null or counter_price > 0);

alter table public.request_offers drop constraint request_offers_status_check;
alter table public.request_offers add constraint request_offers_status_check
  check (status = any (array['pending', 'countered', 'accepted', 'declined', 'withdrawn']));

-- The buyer proposes a different price on a still-pending offer for their own
-- request. A function, not a raw update, for the same reason accept_request_offer
-- is one: keeps a buyer from touching anything but status/counter_price via this
-- one validated path, and — learned from the 0009 fix — auth checks use
-- `is distinct from` so a signed-out caller (auth.uid() null) is rejected rather
-- than silently passing a `<> null` comparison.
create or replace function public.counter_request_offer(p_offer_id uuid, p_counter_price numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
begin
  if p_counter_price is null or p_counter_price <= 0 then
    raise exception 'Counter price must be greater than zero';
  end if;

  select r.user_id into v_buyer_id
  from public.request_offers o
  join public.requests r on r.id = o.request_id
  where o.id = p_offer_id and o.status = 'pending';

  if v_buyer_id is null then
    raise exception 'Offer not found or no longer pending';
  end if;

  if v_buyer_id is distinct from auth.uid() then
    raise exception 'Only the person who posted the request can counter an offer';
  end if;

  update public.request_offers set status = 'countered', counter_price = p_counter_price where id = p_offer_id;
end;
$$;

revoke all on function public.counter_request_offer(uuid, numeric) from public;
grant execute on function public.counter_request_offer(uuid, numeric) to authenticated;

-- The seller accepts or declines the buyer's counter. Accepting mirrors
-- accept_request_offer's finalize step (decline rivals, match the request, open
-- or reuse the chat) but promotes counter_price into price first.
create or replace function public.respond_to_counter_offer(p_offer_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_buyer_id uuid;
  v_seller_id uuid;
  v_counter_price numeric;
  v_conversation_id uuid;
begin
  select o.request_id, r.user_id, o.seller_id, o.counter_price
    into v_request_id, v_buyer_id, v_seller_id, v_counter_price
  from public.request_offers o
  join public.requests r on r.id = o.request_id
  where o.id = p_offer_id and o.status = 'countered';

  if v_request_id is null then
    raise exception 'Offer not found or no longer countered';
  end if;

  if v_seller_id is distinct from auth.uid() then
    raise exception 'Only the seller who made this offer can respond to a counter';
  end if;

  if not p_accept then
    update public.request_offers set status = 'declined' where id = p_offer_id;
    return null;
  end if;

  update public.request_offers set status = 'accepted', price = v_counter_price where id = p_offer_id;
  update public.request_offers set status = 'declined' where request_id = v_request_id and id <> p_offer_id and status in ('pending', 'countered');
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

revoke all on function public.respond_to_counter_offer(uuid, boolean) from public;
grant execute on function public.respond_to_counter_offer(uuid, boolean) to authenticated;
