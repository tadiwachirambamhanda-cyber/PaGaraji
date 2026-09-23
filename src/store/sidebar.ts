import { useSyncExternalStore } from 'react';

let visible = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function openSidebar() {
  visible = true;
  emitChange();
}

export function closeSidebar() {
  visible = false;
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSidebarVisible() {
  return useSyncExternalStore(subscribe, () => visible);
}
