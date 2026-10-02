import { useMemo } from 'react';

import { useAllListings, useMyListings } from '@/store/my-listings';
import { matchListings, useMyRequests } from '@/store/my-requests';
import { useOpenRequests } from '@/store/open-requests';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
};

/**
 * Notifications are worked out from what's on the phone: open requests that now
 * have matching listings. There is no server yet, so nothing here is pushed.
 */
export function useNotifications(): AppNotification[] {
  const requests = useMyRequests();
  const listings = useAllListings();

  return useMemo(
    () =>
      requests
        .filter((r) => r.status === 'Open')
        .flatMap((request) => {
          const matches = matchListings(request, listings);
          if (matches.length === 0) return [];
          const best = matches[0];
          return [
            {
              id: request.id,
              title: `${matches.length} possible ${matches.length === 1 ? 'match' : 'matches'} for “${request.partName}”`,
              body: `${best.title} · $${best.price}${matches.length > 1 ? ` and ${matches.length - 1} more` : ''}`,
            },
          ];
        }),
    [requests, listings],
  );
}

/**
 * Other people's Open requests that plausibly match something you sell — the seller-side
 * mirror of the buyer-facing matches above, reusing the same `matchListings` heuristic scanning
 * in the other direction (your own listings against each open request, instead of a request
 * against everyone's listings). Deliberately kept separate from Activity's own badge: a "someone
 * wants this" opportunity is a different kind of thing than "something you're already in a deal
 * over changed," so it doesn't get folded into that same count.
 */
export function useSellerDemandRequestIds(): Set<string> {
  const requests = useOpenRequests();
  const myListings = useMyListings();
  return useMemo(() => {
    const ids = new Set<string>();
    for (const request of requests) {
      if (matchListings(request, myListings).length > 0) ids.add(request.id);
    }
    return ids;
  }, [requests, myListings]);
}
