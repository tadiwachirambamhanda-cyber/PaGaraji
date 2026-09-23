import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CategoryTabs } from '@/components/category-tabs';
import { ChatsList } from '@/components/chats-list';
import { MyRequestsList } from '@/components/my-requests-list';
import { NotificationsList } from '@/components/notifications-list';
import { PageHeader } from '@/components/page-header';
import { refreshAll } from '@/lib/refresh';
import { useNotifications } from '@/lib/notifications';
import { useUnreadCount } from '@/store/conversations';
import { useMyRequests } from '@/store/my-requests';
import { Colors, Spacing } from '@/theme';

const MODES = [
  { id: 'chats', label: 'Chats' },
  { id: 'requests', label: 'Requests' },
  { id: 'matches', label: 'Matches' },
] as const;
type Mode = (typeof MODES)[number]['id'];

export default function ActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>('chats');
  const unread = useUnreadCount();
  const openRequests = useMyRequests().filter((r) => r.status === 'Open').length;
  const matchCount = useNotifications().length;

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
      <PageHeader title="Activity" subtitle={subtitle} />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
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
