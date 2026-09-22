import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pagaraji.vehicle';

export type Vehicle = {
  make: string;
  model: string;
  /** Four digits, or empty when the owner didn't say. */
  year: string;
};

let vehicle: Vehicle | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    vehicle = JSON.parse(raw);
    emitChange();
  })
  .catch(() => {
    // No vehicle saved yet, or storage unavailable.
  });

export function saveVehicle(next: Vehicle) {
  vehicle = next;
  emitChange();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vehicle)).catch(() => {});
}

export function resetVehicle() {
  vehicle = null;
  emitChange();
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export function vehicleLabel(v: Vehicle) {
  return [v.make, v.model, v.year].filter(Boolean).join(' ');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVehicle() {
  return useSyncExternalStore(subscribe, () => vehicle);
}
