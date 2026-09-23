-- Listings expose a WhatsApp button because `listings.seller_phone` is copied out of
-- `profile_contacts` at posting time specifically to be publicly contactable — but a
-- request-based deal (the InDrive-style bidding flow) has no such column anywhere, so
-- its chat threads never got a WhatsApp button at all, only in-app chat. `profile_contacts`
-- itself is intentionally locked to `user_id = auth.uid()` (a phone number isn't public by
-- default), so the fix isn't to read it directly — it's a narrow, participant-scoped lookup
-- of *just* the other person's number, mirroring the auth pattern the cancel/complete-match
-- functions already use rather than touching `profile_contacts`'s RLS or the `my_conversations`
-- view (both deliberately left alone).
create or replace function public.conversation_contact_phone(p_conversation_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_seller_id uuid;
  v_other_id uuid;
  v_phone text;
begin
  select c.buyer_id, c.seller_id into v_buyer_id, v_seller_id
  from public.conversations c
  where c.id = p_conversation_id;

  if v_buyer_id is null then
    return null;
  end if;

  if auth.uid() is null or (auth.uid() is distinct from v_buyer_id and auth.uid() is distinct from v_seller_id) then
    raise exception 'Only a participant in this conversation can look up the other person''s number';
  end if;

  v_other_id := case when auth.uid() = v_buyer_id then v_seller_id else v_buyer_id end;

  select pc.whatsapp into v_phone from public.profile_contacts pc where pc.user_id = v_other_id;

  return nullif(v_phone, '');
end;
$$;

revoke all on function public.conversation_contact_phone(uuid) from public;
revoke execute on function public.conversation_contact_phone(uuid) from anon;
grant execute on function public.conversation_contact_phone(uuid) to authenticated;
