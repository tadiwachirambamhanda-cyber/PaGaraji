-- InDrive shows an upfront fare estimate before you name your price; the closest
-- honest equivalent here is a market range from what similar requests actually
-- closed at. Not `security_invoker`, same reasoning as seller_offer_stats: RLS on
-- request_offers would undercount for anyone not personally involved in those
-- deals. Only exposes a category-level min/max/avg — no buyer, seller, or
-- individual request is identifiable from it.
create view public.category_price_stats as
select
  r.category_id,
  count(*)::int as deal_count,
  min(o.price)::numeric as min_price,
  max(o.price)::numeric as max_price,
  round(avg(o.price)::numeric, 0) as avg_price
from public.request_offers o
join public.requests r on r.id = o.request_id
where o.status = 'accepted' and r.category_id <> ''
group by r.category_id
-- A floor so a category with one or two closed deals never reads as a firm range.
having count(*) >= 3;

grant select on public.category_price_stats to authenticated, anon;
