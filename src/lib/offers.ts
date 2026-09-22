import { refreshConversations } from '@/store/conversations';
import { refreshOpenRequests } from '@/store/open-requests';
import { refreshRemoteRequests } from '@/store/remote-requests';
import { supabase } from '@/lib/supabase';

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export type RequestOffer = {
  id: string;
  requestId: string;
  sellerId: string;
  price: number;
  message: string;
  listingId?: string;
  status: OfferStatus;
  createdAt: number;
  // Only populated by fetchOffersForRequest (the request owner's view of who's bidding).
  sellerName?: string;
  sellerRating?: number;
  sellerReviewCount?: number;
  verified?: boolean;
};

type OfferRow = {
  id: string;
  request_id: string;
  seller_id: string;
  price: number | string;
  message: string;
  listing_id: string | null;
  status: OfferStatus;
  created_at: string;
};

function fromRow(row: OfferRow): RequestOffer {
  return {
    id: row.id,
    requestId: row.request_id,
    sellerId: row.seller_id,
    price: Number(row.price),
    message: row.message,
    listingId: row.listing_id ?? undefined,
    status: row.status,
    createdAt: Date.parse(row.created_at),
  };
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Every offer on a request, cheapest first — enriched with each seller's name, rating and
 * Verified status. RLS only ever actually returns rows for the request's own owner; a seller
 * viewing this on someone else's request would just get their own single offer back, if any.
 */
export async function fetchOffersForRequest(requestId: string): Promise<RequestOffer[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('request_offers')
    .select('*')
    .eq('request_id', requestId)
    .order('price', { ascending: true });
  if (error || !data) return [];
  const rows = data as OfferRow[];
  if (rows.length === 0) return [];

  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const [profilesResult, ratingsResult, verifiedResult] = await Promise.all([
    supabase.from('profiles').select('id, name').in('id', sellerIds),
    supabase.from('seller_ratings').select('seller_id, avg_rating, review_count').in('seller_id', sellerIds),
    supabase.from('verified_suppliers').select('user_id').in('user_id', sellerIds),
  ]);
  const names = new Map((profilesResult.data ?? []).map((p) => [p.id as string, p.name as string]));
  const ratings = new Map(
    (ratingsResult.data ?? []).map((r) => [
      r.seller_id as string,
      { avg: Number(r.avg_rating), count: r.review_count as number },
    ]),
  );
  const verifiedIds = new Set((verifiedResult.data ?? []).map((v) => v.user_id as string));

  return rows.map((row) => {
    const rating = ratings.get(row.seller_id);
    return {
      ...fromRow(row),
      sellerName: names.get(row.seller_id) || 'PaGaraji user',
      sellerRating: rating?.avg,
      sellerReviewCount: rating?.count,
      verified: verifiedIds.has(row.seller_id),
    };
  });
}

/** Your own offer on a request, if you've made one — for showing "Offer sent" instead of the form. */
export async function fetchMyOffer(requestId: string): Promise<RequestOffer | null> {
  if (!supabase) return null;
  const myId = await currentUserId();
  if (!myId) return null;
  const { data } = await supabase
    .from('request_offers')
    .select('*')
    .eq('request_id', requestId)
    .eq('seller_id', myId)
    .maybeSingle();
  return data ? fromRow(data as OfferRow) : null;
}

/** Makes an offer on someone else's Open request. Returns an error message, or null on success. */
export async function submitOffer(
  requestId: string,
  price: number,
  message: string,
  listingId?: string,
): Promise<string | null> {
  if (!supabase) return 'Offers aren’t set up yet.';
  const myId = await currentUserId();
  if (!myId) return 'Sign in to make an offer.';
  const { error } = await supabase.from('request_offers').insert({
    request_id: requestId,
    seller_id: myId,
    price,
    message: message.trim(),
    listing_id: listingId ?? null,
  });
  if (error) return error.code === '23505' ? 'You’ve already made an offer on this request.' : error.message;
  return null;
}

/** Withdraws your own pending offer. */
export async function withdrawOffer(offerId: string): Promise<string | null> {
  if (!supabase) return 'Offers aren’t set up yet.';
  const { error } = await supabase.from('request_offers').update({ status: 'withdrawn' }).eq('id', offerId);
  return error ? error.message : null;
}

/** Accepts an offer: declines the rest, matches the request, and opens (or reuses) a chat with the seller. */
export async function acceptOffer(offerId: string): Promise<{ conversationId: string } | { error: string }> {
  if (!supabase) return { error: 'Offers aren’t set up yet.' };
  const { data, error } = await supabase.rpc('accept_request_offer', { p_offer_id: offerId });
  if (error) return { error: error.message };
  await Promise.all([refreshRemoteRequests(), refreshOpenRequests(), refreshConversations()]);
  return { conversationId: data as string };
}
