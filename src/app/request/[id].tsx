import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { StarIcon } from '@/components/icons';
import { PhotoViewer } from '@/components/photo-viewer';
import { ScreenHeader } from '@/components/screen-header';
import { Stamp } from '@/components/stamp';
import { Stitch } from '@/components/stitch';
import { showAlert } from '@/lib/alert';
import { success, tapLight } from '@/lib/haptics';
import {
  acceptOffer,
  fetchMyOffer,
  fetchOffersForRequest,
  submitOffer,
  withdrawOffer,
  type RequestOffer,
} from '@/lib/offers';
import { useSignedRequestPhotoUrls } from '@/lib/signed-urls';
import { useSession } from '@/store/auth';
import { useConversationForRequest } from '@/store/conversations';
import { useMyRequests } from '@/store/my-requests';
import { useOpenRequests } from '@/store/open-requests';
import { initialsOf } from '@/store/profile';
import { Colors, Fonts, Spacing, Type } from '@/theme';

function statusColor(status: 'Open' | 'Matched' | 'Closed') {
  if (status === 'Open') return Colors.header;
  if (status === 'Matched') return Colors.primary;
  return Colors.muted;
}

function OfferCard({
  offer,
  onAccept,
  accepting,
}: {
  offer: RequestOffer;
  onAccept: () => void;
  accepting: boolean;
}) {
  const declined = offer.status === 'declined' || offer.status === 'withdrawn';
  return (
    <View style={[styles.offerCard, declined && styles.offerCardDeclined]}>
      <View style={styles.offerTop}>
        <View style={styles.offerAvatar}>
          <Text style={styles.offerAvatarText}>{initialsOf(offer.sellerName ?? '')}</Text>
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
      ) : (
        <View style={styles.offerAcceptButton}>
          <Button label={accepting ? 'One moment…' : 'Accept offer'} variant="primary" onPress={onAccept} />
        </View>
      )}
    </View>
  );
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const myRequests = useMyRequests();
  const openRequests = useOpenRequests();
  const request = myRequests.find((r) => r.id === id) ?? openRequests.find((r) => r.id === id);
  const isOwn = myRequests.some((r) => r.id === id);
  const myConversation = useConversationForRequest(id);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [offers, setOffers] = useState<RequestOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  // undefined: not checked yet. null: checked, no offer of yours exists.
  const [myOffer, setMyOffer] = useState<RequestOffer | null | undefined>(undefined);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const signedUrls = useSignedRequestPhotoUrls(request?.photos ?? []);
  const photoSources = signedUrls.filter((uri) => uri !== '').map((uri) => ({ uri }));

  useEffect(() => {
    if (!id || !isOwn) return;
    // Mirrors the (missing) route param / fetch state, not a response to user input —
    // same pattern as lib/messages.ts's useThreadMessages.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffersLoading(true);
    fetchOffersForRequest(id).then((rows) => {
      setOffers(rows);
      setOffersLoading(false);
    });
  }, [id, isOwn]);

  useEffect(() => {
    if (!id || isOwn) return;
    fetchMyOffer(id).then(setMyOffer);
  }, [id, isOwn]);

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

  return (
    <View style={styles.screen}>
      <ScreenHeader title={request.partName} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.statusRow}>
          <Stamp label={request.status.toUpperCase()} color={statusColor(request.status)} />
          {request.budget !== undefined && <Text style={styles.budget}>Budget: ${request.budget}</Text>}
        </View>
        <Text style={styles.meta}>
          {[
            request.vehicle || null,
            request.source === 'Any' ? 'Local or import' : request.source,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
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
                <OfferCard key={offer.id} offer={offer} accepting={accepting === offer.id} onAccept={() => accept(offer.id)} />
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
                    : 'Waiting for a reply'}
              </Text>
            </View>
            {myOffer.status === 'pending' && (
              <Pressable style={({ pressed }) => [styles.withdrawLink, pressed && styles.pressed]} onPress={withdraw}>
                <Text style={styles.withdrawText}>Withdraw offer</Text>
              </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#EADFC8',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    color: Colors.header,
  },
  offerRatingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.caption,
    color: Colors.muted,
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
    color: Colors.header,
  },
  offerDeclinedText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.muted,
  },
  offerAcceptButton: {
    marginTop: Spacing.xs,
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
    color: Colors.header,
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
});
