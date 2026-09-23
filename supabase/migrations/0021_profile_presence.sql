-- InDrive shows whether a driver is online before you trust their ETA; the
-- equivalent here is whether a seller who just offered on your request is
-- actually around right now. `profiles` already has public select + self-only
-- update (0001), so no RLS changes are needed — just the column.
alter table public.profiles add column last_active_at timestamptz;
