import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PhotoViewer } from '@/components/photo-viewer';
import { Stamp } from '@/components/stamp';
import { Stitch } from '@/components/stitch';
import { categories } from '@/data/categories';
import { showAlert } from '@/lib/alert';
import { photoUri } from '@/lib/photos';
import { refreshAll } from '@/lib/refresh';
import { completeMatch } from '@/lib/offers';
import { deleteRequest, toggleRequest } from '@/lib/request-actions';
import { useSignedRequestPhotoUrls } from '@/lib/signed-urls';
import { timeAgo } from '@/lib/time';
import { matchListings, useMyRequests, type PartRequest } from '@/store/my-requests';
import { useAllListings } from '@/store/my-listings';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

const CATEGORY_OPTIONS = [{ id: 'any', label: 'Any category' }, ...categories.filter((c) => c.id !== 'all')];

function categoryLabel(id: string) {
  return CATEGORY_OPTIONS.find((c) => c.id === id)?.label ?? 'Any category';
}

function statusColor(status: PartRequest['status'], Colors: ColorPalette) {
  if (status === 'Open') return Colors.header;
  if (status === 'Matched') return Colors.primary;
  return Colors.muted;
}

function RequestCard({ request }: { request: PartRequest }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const allListings = useAllListings();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const isOpen = request.status === 'Open';
  // Requests on your account keep their photos private, so those are shown through short-lived links.
  const signedUrls = useSignedRequestPhotoUrls(request.remote ? (request.photos ?? []) : []);
  const photoSources = request.remote
    ? signedUrls.filter((uri) => uri !== '').map((uri) => ({ uri }))
    : (request.photos ?? []).map((name) => ({ uri: photoUri(name) }));
  const matches = isOpen ? matchListings(request, allListings) : [];

  const confirmDelete = () =>
    showAlert('Delete request?', `“${request.partName}” will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const problem = await deleteRequest(request);
          if (problem) showAlert('Couldn’t delete the request', problem);
        },
      },
    ]);

  return (
    <View style={[styles.card, !isOpen && styles.cardClosed]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {request.partName}
        </Text>
        <Stamp label={request.status.toUpperCase()} color={statusColor(request.status, Colors)} />
      </View>
      <Text style={styles.cardMeta}>
        {[
          request.vehicle || null,
          request.source === 'Any' ? 'Local or import' : request.source,
          categoryLabel(request.categoryId),
          request.budget !== undefined ? `Budget $${request.budget}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {request.notes !== '' && (
        <Text style={styles.cardNotes} numberOfLines={2}>
          {request.notes}
        </Text>
      )}
      {photoSources.length > 0 && (
        <View style={styles.thumbs}>
          {photoSources.map((source, index) => (
            <Pressable key={index} style={({ pressed }) => [styles.thumb, pressed && styles.pressed]} onPress={() => setViewerIndex(index)}>
              <Image source={source} style={styles.thumbImage} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      )}
      <Text style={styles.cardTime}>{timeAgo(request.createdAt)}</Text>

      {request.remote && request.status !== 'Closed' && (
        <Pressable
          style={({ pressed }) => [styles.offersRow, pressed && styles.pressed]}
          onPress={() => router.push(`/request/${request.id}`)}>
          <Text style={styles.offersRowText}>
            {request.status === 'Matched'
              ? 'Offer accepted — open chat'
              : request.pendingOfferCount
                ? `${request.pendingOfferCount} offer${request.pendingOfferCount === 1 ? '' : 's'} waiting`
                : 'No offers yet'}
          </Text>
          <Text style={styles.matchArrow}>→</Text>
        </Pressable>
      )}

      {isOpen && (
        <View style={styles.matches}>
          <Text style={styles.matchesTitle}>
            {matches.length === 0 ? 'No matching listings yet' : `${matches.length} possible match${matches.length === 1 ? '' : 'es'}`}
          </Text>
          {matches.length === 0 && <Text style={styles.matchesEmpty}>New listings that fit will appear here as they’re posted.</Text>}
          {matches.slice(0, 3).map((listing) => (
            <Pressable
              key={listing.id}
              style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]}
              onPress={() => router.push(`/listing/${listing.id}`)}>
              <Text style={styles.matchTitle} numberOfLines={1}>
                {listing.title}
              </Text>
              <Text style={styles.matchPrice}>${listing.price}</Text>
              <Text style={styles.matchArrow}>→</Text>
            </Pressable>
          ))}
          {matches.length > 3 && <Text style={styles.matchesEmpty}>+{matches.length - 3} more on Home</Text>}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          hitSlop={8}
          onPress={async () => {
            // A Matched request goes through the validated RPC (same one both
            // sides of the deal can call from the request detail screen) rather
            // than the plain Open<->Closed toggle below, which has no notion of
            // "this request is actually matched" and only ever touched your own
            // row — a seller marking their own accepted deal done needed the
            // real thing, not this shortcut.
            const problem = request.status === 'Matched' ? await completeMatch(request.id) : await toggleRequest(request);
            if (problem) showAlert('Couldn’t update the request', problem);
          }}>
          <Text style={styles.actionText}>
            {request.status === 'Open' ? 'Close request' : request.status === 'Matched' ? 'Mark done' : 'Reopen'}
          </Text>
        </Pressable>
        <Pressable hitSlop={8} onPress={confirmDelete}>
          <Text style={[styles.actionText, styles.actionDanger]}>Delete</Text>
        </Pressable>
      </View>
      <PhotoViewer sources={photoSources} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}

/** Your posted requests — bare, embeddable in the Activity tab. */
export function MyRequestsList({ onPostNew }: { onPostNew: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const requests = useMyRequests();
  const [refreshing, setRefreshing] = useState(false);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      tintColor={Colors.header}
      onRefresh={async () => {
        setRefreshing(true);
        await refreshAll();
        setRefreshing(false);
      }}
    />
  );

  if (requests.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.emptyScroll} refreshControl={refreshControl}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptyText}>Post one and any matching listings will show up here.</Text>
          <View style={styles.emptyButton}>
            <Button label="Post a request" variant="outline" onPress={onPostNew} />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list} refreshControl={refreshControl}>
      {requests.map((request, index) => (
        <View key={request.id}>
          {index > 0 && (
            <View style={styles.cardGap}>
              <Stitch />
            </View>
          )}
          <RequestCard request={request} />
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  list: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  pressed: {
    opacity: 0.6,
  },
  offersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.cardImage,
    borderRadius: 10,
  },
  offersRowText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  cardGap: {
    marginVertical: Spacing.xl,
  },
  card: {
    gap: Spacing.sm,
  },
  cardClosed: {
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardTitle: {
    flex: 1,
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    lineHeight: 24,
    color: Colors.ink,
  },
  cardMeta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.muted,
  },
  cardNotes: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.ink,
    lineHeight: 19,
  },
  thumbs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.cardImage,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  cardTime: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
  },
  matches: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingLeft: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  matchesTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  matchesEmpty: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  matchTitle: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.ink,
  },
  matchPrice: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  matchArrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.xs,
  },
  actionText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
    textDecorationLine: 'underline',
  },
  actionDanger: {
    color: Colors.danger,
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
  emptyButton: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
});
}
