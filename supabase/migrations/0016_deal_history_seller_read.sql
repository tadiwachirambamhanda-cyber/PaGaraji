-- Deal history needs a seller to be able to look back at a request they closed —
-- but "requests: browse open" only shows non-owners a request while it's still
-- Open, and a Matched request has moved past that. Scope the exception tight:
-- only when the caller genuinely has an accepted offer on that exact request,
-- not a blanket "sellers can see any matched request".
create policy "requests: seller reads via accepted offer" on public.requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.request_offers o
      where o.request_id = requests.id and o.seller_id = (select auth.uid()) and o.status = 'accepted'
    )
  );
