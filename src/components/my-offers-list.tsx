import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Stamp } from '@/components/stamp';
import { fetchMyOffers, type SellerOffer } from '@/lib/offers';
import { refreshAll } from '@/lib/refresh';
import { timeAgo } from '@/lib/time';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

function statusColor(status: SellerOffer['status'], Colors: ColorPalette) {
  if (status === 'accepted') return Colors.primary;
  if (status === 'pending' || status === 'countered') return Colors.header;
  return Colors.muted;
}

function statusDetail(offer: SellerOffer) {
  if (offer.status === 'accepted') return '✓ Accepted';
  if (offer.status === 'declined') return 'Declined';
  if (offer.status === 'withdrawn') return 'You withdrew this offer';
  if (offer.status === 'cancelled') return 'Match cancelled';
  if (offer.status === 'countered') return `They countered $${offer.counterPrice} — respond to it`;
  return 'Waiting for a reply';
}

function OfferRow({ offer, onPress }: { offer: SellerOffer; onPress: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.rowTop}>
        <Text style={styles.partName} numberOfLines={2}>
          {offer.partName}
        </Text>
        <Text style={styles.price}>${offer.price}</Text>
      </View>
      <View style={styles.rowMeta}>
        <Stamp label={offer.status.toUpperCase()} color={statusColor(offer.status, Colors)} />
        <Text style={styles.metaText}>
          {offer.buyerName} · {timeAgo(offer.createdAt)}
        </Text>
      </View>
      <Text style={styles.detail}>{statusDetail(offer)}</Text>
    </Pressable>
  );
}

/** Every offer you've placed as a seller, across every request — the Activity tab's Selling mode. */
export function MyOffersList() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const [offers, setOffers] = useState<SellerOffer[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMyOffers().then(setOffers);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setOffers(await fetchMyOffers());
    setRefreshing(false);
  };

  if (offers === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.muted} />
      </View>
    );
  }

  if (offers.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyScroll}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.header} onRefresh={refresh} />}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No offers yet</Text>
          <Text style={styles.emptyText}>Bid on an open request from Post → Open requests, and it’ll show up here.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.header} onRefresh={refresh} />}>
      {offers.map((offer) => (
        <OfferRow key={offer.id} offer={offer} onPress={() => router.push(`/request/${offer.requestId}`)} />
      ))}
    </ScrollView>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: Spacing.xxxl,
    },
    list: {
      padding: Spacing.xl,
      gap: Spacing.md,
    },
    row: {
      gap: Spacing.xs,
      borderWidth: 1.5,
      borderColor: Colors.border,
      borderRadius: 14,
      padding: Spacing.lg,
    },
    pressed: {
      opacity: 0.7,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    partName: {
      flex: 1,
      fontFamily: Fonts.headingSemiBold,
      fontSize: Type.body,
      color: Colors.ink,
    },
    price: {
      fontFamily: Fonts.headingBold,
      fontSize: Type.title,
      color: Colors.ink,
    },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    metaText: {
      fontFamily: Fonts.bodyRegular,
      fontSize: Type.caption,
      color: Colors.muted,
    },
    detail: {
      fontFamily: Fonts.bodyMedium,
      fontSize: Type.small,
      color: Colors.ink,
    },
    emptyScroll: {
      flexGrow: 1,
    },
    emptyState: {
      padding: Spacing.xl,
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
