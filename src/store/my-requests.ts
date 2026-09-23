import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo, useSyncExternalStore } from 'react';

import type { Listing } from '@/data/listings';
import { deletePhotos } from '@/lib/photos';
import { useRemoteRequests } from '@/store/remote-requests';

const STORAGE_KEY = 'pagaraji.myRequests';

export type RequestSource = 'Any' | 'Local' | 'Import';
/** Matched: an offer was accepted and it's no longer open for more offers. */
export type RequestStatus = 'Open' | 'Matched' | 'Closed';

export type PartRequest = {
  id: string;
  partName: string;
  vehicle: string;
  source: RequestSource;
  categoryId: string;
  notes: string;
  /** File names saved by lib/photos — usually the old part, or the number stamped on it. */
  photos?: string[];
  /** What you're willing to pay, if you named a price. Sellers can offer this, or counter. */
  budget?: number;
  createdAt: number;
  status: RequestStatus;
  /** True for requests stored online; `photos` then holds private storage paths. */
  remote?: boolean;
  /** Account id of whoever posted it — only set for online requests (yours or someone else's). */
  userId?: string;
  /** Set once an offer's been accepted. */
  matchedOfferId?: string;
  /** How many pending offers are waiting on your reply — online requests only. */
  pendingOfferCount?: number;
  /** A dropped pin, if you picked one when posting — more precise than `location`. */
  latitude?: number;
  longitude?: number;
};

let requests: PartRequest[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    requests = JSON.parse(raw);
    emitChange();
  })
  .catch(() => {
    // No persisted requests yet, or storage unavailable — start empty.
  });

function commit(next: PartRequest[]) {
  requests = next;
  emitChange();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(requests)).catch(() => {});
}

export function resetRequests() {
  for (const request of requests) deletePhotos(request.photos);
  commit([]);
}

export function addRequest(input: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) {
  commit([{ ...input, id: `req-${Date.now()}`, createdAt: Date.now(), status: 'Open' }, ...requests]);
}

export function toggleRequestStatus(id: string) {
  commit(requests.map((r) => (r.id === id ? { ...r, status: r.status === 'Open' ? 'Closed' : 'Open' } : r)));
}

export function removeRequest(id: string) {
  deletePhotos(requests.find((r) => r.id === id)?.photos);
  commit(requests.filter((r) => r.id !== id));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useLocalRequests() {
  return useSyncExternalStore(subscribe, () => requests);
}

/** Your requests: those on your account, plus any that only exist on this phone. */
export function useMyRequests(): PartRequest[] {
  const local = useLocalRequests();
  const remote = useRemoteRequests();
  return useMemo(() => [...remote, ...local].sort((a, b) => b.createdAt - a.createdAt), [local, remote]);
}

/** Listings that plausibly satisfy a request: right source, and a name-word or category match. */
export function matchListings(request: PartRequest, listings: Listing[]): Listing[] {
  const words = request.partName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

  return listings.filter((listing) => {
    if (request.source === 'Local' && listing.origin !== 'Local') return false;
    if (request.source === 'Import' && listing.origin === 'Local') return false;

    const haystack = `${listing.title} ${listing.fitment}`.toLowerCase();
    const wordMatch = words.some((w) => haystack.includes(w));
    const categoryMatch = request.categoryId !== 'any' && listing.categoryId === request.categoryId;
    return wordMatch || categoryMatch;
  });
}
