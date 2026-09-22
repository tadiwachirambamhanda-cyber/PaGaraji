import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pagaraji.recentSearches';
const MAX_RECENT = 5;

let recent: string[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    recent = JSON.parse(raw);
    emitChange();
  })
  .catch(() => {
    // Nothing saved yet, or storage unavailable.
  });

function commit(next: string[]) {
  recent = next;
  emitChange();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recent)).catch(() => {});
}

/** Puts a search at the top of the list, without duplicates (ignoring case). */
export function addRecentSearch(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  commit([trimmed, ...recent.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT));
}

export function clearRecentSearches() {
  commit([]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRecentSearches() {
  return useSyncExternalStore(subscribe, () => recent);
}
