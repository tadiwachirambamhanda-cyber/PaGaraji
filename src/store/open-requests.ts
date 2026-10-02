import { useSyncExternalStore } from 'react';

import { createTableActivitySubscriber } from '@/lib/realtime-activity';
import { supabase } from '@/lib/supabase';
import { fromRow, type RequestRow } from '@/store/remote-requests';
import type { PartRequest } from '@/store/my-requests';

let openRequests: PartRequest[] = [];
let hydrated = supabase === null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * The InDrive-style bidding feed: other people's Open requests, to make an offer on.
 * Your own requests never show up here — see `useMyRequests` for those.
 */
export async function refreshOpenRequests(): Promise<void> {
  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    openRequests = [];
    hydrated = true;
    emitChange();
    return;
  }
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('status', 'Open')
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  hydrated = true;
  if (error || !data) {
    emitChange();
    return;
  }
  openRequests = (data as RequestRow[]).map(fromRow);
  emitChange();
}

// Keeps the browse feed (and the seller-demand match count derived from it) live — a newly
// posted request, or one reopened after a cancelled match, shows up without waiting for a
// manual refresh. `requests` was added to the supabase_realtime publication in migration 0025.
const { subscribe: subscribeToOpenRequestsActivity, unsubscribe: unsubscribeFromOpenRequestsActivity } = createTableActivitySubscriber(
  'open-requests-activity',
  'requests',
  '*',
  refreshOpenRequests,
);

if (supabase) {
  refreshOpenRequests();
  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'TOKEN_REFRESHED') setTimeout(refreshOpenRequests, 0);
    if (session) subscribeToOpenRequestsActivity();
    else unsubscribeFromOpenRequestsActivity();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOpenRequests() {
  return useSyncExternalStore(subscribe, () => openRequests);
}

export function useOpenRequestsHydrated() {
  return useSyncExternalStore(subscribe, () => hydrated);
}
