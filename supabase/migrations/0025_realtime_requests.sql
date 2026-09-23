-- Same gap as request_offers before migration 0024: requests was never added to the
-- supabase_realtime publication, so the request detail screen's own status Stamp
-- (Open/Matched/Closed) couldn't live-update the way the offers list now does — a buyer
-- watching their offers arrive live still wouldn't see the Stamp itself flip to MATCHED the
-- moment they accept, only on a later navigation or refreshAll(). RLS already scopes what any
-- one subscriber is delivered (same "browse open" / "seller reads via accepted offer" policies
-- a plain select already goes through), so this only exposes what each caller could already read.
alter publication supabase_realtime add table public.requests;
