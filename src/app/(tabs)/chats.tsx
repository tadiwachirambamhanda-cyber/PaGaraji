import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/page-header';
import { Stitch } from '@/components/stitch';
import { refreshAll } from '@/lib/refresh';
import { timeAgo } from '@/lib/time';
import { initialsOf } from '@/store/profile';
import { refreshConversations, useConversations, type ConversationSummary } from '@/store/conversations';
import { Colors, Fonts, Spacing, Type } from '@/theme';

function ConversationRow({ item }: { item: ConversationSummary }) {
  const router = useRouter();
  const unread = item.unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/chat/${item.id}`)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(item.otherName)}</Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.sellerName, unread && styles.sellerNameUnread]} numberOfLines={1}>
            {item.otherName}
          </Text>
          <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
        </View>
        {item.listingTitle && (
          <Text style={styles.listingTitle} numberOfLines={1}>
            About: {item.listingTitle}
          </Text>
        )}
        <Text style={[styles.lastMessage, unread && styles.lastMessageUnread]} numberOfLines={1}>
          {item.lastMessage ?? 'Say hello'}
        </Text>
      </View>
      {unread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function ChatsScreen() {
  const conversations = useConversations();
  const unread = conversations.filter((c) => c.unreadCount > 0).length;
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, []),
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.header}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshConversations();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <PageHeader title="Chats" subtitle={unread > 0 ? `${unread} waiting for a reply` : undefined} />
        }
        ItemSeparatorComponent={() => (
          <View style={styles.separator}>
            <Stitch color={Colors.muted} thickness={1} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>Open a listing and tap Message to start one with the seller.</Text>
          </View>
        }
        renderItem={({ item }) => <ConversationRow item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    flexGrow: 1,
    paddingBottom: Spacing.xxxl,
  },
  separator: {
    marginHorizontal: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  rowPressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.header,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  avatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.body,
    color: '#FFFFFF',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  sellerName: {
    flex: 1,
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  sellerNameUnread: {
    fontFamily: Fonts.headingBold,
  },
  time: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
  },
  listingTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.caption,
    color: Colors.header,
  },
  lastMessage: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  lastMessageUnread: {
    fontFamily: Fonts.bodyBold,
    color: Colors.ink,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  emptyState: {
    paddingHorizontal: Spacing.xl,
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
