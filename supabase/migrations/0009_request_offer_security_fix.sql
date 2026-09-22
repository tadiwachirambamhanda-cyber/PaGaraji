-- accept_request_offer was reachable by the anonymous (signed-out) role via
-- Postgres' default PUBLIC execute grant, and its ownership check used `<>`
-- against auth.uid() — which is NULL for a signed-out caller, so `v_buyer_id <>
-- NULL` evaluates to NULL, and `IF NULL THEN` is treated as false in plpgsql. That
-- would have let the exception fall through unraised for an anonymous request.
-- Fixed here: explicit revoke, and a NULL-safe ownership comparison.

revoke execute on function public.accept_request_offer(uuid) from public;
revoke execute on function public.accept_request_offer(uuid) from anon;
grant execute on function public.accept_request_offer(uuid) to authenticated;

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

  if auth.uid() is null or v_buyer_id is distinct from auth.uid() then
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
