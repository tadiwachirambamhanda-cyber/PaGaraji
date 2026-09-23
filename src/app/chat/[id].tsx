import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, ChatIcon, SendIcon, StarIcon } from '@/components/icons';
import { LiveLocationPanel } from '@/components/live-location-panel';
import { RateSellerSheet } from '@/components/rate-seller-sheet';
import { showAlert } from '@/lib/alert';
import { success, tapLight } from '@/lib/haptics';
import { markConversationRead, sendChatMessage, useThreadMessages } from '@/lib/messages';
import { fetchMyReview, submitReview, type SellerReview } from '@/lib/reviews';
import { useSession } from '@/store/auth';
import { refreshConversations, useConversation } from '@/store/conversations';
import { initialsOf } from '@/store/profile';
import { Colors, Fonts, Spacing, Type } from '@/theme';

export default function ChatThreadScreen() {
  const { id, draft: initialDraft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const conversation = useConversation(id);
  const { messages, loading: messagesLoading } = useThreadMessages(id);
  const [draft, setDraft] = useState(initialDraft ?? '');
  const [sending, setSending] = useState(false);
  const [checkedConversation, setCheckedConversation] = useState(false);
  // undefined: not checked yet. null: checked, no review exists yet.
  const [myReview, setMyReview] = useState<SellerReview | null | undefined>(undefined);
  const [rateSheetOpen, setRateSheetOpen] = useState(false);
  const listRef = useRef<FlatList>(null);
  const messageCount = messages.length;

  useEffect(() => {
    if (id) markConversationRead(id);
  }, [id, messageCount]);

  // Only the buyer side of a thread can rate the seller — check once we know that's us.
  useEffect(() => {
    if (id && conversation?.isBuyer) fetchMyReview(id).then(setMyReview);
  }, [id, conversation?.isBuyer]);

  // The cached list might not have this thread yet (e.g. a fresh app start) — check the server
  // directly once rather than flashing "not found" while that first fetch is still in flight.
  useEffect(() => {
    if (conversation || checkedConversation) return;
    refreshConversations().then(() => setCheckedConversation(true));
  }, [conversation, checkedConversation]);

  if (!conversation) {
    return (
      <View style={[styles.screen, styles.center]}>
        {checkedConversation && <Text style={styles.notFound}>Conversation not found.</Text>}
      </View>
    );
  }

  const send = async () => {
    const body = draft.trim();
    if (body === '' || sending) return;
    tapLight();
    setDraft('');
    setSending(true);
    const problem = await sendChatMessage(conversation.id, body);
    setSending(false);
    if (problem) {
      setDraft(body); // give it back so nothing typed is lost
      return;
    }
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${conversation.listingSellerPhone}`);
  };

  const rateSeller = async (rating: number, comment: string) => {
    const problem = await submitReview(conversation.id, conversation.otherUserId, rating, comment);
    if (problem) {
      showAlert('Couldn’t submit your rating', problem);
      return problem;
    }
    setMyReview({ rating, comment });
    success();
    return null;
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => router.back()}>
          <ArrowLeftIcon size={20} color={Colors.ink} />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(conversation.otherName)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {conversation.otherName}
          </Text>
          {conversation.listingTitle && (
            <Text style={styles.headerListing} numberOfLines={1}>
              About: {conversation.listingTitle}
            </Text>
          )}
        </View>
        {Platform.OS !== 'web' && conversation.listingSellerPhone !== '' && (
          <Pressable
            style={({ pressed }) => [styles.iconButton, styles.whatsappIcon, pressed && styles.iconButtonPressed]}
            accessibilityLabel="Chat on WhatsApp"
            hitSlop={8}
            onPress={openWhatsApp}>
            <ChatIcon size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {conversation.isBuyer && myReview === null && (
        <Pressable
          style={({ pressed }) => [styles.rateBanner, pressed && styles.rateBannerPressed]}
          onPress={() => setRateSheetOpen(true)}>
          <StarIcon size={15} />
          <Text style={styles.rateBannerText}>Bought something? Rate {conversation.otherName}</Text>
        </Pressable>
      )}
      {conversation.isBuyer && myReview && (
        <View style={styles.rateBanner}>
          <StarIcon size={15} />
          <Text style={styles.rateBannerText}>
            You rated {conversation.otherName} {myReview.rating}/5
          </Text>
        </View>
      )}

      <LiveLocationPanel conversationId={conversation.id} myUserId={session?.user.id} otherName={conversation.otherName} />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          messagesLoading ? (
            <View style={styles.emptyThread}>
              <ActivityIndicator color={Colors.muted} />
            </View>
          ) : (
            <View style={styles.emptyThread}>
              <Text style={styles.emptyThreadTitle}>Say hello to {conversation.otherName}</Text>
              <Text style={styles.emptyThreadText}>Ask about availability, price, or delivery.</Text>
            </View>
          )
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.senderId === session?.user.id;
          return (
            <View style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowThem]}>
              <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMe]}>{item.body}</Text>
              </View>
              <Text style={styles.bubbleTime}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
      />

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor={Colors.placeholder}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={({ pressed }) => [styles.sendButton, (pressed || sending) && styles.sendButtonPressed]}
          accessibilityLabel="Send message"
          disabled={sending}
          onPress={send}>
          {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <SendIcon size={18} color="#FFFFFF" />}
        </Pressable>
      </View>

      <RateSellerSheet
        visible={rateSheetOpen}
        onClose={() => setRateSheetOpen(false)}
        sellerName={conversation.otherName}
        onSubmit={rateSeller}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  whatsappIcon: {
    backgroundColor: Colors.whatsapp,
    borderColor: Colors.whatsapp,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  avatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.body,
    color: Colors.accentInk,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  headerListing: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.caption,
    color: Colors.header,
  },
  rateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FBF3DE',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rateBannerPressed: {
    opacity: 0.7,
  },
  rateBannerText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  messages: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyThread: {
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.xxxl,
  },
  emptyThreadTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.title,
    color: Colors.ink,
    textAlign: 'center',
  },
  emptyThreadText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  bubbleRow: {
    maxWidth: '80%',
    gap: 3,
  },
  bubbleRowMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowThem: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bubbleMe: {
    backgroundColor: Colors.header,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#EBE2CD',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    lineHeight: 20,
    color: Colors.ink,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.ink,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.header,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
});
