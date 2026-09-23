-- InDrive shows a driver's acceptance rate as a trust signal before you ride with
-- them; the closest honest equivalent here — sellers don't accept/decline (buyers
-- do) — is how fast a seller typically jumps on a new request, and how often
-- their offers actually win. Not `security_invoker`, same reasoning as
-- verified_suppliers: `request_offers` RLS only lets a caller see rows they're
-- personally party to, so an invoker-mode view would undercount every other
-- seller's stats down to zero for anyone but themselves. Only exposes aggregate
-- counts/averages per seller, never another buyer's price or message.
create view public.seller_offer_stats as
select
  o.seller_id,
  count(*)::int as offers_made,
  round(avg(extract(epoch from (o.created_at - r.created_at)) / 60)::numeric, 0)::int as avg_response_minutes,
  count(*) filter (where o.status in ('accepted', 'declined', 'cancelled'))::int as offers_decided,
  count(*) filter (where o.status = 'accepted')::int as offers_won
from public.request_offers o
join public.requests r on r.id = o.request_id
group by o.seller_id
-- A floor so one lucky/unlucky early offer never reads as a firm stat.
having count(*) >= 3;

grant select on public.seller_offer_stats to authenticated, anon;
