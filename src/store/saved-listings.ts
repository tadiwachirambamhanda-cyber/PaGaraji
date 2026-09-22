import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pagaraji.savedListingIds';

let savedIds = new Set<string>();
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const ids: string[] = JSON.parse(raw);
    savedIds = new Set(ids);
    emitChange();
  })
  .catch(() => {
    // No persisted saves yet, or storage unavailable — start empty.
  });

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...savedIds])).catch(() => {});
}

export function resetSaved() {
  savedIds = new Set();
  emitChange();
  persist();
}

export function toggleSaved(id: string) {
  const next = new Set(savedIds);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  savedIds = next;
  emitChange();
  persist();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsSaved(id: string) {
  return useSyncExternalStore(subscribe, () => savedIds.has(id));
}

export function useSavedIds() {
  return useSyncExternalStore(subscribe, () => savedIds);
}
