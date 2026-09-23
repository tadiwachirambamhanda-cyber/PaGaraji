import { refreshConversations } from '@/store/conversations';
import { refreshOpenRequests } from '@/store/open-requests';
import { refreshRemoteRequests } from '@/store/remote-requests';
import { supabase } from '@/lib/supabase';

export type OfferStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'withdrawn' | 'cancelled';

export type RequestOffer = {
  id: string;
  requestId: string;
  sellerId: string;
  price: number;
  message: string;
  listingId?: string;
  status: OfferStatus;
  createdAt: number;
  /** The buyer's counter-price, once status is 'countered' (or was, if since declined). */
  counterPrice?: number;
  // Only populated by fetchOffersForRequest (the request owner's view of who's bidding).
  sellerName?: string;
  sellerRating?: number;
  sellerReviewCount?: number;
  verified?: boolean;
  /** How fast this seller typically offers after a request goes up. Undefined below the sample-size floor. */
  avgResponseMinutes?: number;
  /** % of this seller's decided offers (accepted/declined/cancelled) that won. Undefined below the floor. */
  winRate?: number;
  /** When this seller was last seen active in the app. */
  sellerLastActiveAt?: number;
};

type OfferRow = {
  id: string;
  request_id: string;
  seller_id: string;
  price: number | string;
  message: string;
  listing_id: string | null;
  status: OfferStatus;
  counter_price: number | string | null;
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
    counterPrice: row.counter_price !== null ? Number(row.counter_price) : undefined,
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
  const [profilesResult, ratingsResult, verifiedResult, statsResult] = await Promise.all([
    supabase.from('profiles').select('id, name, last_active_at').in('id', sellerIds),
    supabase.from('seller_ratings').select('seller_id, avg_rating, review_count').in('seller_id', sellerIds),
    supabase.from('verified_suppliers').select('user_id').in('user_id', sellerIds),
    supabase.from('seller_offer_stats').select('seller_id, avg_response_minutes, offers_decided, offers_won').in('seller_id', sellerIds),
  ]);
  const names = new Map((profilesResult.data ?? []).map((p) => [p.id as string, p.name as string]));
  const lastActive = new Map(
    (profilesResult.data ?? [])
      .filter((p) => p.last_active_at !== null)
      .map((p) => [p.id as string, Date.parse(p.last_active_at as string)]),
  );
  const ratings = new Map(
    (ratingsResult.data ?? []).map((r) => [
      r.seller_id as string,
      { avg: Number(r.avg_rating), count: r.review_count as number },
    ]),
  );
  const verifiedIds = new Set((verifiedResult.data ?? []).map((v) => v.user_id as string));
  const stats = new Map(
    (statsResult.data ?? []).map((s) => [
      s.seller_id as string,
      { avgResponseMinutes: s.avg_response_minutes as number, offersDecided: s.offers_decided as number, offersWon: s.offers_won as number },
    ]),
  );

  return rows.map((row) => {
    const rating = ratings.get(row.seller_id);
    const stat = stats.get(row.seller_id);
    return {
      ...fromRow(row),
      sellerName: names.get(row.seller_id) || 'PaGaraji user',
      sellerRating: rating?.avg,
      sellerReviewCount: rating?.count,
      verified: verifiedIds.has(row.seller_id),
      avgResponseMinutes: stat?.avgResponseMinutes,
      winRate: stat && stat.offersDecided >= 3 ? Math.round((stat.offersWon / stat.offersDecided) * 100) : undefined,
      sellerLastActiveAt: lastActive.get(row.seller_id),
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

/** The buyer proposes a different price on a still-pending offer. */
export async function counterOffer(offerId: string, counterPrice: number): Promise<string | null> {
  if (!supabase) return 'Offers aren’t set up yet.';
  const { error } = await supabase.rpc('counter_request_offer', { p_offer_id: offerId, p_counter_price: counterPrice });
  return error ? error.message : null;
}

/** The seller accepts or declines the buyer's counter-price. Accepting behaves like acceptOffer. */
export async function respondToCounterOffer(offerId: string, accept: boolean): Promise<{ conversationId: string | null } | { error: string }> {
  if (!supabase) return { error: 'Offers aren’t set up yet.' };
  const { data, error } = await supabase.rpc('respond_to_counter_offer', { p_offer_id: offerId, p_accept: accept });
  if (error) return { error: error.message };
  if (accept) await Promise.all([refreshRemoteRequests(), refreshOpenRequests(), refreshConversations()]);
  return { conversationId: (data as string | null) ?? null };
}

/** Backs out of a Matched request — either the buyer or the accepted seller can call this.
 * Reopens the request for new offers and marks the accepted offer 'cancelled'. */
export async function cancelMatch(requestId: string): Promise<string | null> {
  if (!supabase) return 'Offers aren’t set up yet.';
  const { error } = await supabase.rpc('cancel_matched_request', { p_request_id: requestId });
  if (error) return error.message;
  await Promise.all([refreshRemoteRequests(), refreshOpenRequests()]);
  return null;
}

/** Marks a Matched request done — either the buyer or the accepted seller can call this.
 * Closes the request out without touching the accepted offer, so it stays in Deal History. */
export async function completeMatch(requestId: string): Promise<string | null> {
  if (!supabase) return 'Offers aren’t set up yet.';
  const { error } = await supabase.rpc('complete_matched_request', { p_request_id: requestId });
  if (error) return error.message;
  await Promise.all([refreshRemoteRequests(), refreshOpenRequests()]);
  return null;
}

export type Deal = {
  requestId: string;
  offerId: string;
  partName: string;
  price: number;
  role: 'buyer' | 'seller';
  /** The other side of the deal — the seller if you bought, the buyer if you sold. */
  otherName: string;
  createdAt: number;
};

/**
 * Every deal you've closed, either side, newest first. `request_offers` RLS already
 * scopes reads to rows where you're the seller or the request's own buyer, so no
 * extra `.eq` is needed here — same trust boundary as fetchOffersForRequest.
 */
export async function fetchMyDeals(): Promise<Deal[]> {
  if (!supabase) return [];
  const myId = await currentUserId();
  if (!myId) return [];

  const { data: offerRows, error } = await supabase
    .from('request_offers')
    .select('id, request_id, seller_id, price, created_at')
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });
  if (error || !offerRows || offerRows.length === 0) return [];

  const requestIds = [...new Set(offerRows.map((r) => r.request_id as string))];
  const { data: requestRows } = await supabase.from('requests').select('id, part_name, user_id').in('id', requestIds);
  const requestsById = new Map((requestRows ?? []).map((r) => [r.id as string, r]));

  const otherIds = new Set<string>();
  for (const row of offerRows) {
    const request = requestsById.get(row.request_id as string);
    if (!request) continue;
    otherIds.add(row.seller_id === myId ? (request.user_id as string) : (row.seller_id as string));
  }
  const { data: profileRows } = await supabase.from('profiles').select('id, name').in('id', [...otherIds]);
  const names = new Map((profileRows ?? []).map((p) => [p.id as string, p.name as string]));

  const deals: Deal[] = [];
  for (const row of offerRows) {
    const request = requestsById.get(row.request_id as string);
    // Not resolvable under RLS (shouldn't happen after migration 0016, but a request
    // could since have been deleted) — skip rather than show a broken entry.
    if (!request) continue;
    const role: 'buyer' | 'seller' = row.seller_id === myId ? 'seller' : 'buyer';
    const otherId = role === 'seller' ? (request.user_id as string) : (row.seller_id as string);
    deals.push({
      requestId: row.request_id as string,
      offerId: row.id as string,
      partName: request.part_name as string,
      price: Number(row.price),
      role,
      otherName: names.get(otherId) || 'PaGaraji user',
      createdAt: Date.parse(row.created_at as string),
    });
  }
  return deals;
}
