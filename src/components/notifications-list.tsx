import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Stitch } from '@/components/stitch';
import { useNotifications } from '@/lib/notifications';
import { refreshAll } from '@/lib/refresh';
import { useRemoteListingsHydrated } from '@/store/remote-listings';
import { useRemoteRequestsHydrated } from '@/store/remote-requests';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

/** Matches between your open requests and current listings — bare, embeddable in Activity. */
export function NotificationsList({ onSelect }: { onSelect: () => void }) {
  const notifications = useNotifications();
  // Matches are derived from both listings and requests — wait for both before trusting "Nothing new".
  const listingsHydrated = useRemoteListingsHydrated();
  const requestsHydrated = useRemoteRequestsHydrated();
  const hydrated = listingsHydrated && requestsHydrated;
  const [refreshing, setRefreshing] = useState(false);
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={Colors.header}
          onRefresh={async () => {
            setRefreshing(true);
            await refreshAll();
            setRefreshing(false);
          }}
        />
      }
      ItemSeparatorComponent={() => <Stitch color={Colors.muted} thickness={1} />}
      ListEmptyComponent={
        hydrated ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing new</Text>
            <Text style={styles.emptyText}>When a listing matches one of your open requests, it will show up here.</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <ActivityIndicator color={Colors.muted} />
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onSelect}>
          <View style={styles.rowContent}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      )}
    />
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    list: {
      paddingHorizontal: Spacing.xl,
      flexGrow: 1,
    },
    pressed: {
      opacity: 0.6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    rowContent: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: Fonts.headingBold,
      fontSize: Type.body,
      color: Colors.ink,
    },
    body: {
      fontFamily: Fonts.bodyRegular,
      fontSize: Type.small,
      color: Colors.muted,
    },
    arrow: {
      fontFamily: Fonts.bodyBold,
      fontSize: Type.body,
      color: Colors.ink,
    },
    emptyState: {
      paddingTop: Spacing.xl,
      gap: Spacing.xs,
    },
    emptyTitle: {
      fontFamily: Fonts.headingBold,
      fontSize: Type.title,
      color: Colors.ink,
    },
    emptyText: {
      fontFamily: Fonts.bodyRegular,
      fontSize: Type.small,
      lineHeight: 19,
      color: Colors.muted,
    },
  });
}
