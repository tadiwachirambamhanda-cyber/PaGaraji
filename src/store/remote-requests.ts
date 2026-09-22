import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';
import type { PartRequest, RequestSource } from '@/store/my-requests';

type RequestRow = {
  id: string;
  part_name: string;
  vehicle: string;
  source: RequestSource;
  category_id: string;
  notes: string;
  photos: string[] | null;
  status: 'Open' | 'Closed';
  created_at: string;
};

function fromRow(row: RequestRow): PartRequest {
  return {
    id: row.id,
    remote: true,
    partName: row.part_name,
    vehicle: row.vehicle,
    source: row.source,
    categoryId: row.category_id,
    notes: row.notes,
    photos: row.photos ?? [],
    createdAt: Date.parse(row.created_at),
    status: row.status,
  };
}

let requests: PartRequest[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/** Reads your requests from the server (the rules only ever return your own). Signed out: none. */
export async function refreshRemoteRequests(): Promise<void> {
  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    requests = [];
    emitChange();
    return;
  }
  const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
  if (error || !data) return;
  requests = (data as RequestRow[]).map(fromRow);
  emitChange();
}

if (supabase) {
  refreshRemoteRequests();
  // Deferred: Supabase asks that its own calls are not made inside this callback.
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'TOKEN_REFRESHED') setTimeout(refreshRemoteRequests, 0);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRemoteRequests() {
  return useSyncExternalStore(subscribe, () => requests);
}
