import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { StarIcon } from '@/components/icons';
import { PhotoViewer } from '@/components/photo-viewer';
import { RatePersonSheet } from '@/components/rate-person-sheet';
import { ScreenHeader } from '@/components/screen-header';
import { Stamp } from '@/components/stamp';
import { Stitch } from '@/components/stitch';
import { showAlert } from '@/lib/alert';
import { success, tapLight } from '@/lib/haptics';
import {
  acceptOffer,
  cancelMatch,
  completeMatch,
  counterOffer,
  fetchMyOffer,
  respondToCounterOffer,
  submitOffer,
  useMyOfferForRequest,
  useOffersForRequest,
  withdrawOffer,
  type RequestOffer,
} from '@/lib/offers';
import { fetchCategoryPriceGuidance, type PriceGuidance } from '@/lib/price-guidance';
import { presenceLabel } from '@/lib/presence';
import { fetchBuyerRating, fetchMyReview, submitReview } from '@/lib/reviews';
import { useSignedRequestPhotoUrls } from '@/lib/signed-urls';
import { useSession } from '@/store/auth';
import { useConversationForRequest } from '@/store/conversations';
import { useMyRequests, type PartRequest } from '@/store/my-requests';
import { useOpenRequests } from '@/store/open-requests';
import { fetchRequestById, useLiveRequestStatus } from '@/store/remote-requests';
import { initialsOf } from '@/store/profile';
import { Fonts, Radii, Spacing, Type, useColors, type ColorPalette } from '@/theme';

function statusColor(status: 'Open' | 'Matched' | 'Closed', Colors: ColorPalette) {
  if (status === 'Open') return Colors.header;
  if (status === 'Matched') return Colors.primary;
  return Colors.muted;
}

