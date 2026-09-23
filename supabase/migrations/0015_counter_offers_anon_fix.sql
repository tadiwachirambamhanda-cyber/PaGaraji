-- 0014 only revoked from PUBLIC, but this project grants execute on new functions to
-- anon and authenticated by default (the exact gap 0009 already fixed once for
-- accept_request_offer) — the advisor caught both new functions still callable
-- by a signed-out anon caller. Both functions already reject a null auth.uid()
-- via `is distinct from`, so this was defense in depth, not an active exploit, but
-- close it explicitly anyway rather than rely on that alone.
revoke execute on function public.counter_request_offer(uuid, numeric) from anon;
revoke execute on function public.respond_to_counter_offer(uuid, boolean) from anon;
