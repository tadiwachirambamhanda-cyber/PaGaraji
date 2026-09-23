import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { fetchMyDeals, type Deal } from '@/lib/offers';
import { timeAgo } from '@/lib/time';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

function DealRow({ deal, onPress, onRebook }: { deal: Deal; onPress: () => void; onRebook: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.partName} numberOfLines={1}>
          {deal.partName}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {deal.role === 'seller' ? `Sold to ${deal.otherName}` : `Bought from ${deal.otherName}`} · {timeAgo(deal.createdAt)}
        </Text>
        {deal.role === 'buyer' && (
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              onRebook();
            }}>
            <Text style={styles.rebookLink}>Post this again</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.price}>${deal.price}</Text>
    </Pressable>
  );
}

export default function DealHistoryScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[] | null>(null);

  useEffect(() => {
    fetchMyDeals().then(setDeals);
  }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Past deals" />
      <FlatList
        data={deals ?? []}
        keyExtractor={(item) => item.offerId}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          deals === null ? (
            <ActivityIndicator color={Colors.muted} style={styles.loading} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No deals yet</Text>
              <Text style={styles.emptyText}>Once you buy or sell through a request, it’ll show up here.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <DealRow
            deal={item}
            onPress={() => router.push(`/request/${item.requestId}`)}
            onRebook={() => router.push(`/post?partName=${encodeURIComponent(item.partName)}`)}
          />
        )}
      />
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  partName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  detail: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  rebookLink: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  price: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  loading: {
    marginTop: Spacing.xxxl,
  },
  emptyState: {
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  emptyText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
    lineHeight: 19,
  },
});
}
