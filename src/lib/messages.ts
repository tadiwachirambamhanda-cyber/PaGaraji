import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthReady } from '@/store/auth';
import { refreshConversations } from '@/store/conversations';

export type ChatMessage = {
  id: number;
  senderId: string;
  body: string;
  createdAt: number;
  readAt: number | null;
};

type MessageRow = {
  id: number;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

function fromRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: Date.parse(row.created_at),
    readAt: row.read_at ? Date.parse(row.read_at) : null,
  };
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** The full history of a thread, oldest first. */
async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as MessageRow[]).map(fromRow);
}

/** Sends a message. Returns an error message, or null on success. */
export async function sendChatMessage(conversationId: string, body: string): Promise<string | null> {
  if (!supabase) return 'Messaging isn’t set up yet.';
  const myId = await currentUserId();
  if (!myId) return 'Sign in to send a message.';
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: myId, body });
  return error ? error.message : null;
}

/** Marks every message from the other person in this thread as read. */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (!supabase) return;
  const myId = await currentUserId();
  if (!myId) return;
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', myId)
    .is('read_at', null);
  await refreshConversations(); // clears the unread badge right away
}

/**
 * Loads a thread's messages and keeps them live: new ones (yours or theirs) arrive over
 * Realtime rather than by polling. RLS means this only ever delivers messages from a
 * conversation you're actually part of.
 */
export function useThreadMessages(conversationId: string | undefined): { messages: ChatMessage[]; loading: boolean } {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  // A channel subscribed before the saved session finishes restoring connects as nobody, and
  // Realtime then correctly (per RLS) delivers it nothing — so wait for that to settle first.
  const authReady = useAuthReady();

  useEffect(() => {
    const client = supabase;
    if (!conversationId || !client || !authReady) {
      // Mirrors the (missing) route param / backend / auth state, not a response to user input.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMessages(conversationId).then((rows) => {
      if (!cancelled) {
        setMessages(rows);
        setLoading(false);
      }
    });

    const channel = client
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = fromRow(payload.new as MessageRow);
          setMessages((current) => (current.some((m) => m.id === row.id) ? current : [...current, row]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [conversationId, authReady]);

  return { messages, loading };
}
