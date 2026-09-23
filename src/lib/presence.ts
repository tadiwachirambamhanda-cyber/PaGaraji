import { supabase } from '@/lib/supabase';

const PING_INTERVAL_MS = 2 * 60 * 1000;

let lastPingedAt = 0;

/** Marks you active-right-now, throttled so a burst of refreshes doesn't spam the update. */
export async function pingPresence(): Promise<void> {
  if (!supabase) return;
  const now = Date.now();
  if (now - lastPingedAt < PING_INTERVAL_MS) return;
  lastPingedAt = now;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', userId);
}

/** "Active now" inside 5 minutes, then a relative time, then nothing once it's stale (>48h). */
export function presenceLabel(lastActiveAt: number | undefined, now: number = Date.now()): string | null {
  if (lastActiveAt === undefined) return null;
  const minutes = Math.floor((now - lastActiveAt) / 60000);
  if (minutes < 5) return 'Active now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Active ${hours}h ago`;
  return null;
}
