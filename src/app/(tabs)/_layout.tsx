import { Tabs } from 'expo-router';
import { useMemo } from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { ChatIcon, HomeIcon } from '@/components/icons';
import { useNotifications } from '@/lib/notifications';
import { refreshAll } from '@/lib/refresh';
import { useUnreadCount } from '@/store/conversations';
import { useCounteredOffersCount } from '@/store/my-offers';
import { useMyRequests } from '@/store/my-requests';
import { Fonts, Type, useColors } from '@/theme';

export default function TabsLayout() {
  const Colors = useColors();
  const unread = useUnreadCount();
  const matches = useNotifications().length;
  // Pending offers on your own requests — piggybacks on the same live request_offers
  // subscription that already keeps Requests-list counts current (store/remote-requests.ts),
  // so this reflects a new bid the moment it lands, not just when Requests itself is open.
  const pendingOffers = useMyRequests().reduce((sum, r) => sum + (r.pendingOfferCount ?? 0), 0);
  // Offers where a buyer countered you — the seller-side mirror of pendingOffers, same live
  // wiring via store/my-offers.ts's own request_offers channel.
  const counteredOffers = useCounteredOffersCount();
  const activityBadge = unread + matches + pendingOffers + counteredOffers;

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: Colors.header,
      tabBarInactiveTintColor: Colors.navMuted,
      tabBarStyle: {
        backgroundColor: Colors.background,
        borderTopColor: Colors.border,
        borderTopWidth: 1,
        height: 78,
        paddingTop: 10,
      },
      tabBarBadgeStyle: {
        backgroundColor: Colors.primary,
        color: '#FFFFFF',
        fontFamily: Fonts.bodyBold,
        fontSize: Type.caption,
      },
      tabBarLabelStyle: {
        fontFamily: Fonts.bodyBold,
        fontSize: Type.caption,
      },
    }),
    [Colors],
  );

  return (
    <>
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color }) => <HomeIcon size={21} color={String(color)} /> }}
          // Tapping the Home tab re-fetches too — including when you're already on it, which
          // useFocusEffect on the screen itself can't catch since focus doesn't change.
          listeners={{ tabPress: () => refreshAll() }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarBadge: activityBadge > 0 ? activityBadge : undefined,
            tabBarIcon: ({ color }) => <ChatIcon size={21} color={String(color)} />,
          }}
          listeners={{ tabPress: () => refreshAll() }}
        />
      </Tabs>
      {/* Was the Profile tab — now a slide-out sidebar reached from a header icon, so it
          renders once here rather than per-tab and overlays whichever tab is active. */}
      <AppSidebar />
    </>
  );
}
