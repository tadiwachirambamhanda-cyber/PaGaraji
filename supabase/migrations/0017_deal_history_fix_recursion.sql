-- 0016's new policy on `requests` queried `request_offers` directly, but
-- `request_offers`' own select policy queries back into `requests` — Postgres
-- detected the cycle ("infinite recursion detected in policy for relation
-- requests", 42P17) the moment a real request was created. Fixed the same way
-- accept_request_offer already safely reads both tables: a security-definer
-- function, whose internal query runs as the function owner and so doesn't
-- re-trigger RLS on request_offers, breaking the cycle.
drop policy "requests: seller reads via accepted offer" on public.requests;

create or replace function public.has_accepted_offer(p_request_id uuid, p_seller_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.request_offers o
    where o.request_id = p_request_id and o.seller_id = p_seller_id and o.status = 'accepted'
  );
$$;

revoke all on function public.has_accepted_offer(uuid, uuid) from public;
revoke execute on function public.has_accepted_offer(uuid, uuid) from anon;
grant execute on function public.has_accepted_offer(uuid, uuid) to authenticated;

create policy "requests: seller reads via accepted offer" on public.requests
  for select
  to authenticated
  using (public.has_accepted_offer(requests.id, (select auth.uid())));
