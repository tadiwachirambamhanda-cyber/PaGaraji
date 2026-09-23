import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { fetchMyDeals, type Deal } from '@/lib/offers';
import { supabase } from '@/lib/supabase';

const SEEN_KEY = 'pagaraji.dealsLastSeenAt';

let deals: Deal[] = [];
let hydrated = supabase === null;
let lastSeenAt = 0;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

// A brand new install (or an existing one updating into this feature for the first time) has
// no "last seen" timestamp yet — treat that as having seen everything up to now, not as having
// seen nothing, so a returning user isn't suddenly shown every deal they've ever closed as "new".
AsyncStorage.getItem(SEEN_KEY)
  .then((raw) => {
    if (raw) {
      lastSeenAt = Number(raw);
    } else {
      lastSeenAt = Date.now();
      AsyncStorage.setItem(SEEN_KEY, String(lastSeenAt)).catch(() => {});
    }
    emitChange();
  })
  .catch(() => {});

/** Every deal you've closed, either side. Refreshed alongside everything else in refreshAll(). */
export async function refreshMyDeals(): Promise<void> {
  if (!supabase) return;
  deals = await fetchMyDeals();
  hydrated = true;
  emitChange();
}

/** Call when the Deals tab is opened, so its "new" badge clears. */
export function markDealsSeen() {
  lastSeenAt = Date.now();
  emitChange();
  AsyncStorage.setItem(SEEN_KEY, String(lastSeenAt)).catch(() => {});
}

if (supabase) {
  refreshMyDeals();
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'TOKEN_REFRESHED') setTimeout(refreshMyDeals, 0);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMyDeals() {
  return useSyncExternalStore(subscribe, () => deals);
}

export function useMyDealsHydrated() {
  return useSyncExternalStore(subscribe, () => hydrated);
}

/** Deals closed since you last opened the Deals tab — the badge count. */
export function useNewDealsCount() {
  return useSyncExternalStore(subscribe, () => deals.filter((d) => d.createdAt > lastSeenAt).length);
}
