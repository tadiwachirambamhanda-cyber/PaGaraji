import { useEffect, useState, useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthReady } from '@/store/auth';
import type { PartRequest, RequestSource, RequestStatus } from '@/store/my-requests';

/** A row of the `requests` table, as the API returns it. */
export type RequestRow = {
  id: string;
  user_id: string;
  part_name: string;
  vehicle: string;
  source: RequestSource;
  category_id: string;
  notes: string;
  photos: string[] | null;
  budget: number | string | null;
  status: RequestStatus;
  matched_offer_id: string | null;
  created_at: string;
  latitude: number | string | null;
  longitude: number | string | null;
};

export function fromRow(row: RequestRow): PartRequest {
  return {
    id: row.id,
    remote: true,
    userId: row.user_id,
    partName: row.part_name,
    vehicle: row.vehicle,
    source: row.source,
    categoryId: row.category_id,
    notes: row.notes,
    photos: row.photos ?? [],
    budget: row.budget === null ? undefined : Number(row.budget),
    createdAt: Date.parse(row.created_at),
    status: row.status,
    matchedOfferId: row.matched_offer_id ?? undefined,
    latitude: row.latitude === null ? undefined : Number(row.latitude),
    longitude: row.longitude === null ? undefined : Number(row.longitude),
  };
}

let requests: PartRequest[] = [];
// No backend configured means there's nothing to wait for — start "hydrated" so an
// on-device-only build doesn't get stuck showing a loading state forever.
let hydrated = supabase === null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Reads your own requests from the server. Explicitly filtered to your own `user_id` —
 * since anyone can now browse *other* people's Open requests to bid on them (see
 * `store/open-requests.ts`), RLS alone no longer scopes an unfiltered select to "just mine".
 */
export async function refreshRemoteRequests(): Promise<void> {
  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    requests = [];
    hydrated = true;
    emitChange();
    return;
  }
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  hydrated = true;
  if (error || !data) {
    emitChange();
    return;
  }
  const rows = data as RequestRow[];
  const openIds = rows.filter((r) => r.status === 'Open').map((r) => r.id);
  const counts = new Map<string, number>();
  if (openIds.length > 0) {
    const { data: offerRows } = await supabase
      .from('request_offers')
      .select('request_id')
      .in('request_id', openIds)
      .eq('status', 'pending');
    for (const row of offerRows ?? []) {
      const key = row.request_id as string;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  requests = rows.map((row) => ({ ...fromRow(row), pendingOfferCount: counts.get(row.id) ?? 0 }));
  emitChange();
}

if (supabase) {
  refreshRemoteRequests();
  // Deferred: Supabase asks that its own calls are not made inside this callback.
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'TOKEN_REFRESHED') setTimeout(refreshRemoteRequests, 0);
  });
}

/**
 * A single request straight from the server, for viewing one that's neither yours
 * (`useMyRequests`) nor still Open (`useOpenRequests`) — the case a seller is in once
 * their accepted offer's request goes Matched or Closed, since it drops out of the open
 * feed and was never theirs to begin with. The `requests: seller reads via accepted
 * offer` RLS policy is what makes this resolve for them; anyone else gets nothing back.
 */
export async function fetchRequestById(id: string): Promise<PartRequest | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('requests').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as RequestRow);
}

/**
 * Live overrides for one request's status/matched_offer_id — the request detail screen's own
 * Stamp (Open/Matched/Closed) otherwise only catches up on a later navigation or refreshAll(),
 * the same staleness `useOffersForRequest` fixed for the offers list itself. Only tracks these
 * two fields rather than the whole row, since nothing else on a request changes after posting.
 * Returns null until the first live event arrives — the caller already has an initial value
 * from wherever it got the request (myRequests/openRequests/fetchRequestById), this only ever
 * overrides it once something actually changes.
 */
export function useLiveRequestStatus(requestId: string | undefined): { status: RequestStatus; matchedOfferId?: string } | null {
  const [live, setLive] = useState<{ status: RequestStatus; matchedOfferId?: string } | null>(null);
  const authReady = useAuthReady();

  useEffect(() => {
    const client = supabase;
    if (!requestId || !client || !authReady) {
      // Mirrors the (missing) route param / auth state, not a response to user input.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLive(null);
      return;
    }
    let cancelled = false;
    // A stale override from a previously-viewed request shouldn't leak onto this one
    // before the first event for it arrives.
    setLive(null);

    const channel = client
      .channel(`request-status-${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as RequestRow;
          setLive({ status: row.status, matchedOfferId: row.matched_offer_id ?? undefined });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [requestId, authReady]);

  return live;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRemoteRequests() {
  return useSyncExternalStore(subscribe, () => requests);
}

/** False until the first fetch (success or failure) resolves — use to avoid flashing an empty state. */
export function useRemoteRequestsHydrated() {
  return useSyncExternalStore(subscribe, () => hydrated);
}
