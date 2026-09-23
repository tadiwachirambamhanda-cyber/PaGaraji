import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ArrowLeftIcon, ChatIcon, HeartIcon, StarIcon } from '@/components/icons';
import { ListingImage } from '@/components/listing-image';
import { NO_DESCRIPTION } from '@/data/listings';
import { PhotoViewer } from '@/components/photo-viewer';
import { Pop } from '@/components/pop';
import { PriceTag } from '@/components/price-tag';
import { Stamp, stampLabel } from '@/components/stamp';
import { Stitch } from '@/components/stitch';
import { success, tapLight } from '@/lib/haptics';
import { photoUri } from '@/lib/photos';
import { getOrCreateConversation } from '@/store/conversations';
import { deleteListing, setListingSold } from '@/lib/listing-actions';
import { useAllListings, useMyListings } from '@/store/my-listings';
import { toggleSaved, useIsSaved } from '@/store/saved-listings';
import { useSession } from '@/store/auth';
import { showAlert } from '@/lib/alert';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

export default function ListingDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const session = useSession();
  const [page, setPage] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [messaging, setMessaging] = useState(false);
  const saved = useIsSaved(id ?? '');
  const allListings = useAllListings();
  const myListings = useMyListings();
  // Look in your own listings first: a sold one is hidden from the feed but you can still open it.
  const listing = myListings.find((l) => l.id === id) ?? allListings.find((l) => l.id === id);
  const isOwn = myListings.some((l) => l.id === id);

  if (!listing) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.notFound}>Listing not found.</Text>
      </View>
    );
  }

  const {
    title,
    fitment,
    price,
    condition,
    location,
    origin,
    description,
    sellerName,
    sellerInitials,
    sellerRating,
    sellerReviewCount,
    sellerPhone,
    leadTime,
  } = listing;
  const isImported = origin !== 'Local';
  const sources =
    listing.photos && listing.photos.length > 0
      ? listing.photos.map((name) => ({ uri: photoUri(name) }))
      : listing.image
        ? [listing.image]
        : [];

  const confirmDelete = () =>
    showAlert('Delete this listing?', `“${title}” and its photos will be removed. This can’t be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const problem = await deleteListing(listing);
          if (problem) {
            showAlert('Couldn’t delete the listing', problem);
            return;
          }
          router.back();
        },
      },
    ]);

  const toggleSold = async () => {
    const problem = await setListingSold(listing, !listing.sold);
    if (problem) {
      showAlert('Couldn’t update the listing', problem);
      return;
    }
    success();
  };

  const openMessage = async () => {
    if (!listing.sellerId) return; // a sample listing — no real account behind it to message
    if (!session) {
      showAlert('Sign in to message', 'Create a free account or sign in so the seller can reply to you.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/sign-in') },
      ]);
      return;
    }
    if (messaging) return;
    setMessaging(true);
    const result = await getOrCreateConversation(listing.sellerId, listing.id);
    setMessaging(false);
    if ('error' in result) {
      showAlert('Couldn’t open the chat', result.error);
      return;
    }
    const draft = result.created ? `?draft=${encodeURIComponent(`Hi, is the ${title} still available?`)}` : '';
    router.push(`/chat/${result.id}${draft}`);
  };

  const shareOnWhatsApp = () => {
    tapLight();
    const text = `${title} for $${price}\n${fitment}\n${condition} · ${location}\nOn PaGaraji`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(`Hi ${sellerName}, is the ${title} still available on PaGaraji?`);
    Linking.openURL(`https://wa.me/${sellerPhone}?text=${message}`);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageArea}>
          {sources.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={StyleSheet.absoluteFill}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
              {sources.map((source, index) => (
                <Pressable key={index} onPress={() => setViewerIndex(index)}>
                  <Image source={source} style={{ width, height: 300 }} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ListingImage listing={listing} height={300} iconSize={72} style={StyleSheet.absoluteFill} />
          )}
          {sources.length > 1 && (
            <View style={[styles.counterWrap, { top: insets.top + Spacing.sm }]} pointerEvents="none">
              <Text style={styles.counter}>
                {Math.min(page + 1, sources.length)} / {sources.length}
              </Text>
            </View>
          )}
          <View style={styles.priceTag}>
            <PriceTag price={price} size="xl" />
          </View>
          <View style={styles.stamp}>
            {listing.sold ? (
              <Stamp label="SOLD" color={Colors.danger} />
            ) : (
              <Stamp label={stampLabel(listing)} imported={isImported} />
            )}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.roundButton,
              { top: insets.top + Spacing.sm, left: Spacing.lg },
              pressed && styles.roundButtonPressed,
            ]}
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() => router.back()}>
            <ArrowLeftIcon size={20} color={Colors.ink} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.roundButton,
              { top: insets.top + Spacing.sm, right: Spacing.lg },
              pressed && styles.roundButtonPressed,
            ]}
            accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}
            hitSlop={8}
            onPress={() => {
              tapLight();
              toggleSaved(id ?? '');
            }}>
            <Pop active={saved}>
              <HeartIcon size={18} color={saved ? Colors.primary : Colors.ink} filled={saved} />
            </Pop>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.fitment}>{fitment}</Text>
          <Text style={[styles.leadText, isImported && styles.leadImport]}>
            {condition} · {leadTime}
          </Text>
          {listing.sold ? (
            <Text style={styles.soldNote}>Marked as sold. Buyers can’t see this listing.</Text>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.shareLink, pressed && styles.deletePressed]}
              hitSlop={8}
              onPress={shareOnWhatsApp}>
              <Text style={styles.shareText}>Share on WhatsApp</Text>
            </Pressable>
          )}

          {description.trim() !== '' && description !== NO_DESCRIPTION && (
            <>
              <View style={styles.divider}>
                <Stitch />
              </View>

              <Text style={styles.sectionLabel}>About this part</Text>
              <Text style={styles.description}>{description}</Text>
            </>
          )}

          <View style={styles.divider}>
            <Stitch />
          </View>

          <Text style={styles.sectionLabel}>Sold by</Text>
          <View style={styles.sellerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{sellerInitials}</Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{sellerName}</Text>
              <View style={styles.sellerMeta}>
                {listing.verified ? (
                  <Text style={styles.verified}>✓ Verified supplier</Text>
                ) : sellerRating !== undefined && !isOwn ? (
                  <>
                    <StarIcon size={13} />
                    <Text style={styles.sellerRating}>
                      {sellerRating.toFixed(1)}
                      {sellerReviewCount !== undefined ? ` (${sellerReviewCount})` : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.sellerRating}>New seller</Text>
                )}
                <Text style={styles.sellerLocation} numberOfLines={1}>
                  · {location}
                </Text>
              </View>
            </View>
          </View>

          {isOwn && (
            <Pressable
              style={({ pressed }) => [styles.deleteLink, pressed && styles.deletePressed]}
              hitSlop={8}
              onPress={confirmDelete}>
              <Text style={styles.deleteText}>Delete listing</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <PhotoViewer sources={sources} index={viewerIndex} onClose={() => setViewerIndex(null)} />

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        {isOwn ? (
          <View style={styles.actionRow}>
            <View style={styles.actionSecondary}>
              <Button label="Edit" variant="outline" onPress={() => router.push(`/list-part?edit=${listing.id}`)} />
            </View>
            <View style={styles.actionPrimary}>
              <Button label={listing.sold ? 'Relist' : 'Mark as sold'} variant="primary" onPress={toggleSold} />
            </View>
          </View>
        ) : !listing.sellerId && (Platform.OS === 'web' || sellerPhone === '') ? (
          <Text style={styles.ownNote}>This is a sample listing — there’s no real seller to contact.</Text>
        ) : (
          <View style={styles.actionRow}>
            {listing.sellerId && (
              <View style={styles.actionSecondary}>
                <Button label={messaging ? 'One moment…' : 'Message'} variant="outline" onPress={openMessage} />
              </View>
            )}
            {Platform.OS !== 'web' && sellerPhone !== '' && (
              <View style={listing.sellerId ? styles.actionPrimary : styles.actionSecondary}>
                <Button
                  label="WhatsApp"
                  variant="whatsapp"
                  icon={<ChatIcon size={19} color="#FFFFFF" />}
                  onPress={openWhatsApp}
                />
              </View>
            )}
          </View>
        )}
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.body,
    color: Colors.muted,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  imageArea: {
    height: 300,
    backgroundColor: Colors.cardImage,
  },
  counterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counter: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
    backgroundColor: 'rgba(247,241,227,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  priceTag: {
    position: 'absolute',
    left: 0,
    bottom: Spacing.xl,
  },
  stamp: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
  },
  roundButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(247,241,227,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonPressed: {
    opacity: 0.7,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.heading,
    lineHeight: 30,
    color: Colors.ink,
  },
  fitment: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.ink,
  },
  leadText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.ink,
    marginTop: Spacing.xs,
  },
  leadImport: {
    color: Colors.importInk,
  },
  divider: {
    marginVertical: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  description: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    lineHeight: 22,
    color: Colors.ink,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.header,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  avatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.body,
    color: '#FFFFFF',
  },
  sellerInfo: {
    flex: 1,
    gap: 3,
  },
  sellerName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  sellerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verified: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  sellerRating: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  sellerLocation: {
    flex: 1,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionSecondary: {
    flex: 1,
  },
  actionPrimary: {
    flex: 1.4,
  },
  soldNote: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  shareLink: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  shareText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
    textDecorationLine: 'underline',
  },
  deleteLink: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xl,
  },
  deletePressed: {
    opacity: 0.6,
  },
  deleteText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.danger,
    textDecorationLine: 'underline',
  },
  ownNote: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.body,
    color: Colors.muted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
});
}
