import { supabase } from '@/lib/supabase';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * The shared shape behind every "keep this list/badge live" feature (Chats' unread count,
 * Requests' pending-offer counts, ...): a single module-level Realtime subscription that just
 * re-runs one refresh function whenever anything changes on a table, rather than trying to
 * patch individual rows client-side. RLS already scopes what any one subscriber actually
 * receives, so this stays effectively a no-op for changes that don't involve them.
 *
 * Subscribing has to wait for a real, signed-in auth event — a channel subscribed before the
 * saved session finishes restoring from storage connects to Realtime as an anonymous client and
 * silently never receives anything, even once the session loads. Call `subscribe`/`unsubscribe`
 * from an `onAuthStateChange` callback (see store/conversations.ts or store/remote-requests.ts
 * for the wiring), not at module load.
 */
export function createTableActivitySubscriber(channelName: string, table: string, event: RealtimeEvent, onChange: () => void) {
  let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

  function subscribe() {
    if (!supabase || channel) return;
    channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event, schema: 'public', table }, onChange)
      .subscribe();
  }

  function unsubscribe() {
    if (!supabase || !channel) return;
    supabase.removeChannel(channel);
    channel = null;
  }

  return { subscribe, unsubscribe };
}
