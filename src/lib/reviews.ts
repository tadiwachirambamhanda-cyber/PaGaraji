import { supabase } from '@/lib/supabase';
import { refreshRemoteListings } from '@/store/remote-listings';

export type SellerReview = {
  rating: number;
  comment: string;
};

type ReviewRow = {
  rating: number;
  comment: string;
};

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Your own review for this conversation, if you've already left one (only buyers ever have one). */
export async function fetchMyReview(conversationId: string): Promise<SellerReview | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('reviews')
    .select('rating, comment')
    .eq('conversation_id', conversationId)
    .maybeSingle();
  if (!data) return null;
  const row = data as ReviewRow;
  return { rating: row.rating, comment: row.comment };
}

/**
 * Rates the seller for this conversation — one review per conversation, the seller's
 * average updates automatically since it's a live aggregate over the `reviews` table.
 * RLS only allows this from the buyer side, so a seller rating themselves fails server-side.
 */
export async function submitReview(
  conversationId: string,
  sellerId: string,
  rating: number,
  comment: string,
): Promise<string | null> {
  if (!supabase) return 'Reviews aren’t set up yet.';
  const myId = await currentUserId();
  if (!myId) return 'Sign in to leave a rating.';
  const { error } = await supabase
    .from('reviews')
    .insert({ conversation_id: conversationId, reviewer_id: myId, seller_id: sellerId, rating, comment: comment.trim() });
  if (error) return error.message;
  refreshRemoteListings(); // picks up the seller's new average rating
  return null;
}
