import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo, useSyncExternalStore } from 'react';

import { iconForCategory } from '@/data/categories';
import type { Listing } from '@/data/listings';
import { deletePhotos } from '@/lib/photos';
import { useRemoteListings } from '@/store/remote-listings';
import { useSession } from '@/store/auth';

const STORAGE_KEY = 'pagaraji.myListings';

// Listing.Icon is a component reference and can't survive JSON — persist
// everything else and re-derive the icon from categoryId on load.
type StorableListing = Omit<Listing, 'Icon'>;

let myListings: Listing[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const stored: StorableListing[] = JSON.parse(raw);
    // Listings you post yourself have no real ratings. Older saves stored a placeholder 5, so drop it.
    myListings = stored.map((listing) => ({
      ...listing,
      sellerRating: undefined,
      Icon: iconForCategory(listing.categoryId),
    }));
    emitChange();
  })
  .catch(() => {
    // No persisted listings yet, or storage unavailable — start empty.
  });

function persist() {
  const storable: StorableListing[] = myListings.map(({ Icon: _icon, ...rest }) => rest);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storable)).catch(() => {});
}

export function resetMyListings() {
  myListings = [];
  emitChange();
  persist();
}

export function updateSeller(seller: { name: string; initials: string; phone: string }) {
  myListings = myListings.map((l) => ({
    ...l,
    sellerName: seller.name,
    sellerInitials: seller.initials,
    sellerPhone: seller.phone,
  }));
  emitChange();
  persist();
}

export function updateListing(id: string, patch: Partial<Omit<Listing, 'id' | 'Icon'>>) {
  myListings = myListings.map((l) =>
    l.id === id
      ? { ...l, ...patch, ...(patch.categoryId ? { Icon: iconForCategory(patch.categoryId) } : {}) }
      : l,
  );
  emitChange();
  persist();
}

export function removeListing(id: string) {
  deletePhotos(myListings.find((l) => l.id === id)?.photos);
  myListings = myListings.filter((l) => l.id !== id);
  emitChange();
  persist();
}

export function addListing(listing: Listing) {
  myListings = [listing, ...myListings];
  emitChange();
  persist();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useLocalListings() {
  return useSyncExternalStore(subscribe, () => myListings);
}

/** Everything you've posted: online listings from your account, plus any that only exist on this phone. */
export function useMyListings(): Listing[] {
  const local = useLocalListings();
  const remote = useRemoteListings();
  const userId = useSession()?.user.id;
  return useMemo(
    () => [...remote.filter((l) => userId !== undefined && l.sellerId === userId), ...local],
    [local, remote, userId],
  );
}

/** The feed: live online listings, plus any that only exist on this phone. */
export function useAllListings(): Listing[] {
  const local = useLocalListings();
  const remote = useRemoteListings();
  return useMemo(() => [...remote, ...local].filter((l) => !l.sold), [local, remote]);
}
