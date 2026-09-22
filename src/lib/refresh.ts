import { AppState, type AppStateStatus } from 'react-native';

import { refreshConversations } from '@/store/conversations';
import { refreshRemoteListings } from '@/store/remote-listings';
import { refreshRemoteRequests } from '@/store/remote-requests';
import { refreshSupplier } from '@/store/supplier';

/**
 * Re-fetches everything that can go stale while a screen sits open: listings, your requests,
 * your supplier application status, and your conversations. Each store's own refresh function
 * is a no-op without a backend or a signed-in session, so this is always safe to call. Chat
 * also updates live over Realtime — this is the fallback for whenever that isn't connected.
 */
export async function refreshAll(): Promise<void> {
  await Promise.all([refreshRemoteListings(), refreshRemoteRequests(), refreshSupplier(), refreshConversations()]);
}

// Re-fetch when the app comes back to the foreground — the phone may have sat idle for a while,
// or another device may have changed something in the meantime.
let lastAppState: AppStateStatus = AppState.currentState;
AppState.addEventListener('change', (state) => {
  if (lastAppState !== 'active' && state === 'active') refreshAll();
  lastAppState = state;
});
