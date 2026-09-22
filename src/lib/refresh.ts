import { AppState, type AppStateStatus } from 'react-native';

import { refreshRemoteListings } from '@/store/remote-listings';
import { refreshRemoteRequests } from '@/store/remote-requests';
import { refreshSupplier } from '@/store/supplier';

/**
 * Re-fetches everything that can go stale while a screen sits open: listings, your requests,
 * and your supplier application status. Each store's own refresh function is a no-op without a
 * backend or a signed-in session, so this is always safe to call.
 */
export async function refreshAll(): Promise<void> {
  await Promise.all([refreshRemoteListings(), refreshRemoteRequests(), refreshSupplier()]);
}

// Re-fetch when the app comes back to the foreground — the phone may have sat idle for a while,
// or another device may have changed something in the meantime.
let lastAppState: AppStateStatus = AppState.currentState;
AppState.addEventListener('change', (state) => {
  if (lastAppState !== 'active' && state === 'active') refreshAll();
  lastAppState = state;
});
