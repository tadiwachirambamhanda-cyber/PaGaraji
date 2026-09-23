import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthReady } from '@/store/auth';

export type SharedLocation = {
  userId: string;
  latitude: number;
  longitude: number;
  updatedAt: number;
};

type ShareRow = {
  conversation_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

function fromRow(row: ShareRow): SharedLocation {
  return { userId: row.user_id, latitude: row.latitude, longitude: row.longitude, updatedAt: Date.parse(row.updated_at) };
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// Only one conversation shares your location at a time — starting a new one stops
// any other, so you're never quietly still broadcasting somewhere you forgot about.
let activeConversationId: string | null = null;
let watchSubscription: Location.LocationSubscription | null = null;

/**
 * Starts sharing your live location in this conversation: an immediate fix, then
 * an update roughly every 12 seconds or 30 meters moved, for as long as the app
 * stays open. Foreground only — like the rest of this app on Expo Go, there's no
 * background location without a paid Apple Developer account and a custom build.
 * Returns an error message, or null once sharing has started.
 */
export async function startSharing(conversationId: string): Promise<string | null> {
  if (!supabase) return 'Sharing isn’t set up yet.';
  const myId = await currentUserId();
  if (!myId) return 'Sign in to share your location.';

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return 'Turn on location access in Settings to share it.';

  if (activeConversationId && activeConversationId !== conversationId) {
    await stopSharing(activeConversationId);
  }
  activeConversationId = conversationId;

  const push = async (coords: { latitude: number; longitude: number }) => {
    if (!supabase) return;
    await supabase.from('location_shares').upsert({
      conversation_id: conversationId,
      user_id: myId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
  };

  try {
    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await push(initial.coords);
  } catch {
    return 'Couldn’t get your location. Check your connection and try again.';
  }

  watchSubscription?.remove();
  watchSubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 12000, distanceInterval: 30 },
    (position) => push(position.coords),
  );
  return null;
}

/** Stops sharing your location in this conversation. Safe to call even if you weren't. */
export async function stopSharing(conversationId: string): Promise<void> {
  if (activeConversationId === conversationId) {
    watchSubscription?.remove();
    watchSubscription = null;
    activeConversationId = null;
  }
  if (!supabase) return;
  const myId = await currentUserId();
  if (!myId) return;
  await supabase.from('location_shares').delete().eq('conversation_id', conversationId).eq('user_id', myId);
}

export function isSharingIn(conversationId: string): boolean {
  return activeConversationId === conversationId;
}

/** Live location shares in a thread — both sides, updating as they move. */
export function useThreadLocationShares(conversationId: string | undefined): SharedLocation[] {
  const [shares, setShares] = useState<SharedLocation[]>([]);
  const authReady = useAuthReady();

  useEffect(() => {
    const client = supabase;
    if (!conversationId || !client || !authReady) {
      // Mirrors the (missing) route param / backend / auth state, not a response to user input.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShares([]);
      return;
    }
    let cancelled = false;

    client
      .from('location_shares')
      .select('*')
      .eq('conversation_id', conversationId)
      .then(({ data }) => {
        if (!cancelled && data) setShares((data as ShareRow[]).map(fromRow));
      });

    const channel = client
      .channel(`location-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'location_shares', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<ShareRow>;
            setShares((current) => current.filter((s) => s.userId !== oldRow.user_id));
            return;
          }
          const row = fromRow(payload.new as ShareRow);
          setShares((current) => [...current.filter((s) => s.userId !== row.userId), row]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [conversationId, authReady]);

  return shares;
}
