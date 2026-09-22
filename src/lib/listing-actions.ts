import type { Listing } from '@/data/listings';
import { deletePhotos, isRemotePhoto, removeRemotePhotos, uploadListingPhotos } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import { removeListing, updateListing } from '@/store/my-listings';
import { refreshRemoteListings } from '@/store/remote-listings';

/** What a seller fills in. `photos` are on-device file names or, when editing, existing online paths. */
export type ListingFields = {
  categoryId: string;
  title: string;
  fitment: string;
  price: number;
  condition: Listing['condition'];
  description: string;
  photos: string[];
};

export type NewListingFields = ListingFields & {
  origin: Listing['origin'];
  location: string;
  leadTime: string;
  sellerName: string;
  sellerPhone: string;
};

/** Every action returns an error message to show, or null on success. */
type Outcome = Promise<string | null>;

function explain(error: { code?: string; message: string }): string {
  if (error.code === '42501') {
    return 'That isn’t allowed. Import listings need an approved supplier account.';
  }
  const text = error.message.toLowerCase();
  if (text.includes('network') || text.includes('fetch')) return 'Couldn’t reach the server. Check your connection and try again.';
  return error.message;
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Posts a new listing to the server, uploading its photos first. */
export async function postListing(input: NewListingFields): Outcome {
  if (!supabase) return 'Posting online isn’t set up yet.';
  const userId = await currentUserId();
  if (!userId) return 'Sign in to post a listing.';

  let paths: string[] = [];
  try {
    paths = await uploadListingPhotos(userId, input.photos);
  } catch {
    return 'Couldn’t upload your photos. Check your connection and try again.';
  }

  const { error } = await supabase.from('listings').insert({
    seller_id: userId,
    seller_name: input.sellerName,
    seller_phone: input.sellerPhone,
    category_id: input.categoryId,
    title: input.title,
    fitment: input.fitment,
    price: input.price,
    condition: input.condition,
    origin: input.origin,
    location: input.location,
    lead_time: input.leadTime,
    description: input.description,
    photos: paths,
  });
  if (error) {
    await removeRemotePhotos(paths);
    return explain(error);
  }

  deletePhotos(input.photos); // the on-device copies are no longer needed
  await refreshRemoteListings();
  return null;
}

/** Saves edits to a listing you own, online or on this phone. */
export async function editListing(listing: Listing, fields: ListingFields): Outcome {
  if (!listing.remote) {
    updateListing(listing.id, { ...fields });
    deletePhotos((listing.photos ?? []).filter((n) => !fields.photos.includes(n)));
    return null;
  }
  if (!supabase) return 'Editing online isn’t set up yet.';
  const userId = await currentUserId();
  if (!userId) return 'Sign in to edit this listing.';

  const previous = listing.photos ?? [];
  const newLocal = fields.photos.filter((n) => !isRemotePhoto(n));
  let uploaded: string[] = [];
  try {
    uploaded = await uploadListingPhotos(userId, newLocal);
  } catch {
    return 'Couldn’t upload your photos. Check your connection and try again.';
  }

  // Keep the order the seller chose: online paths stay, on-device names become their uploaded paths.
  let next = 0;
  const finalPhotos = fields.photos.map((n) => (isRemotePhoto(n) ? n : uploaded[next++]));

  const { error } = await supabase
    .from('listings')
    .update({
      category_id: fields.categoryId,
      title: fields.title,
      fitment: fields.fitment,
      price: fields.price,
      condition: fields.condition,
      description: fields.description,
      photos: finalPhotos,
    })
    .eq('id', listing.id);
  if (error) {
    await removeRemotePhotos(uploaded);
    return explain(error);
  }

  await removeRemotePhotos(previous.filter((p) => !finalPhotos.includes(p)));
  deletePhotos(newLocal);
  await refreshRemoteListings();
  return null;
}

export async function setListingSold(listing: Listing, sold: boolean): Outcome {
  if (!listing.remote) {
    updateListing(listing.id, { sold });
    return null;
  }
  if (!supabase) return 'Editing online isn’t set up yet.';
  const { error } = await supabase.from('listings').update({ sold }).eq('id', listing.id);
  if (error) return explain(error);
  await refreshRemoteListings();
  return null;
}

export async function deleteListing(listing: Listing): Outcome {
  if (!listing.remote) {
    removeListing(listing.id);
    return null;
  }
  if (!supabase) return 'Deleting online isn’t set up yet.';
  const { error } = await supabase.from('listings').delete().eq('id', listing.id);
  if (error) return explain(error);
  await removeRemotePhotos(listing.photos ?? []);
  await refreshRemoteListings();
  return null;
}
