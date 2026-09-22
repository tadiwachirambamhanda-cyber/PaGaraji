import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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

import { ArrowLeftIcon, ChatIcon, SendIcon } from '@/components/icons';
import { Stamp } from '@/components/stamp';
import { tapLight } from '@/lib/haptics';
import { markRead, sendMessage, useConversation } from '@/store/conversations';
import { Colors, Fonts, Spacing, Type } from '@/theme';

export default function ChatThreadScreen() {
  const { id, draft: initialDraft } = useLocalSearchParams<{
    id: string;
    draft?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const conversation = useConversation(id);
  const [draft, setDraft] = useState(initialDraft ?? '');
  const listRef = useRef<FlatList>(null);
  const messageCount = conversation?.messages.length ?? 0;

  useEffect(() => {
    if (id) markRead(id);
  }, [id, messageCount]);

  if (!conversation) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.notFound}>Conversation not found.</Text>
      </View>
    );
  }

  const isImported = conversation.origin !== 'Local';

  const send = () => {
    if (draft.trim() === '') return;
    tapLight();
    sendMessage(conversation.id, draft.trim());
    setDraft('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${conversation.sellerPhone}`);
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
          <Text style={styles.avatarText}>{conversation.initials}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {conversation.sellerName}
          </Text>
          <View style={styles.headerMeta}>
            <Stamp label={isImported ? `${conversation.origin.toUpperCase()} IMPORT` : 'LOCAL'} imported={isImported} />
          </View>
        </View>
        {Platform.OS !== 'web' && (
          <Pressable
            style={({ pressed }) => [styles.iconButton, styles.whatsappIcon, pressed && styles.iconButtonPressed]}
            accessibilityLabel="Chat on WhatsApp"
            hitSlop={8}
            onPress={openWhatsApp}>
            <ChatIcon size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={conversation.messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          <View style={styles.emptyThread}>
            <Text style={styles.emptyThreadTitle}>Say hello to {conversation.sellerName}</Text>
            <Text style={styles.emptyThreadText}>Ask about availability, price, or delivery.</Text>
          </View>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.sender === 'me' ? styles.bubbleRowMe : styles.bubbleRowThem]}>
            <View style={[styles.bubble, item.sender === 'me' ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, item.sender === 'me' && styles.bubbleTextMe]}>{item.text}</Text>
            </View>
            <Text style={styles.bubbleTime}>
              {item.sentAt
                ? new Date(item.sentAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : item.time}
            </Text>
          </View>
        )}
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
          style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed]}
          accessibilityLabel="Send message"
          onPress={send}>
          <SendIcon size={18} color="#FFFFFF" />
        </Pressable>
      </View>
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
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
