-- Closes the loop InDrive's own ride lifecycle has (request -> match -> complete
-- -> rate) that PaGaraji was missing a real "complete" step for. A "Mark done"
-- button already existed on the buyer's own requests list, but it was a raw
-- client-side `.update()` relying only on RLS ownership — meaning a seller had no
-- equivalent action at all, and there was no server-side guard that the request
-- was actually Matched. Same dual-party pattern as cancel_matched_request:
-- either the buyer or the matched seller can call this, closes the request out
-- (status = 'Closed', same terminal value the existing "Mark done" already used)
-- without touching matched_offer_id or the accepted offer's own status, so the
-- deal stays fully queryable in Deal History and the seller keeps read access to
-- it via the 0016/0017 policy.
create or replace function public.complete_matched_request(p_request_id uuid)
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
    raise exception 'Only the buyer or seller in this deal can mark it complete';
  end if;

  update public.requests set status = 'Closed' where id = p_request_id;
end;
$$;

revoke all on function public.complete_matched_request(uuid) from public;
revoke execute on function public.complete_matched_request(uuid) from anon;
grant execute on function public.complete_matched_request(uuid) to authenticated;
