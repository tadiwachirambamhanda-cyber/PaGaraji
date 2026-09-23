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

type RatingRow = {
  avg_rating: number | string;
  review_count: number;
};

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Your own review for this conversation, if you've already left one. Both sides of
 * a deal can now leave one (buyer rates seller, seller rates buyer), so this is
 * scoped to *your* review specifically — `reviews_select_all` is a public policy,
 * so an unfiltered query could otherwise return the other person's review instead.
 */
export async function fetchMyReview(conversationId: string): Promise<SellerReview | null> {
  if (!supabase) return null;
  const myId = await currentUserId();
  if (!myId) return null;
  const { data } = await supabase
    .from('reviews')
    .select('rating, comment')
    .eq('conversation_id', conversationId)
    .eq('reviewer_id', myId)
    .maybeSingle();
  if (!data) return null;
  const row = data as ReviewRow;
  return { rating: row.rating, comment: row.comment };
}

/**
 * Rates the other person in this conversation — one review per person per
 * conversation, so both sides can each leave one. Whichever aggregate applies
 * (seller_ratings or buyer_ratings) updates automatically since both are live
 * views over `reviews`. RLS only allows this between two actual participants,
 * so rating yourself or a stranger fails server-side either way.
 */
export async function submitReview(
  conversationId: string,
  subjectId: string,
  rating: number,
  comment: string,
): Promise<string | null> {
  if (!supabase) return 'Reviews aren’t set up yet.';
  const myId = await currentUserId();
  if (!myId) return 'Sign in to leave a rating.';
  const { error } = await supabase
    .from('reviews')
    .insert({ conversation_id: conversationId, reviewer_id: myId, subject_id: subjectId, rating, comment: comment.trim() });
  if (error) return error.message;
  refreshRemoteListings(); // picks up a seller's new average rating, if that's who was rated
  return null;
}

/** A buyer's public reputation — how sellers have rated them across past deals. */
export async function fetchBuyerRating(buyerId: string): Promise<{ avgRating: number; reviewCount: number } | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('buyer_ratings').select('avg_rating, review_count').eq('buyer_id', buyerId).maybeSingle();
  if (!data) return null;
  const row = data as RatingRow;
  return { avgRating: Number(row.avg_rating), reviewCount: row.review_count };
}
