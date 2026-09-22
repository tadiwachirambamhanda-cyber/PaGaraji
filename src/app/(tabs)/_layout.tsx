import { Tabs } from 'expo-router';

import { ChatIcon, GridIcon, HomeIcon, PlusIcon, UserIcon } from '@/components/icons';
import { useUnreadCount } from '@/store/conversations';
import { Colors, Fonts, Type } from '@/theme';

export default function TabsLayout() {
  const unread = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
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
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <HomeIcon size={21} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="browse"
        options={{ title: 'Browse', tabBarIcon: ({ color }) => <GridIcon size={21} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="request"
        options={{ title: 'Post', tabBarIcon: ({ color }) => <PlusIcon size={21} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: 'Chats', tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color }) => <ChatIcon size={21} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <UserIcon size={21} color={String(color)} /> }}
      />
    </Tabs>
  );
}
