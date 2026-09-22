import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

export type ConversationSummary = {
  id: string;
  /** Whether you're the buyer side of this thread — only buyers can rate the seller. */
  isBuyer: boolean;
  otherUserId: string;
  otherName: string;
  listingId: string | null;
  requestId: string | null;
  listingTitle: string | null;
  /** Empty when the listing this thread started from never recorded one, or has since sold. */
  listingSellerPhone: string;
  lastMessage: string | null;
  /** Falls back to when the thread was created, so a not-yet-answered thread still sorts sanely. */
  lastMessageAt: number;
  lastMessageSenderId: string | null;
  unreadCount: number;
};

/** A row of the `my_conversations` view, as the API returns it. */
type ConversationRow = {
  id: string;
  listing_id: string | null;
  request_id: string | null;
  created_at: string;
  is_buyer: boolean;
  other_user_id: string;
  other_name: string | null;
  listing_title: string | null;
  listing_seller_phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
};

function fromRow(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    isBuyer: row.is_buyer,
    otherUserId: row.other_user_id,
    otherName: row.other_name || 'PaGaraji user',
    listingId: row.listing_id,
    requestId: row.request_id,
    listingTitle: row.listing_title,
    listingSellerPhone: row.listing_seller_phone || '',
    lastMessage: row.last_message,
    lastMessageAt: Date.parse(row.last_message_at ?? row.created_at),
    lastMessageSenderId: row.last_message_sender_id,
    unreadCount: row.unread_count,
  };
}

let conversations: ConversationSummary[] = [];
// No backend configured means there's nothing to wait for — start "hydrated" so an
// on-device-only build doesn't get stuck showing a loading state forever.
let hydrated = supabase === null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/** Re-fetches your threads (newest activity first). Signed out: none. */
export async function refreshConversations(): Promise<void> {
  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    conversations = [];
    hydrated = true;
    emitChange();
    return;
  }
  const { data, error } = await supabase.from('my_conversations').select('*');
  hydrated = true;
  if (error || !data) {
    emitChange();
    return;
  }
  conversations = (data as ConversationRow[]).map(fromRow).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  emitChange();
}

// Keeps the Chats list and the tab-bar badge live everywhere in the app. RLS on `messages`
// means this only ever delivers events from conversations you're actually part of — but only
// once Realtime's websocket actually knows who you are, which isn't true yet at module load
// (the saved session is still being read from storage). Subscribing has to wait for a real,
// signed-in auth event, or it silently connects as nobody and never receives anything.
let activityChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

function subscribeToActivity() {
  if (!supabase || activityChannel) return;
  activityChannel = supabase
    .channel('conversations-activity')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
      refreshConversations();
    })
    .subscribe();
}

function unsubscribeFromActivity() {
  if (!supabase || !activityChannel) return;
  supabase.removeChannel(activityChannel);
  activityChannel = null;
}

if (supabase) {
  refreshConversations();
  // Deferred: Supabase asks that its own calls are not made inside this callback.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'TOKEN_REFRESHED') setTimeout(refreshConversations, 0);
    if (session) subscribeToActivity();
    else unsubscribeFromActivity();
  });
}

/**
 * Returns the thread with this seller, starting one if you've never messaged them before.
 * `sellerId` and `listingId` come straight off a `Listing` (its `sellerId`, and its `id` for
 * context — "About: Front brake pads" in the thread header).
 */
export async function getOrCreateConversation(
  sellerId: string,
  listingId?: string,
): Promise<{ id: string; created: boolean; error?: undefined } | { error: string }> {
  if (!supabase) return { error: 'Messaging isn’t set up yet.' };
  const { data: sessionData } = await supabase.auth.getSession();
  const myId = sessionData.session?.user.id;
  if (!myId) return { error: 'Sign in to send a message.' };
  if (myId === sellerId) return { error: 'This is your own listing.' };

  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', myId)
    .eq('seller_id', sellerId)
    .maybeSingle();
  if (findError) return { error: findError.message };
  if (existing) return { id: existing.id, created: false };

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({ buyer_id: myId, seller_id: sellerId, listing_id: listingId ?? null })
    .select('id')
    .single();
  if (insertError) {
    // Two taps racing to open the same thread both try to create it; the loser just reads
    // what the winner made, rather than showing an error for something that isn't one.
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', myId)
        .eq('seller_id', sellerId)
        .maybeSingle();
      if (raced) return { id: raced.id, created: false };
    }
    return { error: insertError.message };
  }
  await refreshConversations();
  return { id: created.id, created: true };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConversations() {
  return useSyncExternalStore(subscribe, () => conversations);
}

export function useConversation(id: string | undefined) {
  return useSyncExternalStore(subscribe, () => conversations.find((c) => c.id === id));
}

/** The chat an accepted request offer opened, if you're revisiting after it happened. */
export function useConversationForRequest(requestId: string | undefined) {
  return useSyncExternalStore(subscribe, () => conversations.find((c) => c.requestId === requestId));
}

export function useUnreadCount() {
  return useSyncExternalStore(subscribe, () => conversations.reduce((sum, c) => sum + c.unreadCount, 0));
}

/** False until the first fetch (success or failure) resolves — use to avoid flashing an empty state. */
export function useConversationsHydrated() {
  return useSyncExternalStore(subscribe, () => hydrated);
}
