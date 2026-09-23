-- request_offers was never added to the supabase_realtime publication (unlike messages and
-- location_shares) — meaning the app's own postgres_changes subscriptions on this table would
-- silently receive nothing at all, regardless of RLS. Live updates over Realtime, same pattern
-- as messages: sealed-bid RLS already restricts what any one subscriber gets delivered (the
-- request's owner sees every offer, a seller sees only their own), so this only exposes what
-- each caller could already read via a plain select.
alter publication supabase_realtime add table public.request_offers;
