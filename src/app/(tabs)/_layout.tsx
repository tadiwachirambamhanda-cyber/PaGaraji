import { Tabs } from 'expo-router';
import { useMemo } from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { BellIcon, HomeIcon } from '@/components/icons';
import { useNotifications } from '@/lib/notifications';
import { refreshAll } from '@/lib/refresh';
import { useUnreadCount } from '@/store/conversations';
import { Fonts, Type, useColors } from '@/theme';

export default function TabsLayout() {
  const Colors = useColors();
  const unread = useUnreadCount();
  const matches = useNotifications().length;
  const activityBadge = unread + matches;

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
            tabBarIcon: ({ color }) => <BellIcon size={21} color={String(color)} />,
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
