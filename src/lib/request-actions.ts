import { removeRequestPhotos, uploadRequestPhotos, deletePhotos } from '@/lib/photos';
import { backendEnabled, supabase } from '@/lib/supabase';
import {
  addRequest,
  removeRequest,
  resetRequests,
  toggleRequestStatus,
  type PartRequest,
  type RequestSource,
} from '@/store/my-requests';
import { refreshRemoteRequests } from '@/store/remote-requests';

export type NewRequestFields = {
  partName: string;
  vehicle: string;
  source: RequestSource;
  categoryId: string;
  notes: string;
  /** On-device photo file names. */
  photos: string[];
  /** What you're willing to pay. Sellers can see this and offer it, or counter. */
  budget?: number;
};

/** Every action returns an error message to show, or null on success. */
type Outcome = Promise<string | null>;

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Saves a request to your account (or to this phone when there is no backend). */
export async function createRequest(input: NewRequestFields): Outcome {
  if (!backendEnabled) {
    addRequest(input);
    return null;
  }
  if (!supabase) return 'Couldn’t reach the server. Try again.';
  const userId = await currentUserId();
  if (!userId) return 'Sign in to post a request.';

  let paths: string[] = [];
  try {
    paths = await uploadRequestPhotos(userId, input.photos);
  } catch {
    return 'Couldn’t upload your photos. Check your connection and try again.';
  }

  const { error } = await supabase.from('requests').insert({
    user_id: userId,
    part_name: input.partName,
    vehicle: input.vehicle,
    source: input.source,
    category_id: input.categoryId,
    notes: input.notes,
    photos: paths,
    budget: input.budget ?? null,
  });
  if (error) {
    await removeRequestPhotos(paths);
    return error.message;
  }
  deletePhotos(input.photos); // the on-device copies are no longer needed
  await refreshRemoteRequests();
  return null;
}

/** Open <-> Closed for a plain request. A Matched one closes instead of reopening —
 * it already has an accepted offer, so "reopen" doesn't undo that. */
export async function toggleRequest(request: PartRequest): Outcome {
  if (!request.remote) {
    toggleRequestStatus(request.id);
    return null;
  }
  if (!supabase) return 'Couldn’t reach the server. Try again.';
  const nextStatus = request.status === 'Closed' ? 'Open' : 'Closed';
  const { error } = await supabase.from('requests').update({ status: nextStatus }).eq('id', request.id);
  if (error) return error.message;
  await refreshRemoteRequests();
  return null;
}

export async function deleteRequest(request: PartRequest): Outcome {
  if (!request.remote) {
    removeRequest(request.id);
    return null;
  }
  if (!supabase) return 'Couldn’t reach the server. Try again.';
  const { error } = await supabase.from('requests').delete().eq('id', request.id);
  if (error) return error.message;
  await removeRequestPhotos(request.photos ?? []);
  await refreshRemoteRequests();
  return null;
}

/** Deletes every request you have: on your account and on this phone. */
export async function clearMyRequests(): Outcome {
  resetRequests();
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data } = await supabase.from('requests').select('photos').eq('user_id', userId);
  const { error } = await supabase.from('requests').delete().eq('user_id', userId);
  if (error) return error.message;
  await removeRequestPhotos((data ?? []).flatMap((row) => (row.photos as string[] | null) ?? []));
  await refreshRemoteRequests();
  return null;
}
