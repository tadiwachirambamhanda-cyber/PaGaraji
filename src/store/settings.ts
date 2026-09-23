import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pagaraji.settings';

export type ThemeMode = 'light' | 'dark';

export type Settings = { haptics: boolean; onboarded: boolean; themeMode: ThemeMode };

const DEFAULT_SETTINGS: Settings = { haptics: true, onboarded: false, themeMode: 'light' };

let settings: Settings = DEFAULT_SETTINGS;
// Becomes true once saved settings have been read, so first-run checks don't flash for returning users.
let hydrated = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  })
  .catch(() => {
    // Nothing persisted yet, or storage unavailable — keep defaults.
  })
  .finally(() => {
    hydrated = true;
    emitChange();
  });

export function getSettings() {
  return settings;
}

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  emitChange();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
}

// Resetting app data isn't a fresh install: keep `onboarded` so the welcome screen doesn't reappear.
export function resetSettings() {
  updateSettings({ haptics: DEFAULT_SETTINGS.haptics });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings() {
  return useSyncExternalStore(subscribe, () => settings);
}

export function useSettingsHydrated() {
  return useSyncExternalStore(subscribe, () => hydrated);
}
