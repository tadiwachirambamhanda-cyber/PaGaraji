import { supabase } from '@/lib/supabase';
import { getProfile, saveProfile, type Profile } from '@/store/profile';
import { refreshRemoteListings } from '@/store/remote-listings';

/**
 * After signing in, bring the saved profile down from the server. Anything the server
 * doesn't have yet (older accounts) is filled from what's on this phone and sent up.
 */
export async function pullProfile(userId: string): Promise<void> {
  if (!supabase) return;
  const [profileResult, contactResult] = await Promise.all([
    supabase.from('profiles').select('name, city').eq('id', userId).maybeSingle(),
    supabase.from('profile_contacts').select('whatsapp').eq('user_id', userId).maybeSingle(),
  ]);
  if (profileResult.error || contactResult.error) return;

  const local = getProfile();
  const next: Profile = {
    name: profileResult.data?.name || local.name,
    city: profileResult.data?.city || local.city,
    phone: contactResult.data?.whatsapp || local.phone,
  };
  saveProfile(next);

  // Older accounts have nothing on the server yet: send up what's on this phone, but never the
  // "Guest" placeholder or an empty number.
  const phoneToSend = !contactResult.data?.whatsapp && local.phone !== '';
  const nameToSend = !profileResult.data?.name && local.name !== 'Guest';
  if (phoneToSend || nameToSend) await pushProfile(next);
}

/** Saves the profile on the server, and refreshes the seller name and number on your online listings. */
export async function pushProfile(profile: Profile): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return null;

  const name = profile.name.trim();
  const [profileResult, contactResult] = await Promise.all([
    supabase.from('profiles').update({ name, city: profile.city }).eq('id', userId),
    supabase.from('profile_contacts').upsert({ user_id: userId, whatsapp: profile.phone }),
  ]);
  const failure = profileResult.error ?? contactResult.error;
  if (failure) return failure.message;

  await supabase.from('listings').update({ seller_name: name, seller_phone: profile.phone }).eq('seller_id', userId);
  await refreshRemoteListings();
  return null;
}
