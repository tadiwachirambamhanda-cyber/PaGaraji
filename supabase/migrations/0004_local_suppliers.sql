-- Suppliers can now also be based in Zimbabwe (a bulk local wholesaler), not just Dubai/China.
-- Their listings still post as origin='Local' (already unrestricted), so this only widens who
-- can hold an approved supplier row and therefore earn the Verified tag.
alter table public.suppliers drop constraint if exists suppliers_country_check;
alter table public.suppliers add constraint suppliers_country_check check (country in ('Dubai', 'China', 'Zimbabwe'));

-- Verified status must be checkable by anyone reading listings, but `suppliers` itself only lets
-- an applicant read their own row. This view exposes just enough (via the view owner's
-- privileges, which are not subject to the suppliers RLS) for the "Verified supplier" tag to work
-- for everyone, without exposing an applicant's WhatsApp number or pending status.
create view public.verified_suppliers as
  select user_id, business, country from public.suppliers where status = 'approved';
grant select on public.verified_suppliers to anon, authenticated;
