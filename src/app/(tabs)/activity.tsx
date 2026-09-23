import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryTabs } from '@/components/category-tabs';
import { ChatsList } from '@/components/chats-list';
import { MyRequestsList } from '@/components/my-requests-list';
import { NotificationsList } from '@/components/notifications-list';
import { PageHeader } from '@/components/page-header';
import { tapLight } from '@/lib/haptics';
import { refreshAll } from '@/lib/refresh';
import { useNotifications } from '@/lib/notifications';
import { useUnreadCount } from '@/store/conversations';
import { useMyRequests } from '@/store/my-requests';
import { initialsOf, useProfile } from '@/store/profile';
import { openSidebar } from '@/store/sidebar';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

const MODES = [
  { id: 'chats', label: 'Chats' },
  { id: 'requests', label: 'Requests' },
  { id: 'matches', label: 'Matches' },
] as const;
type Mode = (typeof MODES)[number]['id'];

export default function ActivityScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>('chats');
  const unread = useUnreadCount();
  const openRequests = useMyRequests().filter((r) => r.status === 'Open').length;
  const matchCount = useNotifications().length;
  const profile = useProfile();

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, []),
  );

  useEffect(() => {
    if (params.mode === 'chats' || params.mode === 'requests' || params.mode === 'matches') {
      // Route params are external state; this mirrors a one-shot navigation hint into local state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(params.mode);
      router.setParams({ mode: undefined });
    }
  }, [params.mode, router]);

  const counts: Record<Mode, number> = { chats: unread, requests: openRequests, matches: matchCount };
  const subtitle =
    mode === 'chats'
      ? unread > 0
        ? `${unread} waiting for a reply`
        : undefined
      : mode === 'requests'
        ? `${openRequests} open`
        : matchCount > 0
          ? `${matchCount} new`
          : undefined;

  return (
    <View style={styles.screen}>
      <PageHeader
        title="Activity"
        subtitle={subtitle}
        top={
          <View style={styles.topRow}>
            <Pressable accessibilityLabel="Menu" hitSlop={8} onPress={() => { tapLight(); openSidebar(); }}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>{initialsOf(profile.name)}</Text>
              </View>
            </Pressable>
          </View>
        }
      />
      <View style={styles.tabs}>
        <CategoryTabs
          categories={MODES.map((m) => ({ ...m, label: counts[m.id] > 0 ? `${m.label} (${counts[m.id]})` : m.label }))}
          value={mode}
          onChange={(id) => setMode(id as Mode)}
        />
      </View>
      <View style={styles.body}>
        {mode === 'chats' && <ChatsList />}
        {mode === 'requests' && <MyRequestsList onPostNew={() => router.push('/post')} />}
        {mode === 'matches' && <NotificationsList onSelect={() => setMode('requests')} />}
      </View>
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menuAvatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  menuAvatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.caption,
    color: Colors.tagInk,
  },
  tabs: {
    paddingLeft: Spacing.xl,
    marginTop: Spacing.sm,
  },
  body: {
    flex: 1,
    marginTop: Spacing.sm,
  },
});
}
