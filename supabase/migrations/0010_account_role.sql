-- Buyer/seller role: shapes onboarding and the app's default landing experience for
-- someone, not a hard technical wall — a "seller" can still post a request, a "buyer"
-- can still list a part. Everything that already works keeps working either way.
alter table public.profiles add column if not exists role text not null default 'buyer'
  check (role = any (array['buyer', 'seller']));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 80),
    case when new.raw_user_meta_data ->> 'role' = 'seller' then 'seller' else 'buyer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
