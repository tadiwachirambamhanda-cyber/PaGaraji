import { useMemo } from 'react';

import { useAllListings } from '@/store/my-listings';
import { matchListings, useMyRequests } from '@/store/my-requests';

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