function OfferCard({
  offer,
  onAccept,
  onCounter,
  accepting,
  countering,
}: {
  offer: RequestOffer;
  onAccept: () => void;
  onCounter: (price: number) => void;
  accepting: boolean;
  countering: boolean;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const declined = offer.status === 'declined' || offer.status === 'withdrawn' || offer.status === 'cancelled';
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const activeNow = presenceLabel(offer.sellerLastActiveAt) === 'Active now';

  const sendCounter = () => {
    const value = Number(counterPrice);
    if (!Number.isFinite(value) || value <= 0) return;
    onCounter(value);
  };

  return (
    <View style={[styles.offerCard, declined && styles.offerCardDeclined]}>
      <View style={styles.offerTop}>
        <View style={styles.offerAvatar}>
          <Text style={styles.offerAvatarText}>{initialsOf(offer.sellerName ?? '')}</Text>
          {activeNow && <View style={styles.activeDot} accessibilityLabel="Active now" />}
        </View>
        <View style={styles.offerSeller}>
          <Text style={styles.offerSellerName} numberOfLines={1}>
            {offer.sellerName}
          </Text>
          <View style={styles.offerMeta}>
            {offer.verified ? (
              <Text style={styles.offerVerified}>✓ Verified</Text>
            ) : offer.sellerRating !== undefined ? (
              <>
                <StarIcon size={12} />
                <Text style={styles.offerRatingText}>
                  {offer.sellerRating.toFixed(1)}
                  {offer.sellerReviewCount !== undefined ? ` (${offer.sellerReviewCount})` : ''}
                </Text>
              </>
            ) : (
              <Text style={styles.offerRatingText}>New seller</Text>
            )}
          </View>
          {(offer.avgResponseMinutes !== undefined || offer.winRate !== undefined) && (
            <Text style={styles.offerStatsText} numberOfLines={1}>
              {[
                offer.avgResponseMinutes !== undefined ? `Responds in ~${offer.avgResponseMinutes}m` : null,
                offer.winRate !== undefined ? `Wins ${offer.winRate}%` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>
        <Text style={styles.offerPrice}>${offer.price}</Text>
      </View>
      {offer.message !== '' && <Text style={styles.offerMessage}>{offer.message}</Text>}
      {offer.status === 'accepted' ? (
        <Text style={styles.offerAccepted}>✓ Accepted</Text>
      ) : offer.status === 'declined' ? (
        <Text style={styles.offerDeclinedText}>Declined</Text>
      ) : offer.status === 'withdrawn' ? (
        <Text style={styles.offerDeclinedText}>Withdrawn</Text>
      ) : offer.status === 'cancelled' ? (
        <Text style={styles.offerDeclinedText}>Match cancelled</Text>
      ) : offer.status === 'countered' ? (
        <Text style={styles.offerDeclinedText}>You countered ${offer.counterPrice} — waiting for a reply</Text>
      ) : counterOpen ? (
        <View style={styles.counterRow}>
          <TextInput
            style={styles.counterInput}
            placeholder="Your price"
            placeholderTextColor={Colors.placeholder}
            keyboardType="decimal-pad"
            value={counterPrice}
            onChangeText={setCounterPrice}
            autoFocus
          />
          <Pressable style={({ pressed }) => [styles.counterSend, pressed && styles.pressed]} onPress={sendCounter}>
            <Text style={styles.counterSendText}>{countering ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.offerActions}>
          <View style={styles.offerAcceptFlex}>
            <Button label={accepting ? 'One moment…' : 'Accept offer'} variant="primary" onPress={onAccept} />
          </View>
          <Pressable style={({ pressed }) => [styles.counterLink, pressed && styles.pressed]} onPress={() => setCounterOpen(true)}>
            <Text style={styles.counterLinkText}>Counter</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function RequestDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const myRequests = useMyRequests();
  const openRequests = useOpenRequests();
  const localRequest = myRequests.find((r) => r.id === id) ?? openRequests.find((r) => r.id === id);
  const [remoteRequest, setRemoteRequest] = useState<PartRequest | null>(null);
  const liveStatus = useLiveRequestStatus(id);
  const baseRequest = localRequest ?? remoteRequest ?? undefined;
  const request = baseRequest && liveStatus ? { ...baseRequest, status: liveStatus.status, matchedOfferId: liveStatus.matchedOfferId } : baseRequest;
  const isOwn = myRequests.some((r) => r.id === id);
  const myConversation = useConversationForRequest(id);

  // Neither of the two local caches above cover a seller revisiting their own Matched
  // or Closed deal (it's not "theirs" and it's no longer Open) — fall back to fetching
  // it directly, which RLS permits for exactly that case.
  useEffect(() => {
    if (!id || localRequest || remoteRequest) return;
    fetchRequestById(id).then(setRemoteRequest);
  }, [id, localRequest, remoteRequest]);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { offers, loading: offersLoading, refetch: refetchOffers } = useOffersForRequest(id, isOwn);
  const { myOffer, setMyOffer } = useMyOfferForRequest(id, !isOwn);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [countering, setCountering] = useState<string | null>(null);
  const [respondingToCounter, setRespondingToCounter] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [rateSheetOpen, setRateSheetOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // The buyer's reputation, shown to a prospective seller deciding whether to bid.
  const [buyerRating, setBuyerRating] = useState<{ avgRating: number; reviewCount: number } | null | undefined>(undefined);
  const [priceGuidance, setPriceGuidance] = useState<PriceGuidance | null>(null);

  const signedUrls = useSignedRequestPhotoUrls(request?.photos ?? []);
  const photoSources = signedUrls.filter((uri) => uri !== '').map((uri) => ({ uri }));

  useEffect(() => {
    if (isOwn || !request?.userId) return;
    fetchBuyerRating(request.userId).then(setBuyerRating);
  }, [isOwn, request?.userId]);

  useEffect(() => {
    if (isOwn || !request?.categoryId) return;
    fetchCategoryPriceGuidance(request.categoryId).then(setPriceGuidance);
  }, [isOwn, request?.categoryId]);

  useEffect(() => {
    // Seeds the price field from the request's budget exactly once, when it first
    // arrives — not on every render, so editing the field afterwards sticks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (request?.budget !== undefined && price === '') setPrice(String(request.budget));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.budget]);

  if (!request) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ScreenHeader title="Request" />
        <Text style={styles.notFound}>Request not found.</Text>
      </View>
    );
  }

  const accept = async (offerId: string) => {
    setAccepting(offerId);
    const result = await acceptOffer(offerId);
    setAccepting(null);
    if ('error' in result) {
      showAlert('Couldn’t accept that offer', result.error);
      return;
    }
    success();
    router.push(`/chat/${result.conversationId}`);
  };

  const submit = async () => {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
      showAlert('Add a price', 'Enter what you’d charge for this.');
      return;
    }
    if (submitting) return;
    tapLight();
    setSubmitting(true);
    const problem = await submitOffer(request.id, value, message.trim());
    setSubmitting(false);
    if (problem) {
      showAlert('Couldn’t send your offer', problem);
      return;
    }
    success();
    setMyOffer(await fetchMyOffer(request.id));
  };

  const withdraw = async () => {
    if (!myOffer) return;
    const problem = await withdrawOffer(myOffer.id);
    if (problem) {
      showAlert('Couldn’t withdraw your offer', problem);
      return;
    }
    setMyOffer({ ...myOffer, status: 'withdrawn' });
  };

  const counter = async (offerId: string, value: number) => {
    setCountering(offerId);
    const problem = await counterOffer(offerId, value);
    setCountering(null);
    if (problem) {
      showAlert('Couldn’t send your counter', problem);
      return;
    }
    success();
    refetchOffers();
  };

  const respondToCounter = async (accept: boolean) => {
    if (!myOffer || respondingToCounter) return;
    setRespondingToCounter(true);
    const result = await respondToCounterOffer(myOffer.id, accept);
    setRespondingToCounter(false);
    if ('error' in result) {
      showAlert('Couldn’t respond to the counter', result.error);
      return;
    }
    success();
    if (accept && result.conversationId) {
      router.push(`/chat/${result.conversationId}`);
      return;
    }
    setMyOffer(await fetchMyOffer(request.id));
  };

  const cancelMatchConfirmed = async () => {
    if (cancelling) return;
    setCancelling(true);
    const problem = await cancelMatch(request.id);
    setCancelling(false);
    if (problem) {
      showAlert('Couldn’t cancel the match', problem);
      return;
    }
    success();
    if (isOwn) refetchOffers();
    else setMyOffer(await fetchMyOffer(request.id));
    // The fallback fetch below (see the effect near the top) isn't tied into the
    // myRequests/openRequests refresh cancelMatch() already triggered, so a seller
    // relying on it would otherwise keep seeing the stale pre-cancel status.
    if (remoteRequest) setRemoteRequest(await fetchRequestById(request.id));
  };

  const confirmCancelMatch = () =>
    showAlert('Cancel this match?', `“${request.partName}” will reopen for new offers. This can’t be undone.`, [
      { text: 'Never mind', style: 'cancel' },
      { text: 'Cancel match', style: 'destructive', onPress: cancelMatchConfirmed },
    ]);

  const completeMatchConfirmed = async () => {
    if (completing) return;
    setCompleting(true);
    const problem = await completeMatch(request.id);
    setCompleting(false);
    if (problem) {
      showAlert('Couldn’t mark this complete', problem);
      return;
    }
    success();
    // Same staleness issue as cancelMatchConfirmed above — refresh the fallback fetch too.
    if (remoteRequest) setRemoteRequest(await fetchRequestById(request.id));
    // Prompt for a rating right away rather than leaving it to the passive banner
    // in the chat thread — completion is the moment people are most likely to
    // actually do it. Only for a conversation that exists and isn't rated yet.
    if (myConversation) {
      const existing = await fetchMyReview(myConversation.id);
      if (!existing) setRateSheetOpen(true);
    }
  };

  const rateOtherPerson = async (rating: number, comment: string) => {
    if (!myConversation) return 'Couldn’t find the conversation for this deal.';
    const problem = await submitReview(myConversation.id, myConversation.otherUserId, rating, comment);
    if (problem) {
      showAlert('Couldn’t submit your rating', problem);
      return problem;
    }
    success();
    return null;
  };

  const canActOnMatch = request.status === 'Matched' && (isOwn || myOffer?.status === 'accepted');

  return (
    <View style={styles.screen}>
      <ScreenHeader title={request.partName} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.statusRow}>
          <Stamp label={request.status.toUpperCase()} color={statusColor(request.status, Colors)} />
          {request.budget !== undefined && <Text style={styles.budget}>Budget: ${request.budget}</Text>}
        </View>
        {canActOnMatch && (
          <View style={styles.matchActions}>
            <View style={styles.offerAcceptFlex}>
              <Button
                label={completing ? 'One moment…' : 'Mark as completed'}
                variant="primary"
                onPress={completeMatchConfirmed}
              />
            </View>
            <Pressable hitSlop={8} onPress={confirmCancelMatch} disabled={cancelling}>
              <Text style={styles.withdrawText}>{cancelling ? '…' : 'Cancel'}</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.meta}>
          {[
            request.vehicle || null,
            request.source === 'Any' ? 'Local or import' : request.source,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {!isOwn && buyerRating !== undefined && (
          <View style={styles.buyerRatingRow}>
            <StarIcon size={13} color={buyerRating ? undefined : Colors.muted} />
            <Text style={styles.buyerRatingText}>
              {buyerRating ? `Posted by a buyer rated ${buyerRating.avgRating.toFixed(1)} (${buyerRating.reviewCount})` : 'Posted by a new buyer'}
            </Text>
          </View>
        )}
        {request.notes !== '' && <Text style={styles.notes}>{request.notes}</Text>}

        {photoSources.length > 0 && (
          <View style={styles.thumbs}>
            {photoSources.map((source, index) => (
              <Pressable key={index} style={({ pressed }) => [styles.thumb, pressed && styles.pressed]} onPress={() => setViewerIndex(index)}>
                <Image source={source} style={styles.thumbImage} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.divider}>
          <Stitch />
        </View>

        {isOwn ? (
          <>
            <Text style={styles.sectionTitle}>
              {offersLoading ? 'Offers' : `${offers.length} offer${offers.length === 1 ? '' : 's'}`}
            </Text>
            {offersLoading ? (
              <ActivityIndicator color={Colors.muted} style={styles.loading} />
            ) : offers.length === 0 ? (
              <View>
                <Text style={styles.emptyTitle}>No offers yet</Text>
                <Text style={styles.emptyText}>Sellers who can help will offer a price here.</Text>
              </View>
            ) : (
              offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  accepting={accepting === offer.id}
                  countering={countering === offer.id}
                  onAccept={() => accept(offer.id)}
                  onCounter={(value) => counter(offer.id, value)}
                />
              ))
            )}
          </>
        ) : myOffer === undefined ? (
          <ActivityIndicator color={Colors.muted} style={styles.loading} />
        ) : myOffer && myOffer.status !== 'withdrawn' ? (
          <View>
            <Text style={styles.sectionTitle}>Your offer</Text>
            <View style={styles.myOfferCard}>
              <Text style={styles.myOfferPrice}>${myOffer.price}</Text>
              {myOffer.message !== '' && <Text style={styles.offerMessage}>{myOffer.message}</Text>}
              <Text style={styles.myOfferStatus}>
                {myOffer.status === 'accepted'
                  ? '✓ Accepted — say hello in chat'
                  : myOffer.status === 'declined'
                    ? 'Not chosen this time'
                    : myOffer.status === 'cancelled'
                      ? 'This deal was cancelled'
                      : myOffer.status === 'countered'
                        ? `Buyer countered: $${myOffer.counterPrice}`
                        : 'Waiting for a reply'}
              </Text>
            </View>
            {myOffer.status === 'pending' && (
              <Pressable style={({ pressed }) => [styles.withdrawLink, pressed && styles.pressed]} onPress={withdraw}>
                <Text style={styles.withdrawText}>Withdraw offer</Text>
              </Pressable>
            )}
            {myOffer.status === 'countered' && (
              <View style={styles.offerActions}>
                <View style={styles.offerAcceptFlex}>
                  <Button label={respondingToCounter ? 'One moment…' : 'Accept counter'} variant="primary" onPress={() => respondToCounter(true)} />
                </View>
                <Pressable style={({ pressed }) => [styles.counterLink, pressed && styles.pressed]} onPress={() => respondToCounter(false)}>
                  <Text style={styles.counterLinkText}>Decline</Text>
                </Pressable>
              </View>
            )}
            {myOffer.status === 'accepted' && myConversation && (
              <View style={styles.offerAcceptButton}>
                <Button label="Open chat" variant="primary" onPress={() => router.push(`/chat/${myConversation.id}`)} />
              </View>
            )}
          </View>
        ) : request.status !== 'Open' ? (
          <Text style={styles.emptyText}>This request is no longer open for offers.</Text>
        ) : !session ? (
          <View>
            <Text style={styles.emptyText}>Sign in to make an offer on this request.</Text>
            <View style={styles.offerAcceptButton}>
              <Button label="Sign in" variant="outline" onPress={() => router.push('/sign-in')} />
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Make an offer</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Your price (USD)</Text>
              <TextInput
                style={styles.input}
                placeholder="45"
                placeholderTextColor={Colors.placeholder}
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
              {priceGuidance && (
                <Text style={styles.priceGuidanceText}>
                  Similar parts closed at ${priceGuidance.minPrice}–${priceGuidance.maxPrice} recently (avg ${priceGuidance.avgPrice})
                </Text>
              )}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Message (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Have this in stock, used condition, ready today"
                placeholderTextColor={Colors.placeholder}
                value={message}
                onChangeText={setMessage}
                multiline
              />
            </View>
            <Button label={submitting ? 'Sending…' : 'Send offer'} variant="primary" onPress={submit} />
          </View>
        )}
      </ScrollView>
      <PhotoViewer sources={photoSources} index={viewerIndex} onClose={() => setViewerIndex(null)} />
      {myConversation && (
        <RatePersonSheet
          visible={rateSheetOpen}
          onClose={() => setRateSheetOpen(false)}
          personName={myConversation.otherName}
          onSubmit={rateOtherPerson}
        />
      )}
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
  },
  notFound: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.body,
    color: Colors.muted,
    marginTop: Spacing.xxxl,
  },
  body: {
    padding: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  matchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  budget: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  meta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.muted,
  },
  buyerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buyerRatingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.muted,
  },
  notes: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.ink,
    lineHeight: 21,
  },
  thumbs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.cardImage,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  loading: {
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  emptyText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
    lineHeight: 19,
  },
  offerCard: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  offerCardDeclined: {
    opacity: 0.55,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  offerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: Colors.header,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  offerAvatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.small,
    color: '#FFFFFF',
  },
  offerSeller: {
    flex: 1,
    gap: 2,
  },
  offerSellerName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  offerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offerVerified: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.caption,
    color: Colors.ink,
  },
  offerRatingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.caption,
    color: Colors.muted,
  },
  offerStatsText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
    marginTop: 1,
  },
  offerPrice: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.heading,
    color: Colors.ink,
  },
  offerMessage: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.ink,
    lineHeight: 19,
  },
  offerAccepted: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  offerDeclinedText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.muted,
  },
  offerAcceptButton: {
    marginTop: Spacing.xs,
  },
  offerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  offerAcceptFlex: {
    flex: 1,
  },
  counterLink: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  counterLinkText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
    textDecorationLine: 'underline',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  counterInput: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.ink,
    paddingVertical: Spacing.xs,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.ink,
  },
  counterSend: {
    backgroundColor: Colors.header,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  counterSendText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: '#FFFFFF',
  },
  myOfferCard: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  myOfferPrice: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.heading,
    color: Colors.ink,
  },
  myOfferStatus: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  withdrawLink: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
  },
  withdrawText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.danger,
    textDecorationLine: 'underline',
  },
  form: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.muted,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.ink,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.ink,
  },
  textarea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  priceGuidanceText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
  },
});
}
