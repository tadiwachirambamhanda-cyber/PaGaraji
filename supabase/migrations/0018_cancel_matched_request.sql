-- Lets either side back out of a Matched request whose deal fell through —
-- InDrive's ride cancellation, applied to a stalled parts deal. Reopens the
-- request for new offers rather than leaving it stuck Matched forever with no
-- way back except deleting and reposting.

alter table public.request_offers drop constraint request_offers_status_check;
alter table public.request_offers add constraint request_offers_status_check
  check (status = any (array['pending', 'countered', 'accepted', 'declined', 'withdrawn', 'cancelled']));

create or replace function public.cancel_matched_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_status text;
  v_matched_offer_id uuid;
  v_seller_id uuid;
begin
  select r.user_id, r.status, r.matched_offer_id
    into v_buyer_id, v_status, v_matched_offer_id
  from public.requests r
  where r.id = p_request_id;

  if v_buyer_id is null then
    raise exception 'Request not found';
  end if;

  if v_status is distinct from 'Matched' or v_matched_offer_id is null then
    raise exception 'This request isn''t matched';
  end if;

  select o.seller_id into v_seller_id from public.request_offers o where o.id = v_matched_offer_id;

  if auth.uid() is null or (auth.uid() is distinct from v_buyer_id and auth.uid() is distinct from v_seller_id) then
    raise exception 'Only the buyer or seller in this deal can cancel it';
  end if;

  update public.request_offers set status = 'cancelled' where id = v_matched_offer_id;
  update public.requests set status = 'Open', matched_offer_id = null where id = p_request_id;
end;
$$;

revoke all on function public.cancel_matched_request(uuid) from public;
revoke execute on function public.cancel_matched_request(uuid) from anon;
grant execute on function public.cancel_matched_request(uuid) to authenticated;
