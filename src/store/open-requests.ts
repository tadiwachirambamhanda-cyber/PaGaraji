import { useSyncExternalStore } from 'react';

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

if (supabase) {
  refreshOpenRequests();
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'TOKEN_REFRESHED') setTimeout(refreshOpenRequests, 0);
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
