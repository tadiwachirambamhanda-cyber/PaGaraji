import { useSyncExternalStore } from 'react';

import { fetchMyOffers, type SellerOffer } from '@/lib/offers';
import { createTableActivitySubscriber } from '@/lib/realtime-activity';
import { supabase } from '@/lib/supabase';

let offers: SellerOffer[] = [];
let hydrated = supabase === null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/** Every offer you've placed as a seller, across every request. Refreshed alongside everything
 * else in refreshAll(), and live over Realtime — same idea as remote-requests.ts's own
 * pendingOfferCount channel, kept as a separate subscription since they're two different stores
 * (this is what you bid; that's who bid on you), not a shared one that would couple them. */
export async function refreshMyOffers(): Promise<void> {
  if (!supabase) return;
  offers = await fetchMyOffers();
  hydrated = true;
  emitChange();
}

const { subscribe: subscribeToMyOffersActivity, unsubscribe: unsubscribeFromMyOffersActivity } = createTableActivitySubscriber(
  'my-offers-activity',
  'request_offers',
  '*',
  refreshMyOffers,
);

if (supabase) {
  refreshMyOffers();
  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'TOKEN_REFRESHED') setTimeout(refreshMyOffers, 0);
    if (session) subscribeToMyOffersActivity();
    else unsubscribeFromMyOffersActivity();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMyOffers() {
  return useSyncExternalStore(subscribe, () => offers);
}

export function useMyOffersHydrated() {
  return useSyncExternalStore(subscribe, () => hydrated);
}

/**
 * Offers where a buyer countered you — the one seller-side state where something is actually
 * waiting on your response, the same way a buyer's pendingOfferCount is. Doesn't clear just by
 * opening Selling (unlike Deals' "new" badge): it clears when you actually respond to the
 * counter, since the thing it's tracking is still unresolved until then.
 */
export function useCounteredOffersCount() {
  return useSyncExternalStore(subscribe, () => offers.filter((o) => o.status === 'countered').length);
}
