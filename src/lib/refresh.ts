import { AppState, type AppStateStatus } from 'react-native';

import { pingPresence } from '@/lib/presence';
import { refreshConversations } from '@/store/conversations';
import { refreshMyDeals } from '@/store/deal-history';
import { refreshMyOffers } from '@/store/my-offers';
import { refreshOpenRequests } from '@/store/open-requests';
import { refreshRemoteListings } from '@/store/remote-listings';
import { refreshRemoteRequests } from '@/store/remote-requests';
import { refreshSupplier } from '@/store/supplier';

/**
 * Re-fetches everything that can go stale while a screen sits open: listings, your requests,
 * other people's open requests (to bid on), your supplier application status, your closed
 * deals, the offers you've placed as a seller, and your conversations. Each store's own refresh
 * function is a no-op without a backend or a signed-in session, so this is always safe to call.
 * Chat also updates live over Realtime — this is the fallback for whenever that isn't connected.
 * Also pings your own presence (throttled) — piggybacking on the same "screen is open and
 * active" signal rather than a separate timer.
 */
export async function refreshAll(): Promise<void> {
  await Promise.all([
    refreshRemoteListings(),
    refreshRemoteRequests(),
    refreshOpenRequests(),
    refreshSupplier(),
    refreshConversations(),
    refreshMyDeals(),
    refreshMyOffers(),
    pingPresence(),
  ]);
}

// Re-fetch when the app comes back to the foreground — the phone may have sat idle for a while,
// or another device may have changed something in the meantime.
let lastAppState: AppStateStatus = AppState.currentState;
AppState.addEventListener('change', (state) => {
  if (lastAppState !== 'active' && state === 'active') refreshAll();
  lastAppState = state;
});
