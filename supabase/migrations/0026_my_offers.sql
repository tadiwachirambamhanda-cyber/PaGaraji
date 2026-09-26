-- Sellers currently have no way to see every bid they've placed across different requests —
-- only Deal History (accepted offers) and whichever single request they navigate back to
-- manually. `request_offers` itself already lets a seller read their own rows (`offers: buyer
-- or seller read`), but the request info worth showing alongside each one (part name, current
-- status) is gated by `requests`'s own tighter RLS: a seller loses read access to a request the
-- moment it's no longer Open unless *their* offer is the one that got accepted (`requests:
-- seller reads via accepted offer`, migration 0016/0017) — so a declined or withdrawn offer's
-- request would silently vanish from a plain client-side join the moment someone else's bid won.
-- You should always be able to see what you bid on, regardless of how it turned out, so this
-- joins as `security definer` — but the `seller_id = auth.uid()` filter is the actual security
-- boundary, identical in spirit to `fetchMyDeals()`'s own cross-ownership read: it can only ever
-- return the caller's own offers, never anyone else's.
create or replace function public.my_offers()
returns table (
  id uuid,
  request_id uuid,
  price numeric,
  message text,
  status text,
  counter_price numeric,
  created_at timestamptz,
  part_name text,
  request_status text,
  buyer_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.id,
    o.request_id,
    o.price,
    o.message,
    o.status,
    o.counter_price,
    o.created_at,
    r.part_name,
    r.status as request_status,
    p.name as buyer_name
  from public.request_offers o
  join public.requests r on r.id = o.request_id
  left join public.profiles p on p.id = r.user_id
  where o.seller_id = auth.uid()
  order by o.created_at desc;
$$;

revoke all on function public.my_offers() from public;
revoke execute on function public.my_offers() from anon;
grant execute on function public.my_offers() to authenticated;
