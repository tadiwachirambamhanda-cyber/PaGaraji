import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pagaraji.profile';

export type Profile = { name: string; phone: string; city: string };

// Accounts fill this in after sign-in; until then it's a neutral guest.
const DEFAULT_PROFILE: Profile = { name: 'Guest', phone: '', city: 'Harare' };

let profile: Profile = DEFAULT_PROFILE;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    profile = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    emitChange();
  })
  .catch(() => {
    // Nothing persisted yet, or storage unavailable — keep the default profile.
  });

export function getProfile() {
  return profile;
}

export function saveProfile(next: Profile) {
  profile = next;
  emitChange();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
}

export function resetProfile() {
  saveProfile(DEFAULT_PROFILE);
}

export function initialsOf(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return letters || '?';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProfile() {
  return useSyncExternalStore(subscribe, () => profile);
}
