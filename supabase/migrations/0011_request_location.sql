-- Lets a buyer drop a precise pin when posting a request, instead of only
-- picking a city. Nullable — falls back to the city-level jitter on the map
-- (see data/city-coordinates.ts) when absent, same as before this migration.
alter table public.requests add column if not exists latitude double precision
  check (latitude is null or (latitude between -90 and 90));
alter table public.requests add column if not exists longitude double precision
  check (longitude is null or (longitude between -180 and 180));
