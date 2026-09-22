import { useSyncExternalStore } from 'react';

import { iconForCategory } from '@/data/categories';
import type { Condition, Listing, Origin } from '@/data/listings';
import { supabase } from '@/lib/supabase';
import { initialsOf } from '@/store/profile';

/** A row of the `listings` table, as the API returns it. */
type ListingRow = {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_phone: string;
  category_id: string;
  title: string;
  fitment: string;
  price: number | string;
  condition: string;
  origin: string;
  location: string;
  lead_time: string;
  description: string;
  photos: string[] | null;
  sold: boolean;
};

function fromRow(row: ListingRow, verifiedSellerIds: ReadonlySet<string>): Listing {
  return {
    id: row.id,
    remote: true,
    sellerId: row.seller_id,
    categoryId: row.category_id,
    title: row.title,
    fitment: row.fitment,
    price: Number(row.price),
    condition: row.condition as Condition,
    location: row.location,
    origin: row.origin as Origin,
    Icon: iconForCategory(row.category_id),
    photos: row.photos ?? [],
    description: row.description,
    sellerName: row.seller_name,
    sellerInitials: initialsOf(row.seller_name),
    sellerPhone: row.seller_phone,
    leadTime: row.lead_time,
    sold: row.sold,
    // An approved supplier, local or overseas — not just "not Local" — is what earns the tag.
    verified: verifiedSellerIds.has(row.seller_id),
  };
}

let listings: Listing[] = [];
// No backend configured means there's nothing to wait for — start "hydrated" so an
// on-device-only build doesn't get stuck showing a loading state forever.
let hydrated = supabase === null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/** Fetches the latest online listings. On any failure the last known list stays. */
export async function refreshRemoteListings(): Promise<void> {
  if (!supabase) return;
  const [listingsResult, verifiedResult] = await Promise.all([
    supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('verified_suppliers').select('user_id'),
  ]);
  hydrated = true;
  if (listingsResult.error || !listingsResult.data) {
    emitChange();
    return;
  }
  const verifiedSellerIds = new Set((verifiedResult.data ?? []).map((row) => row.user_id as string));
  listings = (listingsResult.data as ListingRow[]).map((row) => fromRow(row, verifiedSellerIds));
  emitChange();
}

if (supabase) {
  refreshRemoteListings();
  // Signing in or out changes which listings are visible (your own sold ones), so reload.
  // Deferred: Supabase asks that its own calls are not made inside this callback.
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'TOKEN_REFRESHED') setTimeout(refreshRemoteListings, 0);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRemoteListings() {
  return useSyncExternalStore(subscribe, () => listings);
}

/** False until the first fetch (success or failure) resolves — use to avoid flashing an empty state. */
export function useRemoteListingsHydrated() {
  return useSyncExternalStore(subscribe, () => hydrated);
}
