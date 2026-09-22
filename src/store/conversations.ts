import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Conversation, Message } from '@/data/conversations';

const STORAGE_KEY = 'pagaraji.conversations';

let conversations: Conversation[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    // Earlier builds shipped sample threads (activity 0). Real ones always have a timestamp.
    conversations = (JSON.parse(raw) as Conversation[]).filter((c) => c.activity > 0);
    emitChange();
  })
  .catch(() => {
    // Nothing persisted yet, or storage unavailable — start with no conversations.
  });

function commit(next: Conversation[]) {
  conversations = next;
  emitChange();
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)).catch(() => {});
}

export function resetConversations() {
  commit([]);
}

export function sendMessage(conversationId: string, text: string) {
  const now = Date.now();
  const message: Message = { id: `msg-${now}`, sender: 'me', text, time: 'Now', sentAt: now };
  commit(
    conversations.map((c) =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, message], lastMessage: text, activity: now, unread: false }
        : c,
    ),
  );
}

export function markRead(conversationId: string) {
  if (!conversations.some((c) => c.id === conversationId && c.unread)) return;
  commit(conversations.map((c) => (c.id === conversationId ? { ...c, unread: false } : c)));
}

type Seller = { name: string; initials: string; phone: string; origin: Conversation['origin'] };

/** Returns the existing thread with this seller (matched by phone), or starts a new one. */
export function getOrCreateConversation(seller: Seller): { id: string; created: boolean } {
  const existing = conversations.find((c) => c.sellerPhone === seller.phone);
  if (existing) return { id: existing.id, created: false };

  const id = `conv-${Date.now()}`;
  commit([
    {
      id,
      sellerName: seller.name,
      initials: seller.initials,
      sellerPhone: seller.phone,
      lastMessage: 'No messages yet',
      time: '',
      unread: false,
      origin: seller.origin,
      activity: Date.now(),
      messages: [],
    },
    ...conversations,
  ]);
  return { id, created: true };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function byActivity(list: Conversation[]) {
  return [...list].sort((a, b) => b.activity - a.activity);
}

export function useConversations() {
  const list = useSyncExternalStore(subscribe, () => conversations);
  return byActivity(list);
}

export function useConversation(id: string | undefined) {
  return useSyncExternalStore(subscribe, () => conversations.find((c) => c.id === id));
}

export function useUnreadCount() {
  return useSyncExternalStore(subscribe, () => conversations.filter((c) => c.unread).length);
}
