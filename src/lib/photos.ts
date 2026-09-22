import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { showAlert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';

/**
 * Photos a user adds are copied into the app's own documents folder so they
 * outlive the picker's temporary files. Stores keep only the file *name*: the
 * absolute path of the documents folder can change between app updates, so the
 * full URI is rebuilt at display time with `photoUri`.
 */
// Built on demand so importing this file never touches the filesystem (e.g. on web).
const getPhotoDir = () => new Directory(Paths.document, 'photos');

const LISTING_BUCKET = 'listing-photos';

/** Online photos are stored as "userId/file.jpg"; on-device ones are bare file names. */
export function isRemotePhoto(name: string) {
  return name.includes('/');
}

export function photoUri(name: string): string {
  if (isRemotePhoto(name)) {
    return supabase?.storage.from(LISTING_BUCKET).getPublicUrl(name).data.publicUrl ?? '';
  }
  return new File(getPhotoDir(), name).uri;
}

const REQUEST_BUCKET = 'request-photos';

/** Uploads on-device photos into the signed-in user's own folder of a bucket; returns the storage paths. */
async function uploadTo(bucket: string, userId: string, names: readonly string[]): Promise<string[]> {
  if (!supabase) throw new Error('No backend');
  const uploaded: string[] = [];
  try {
    for (const name of names) {
      const bytes = await new File(getPhotoDir(), name).arrayBuffer();
      const ext = name.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, bytes, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg' });
      if (error) throw error;
      uploaded.push(path);
    }
    return uploaded;
  } catch (error) {
    // Don't leave half an upload behind.
    await removeFrom(bucket, uploaded);
    throw error;
  }
}

async function removeFrom(bucket: string, paths: readonly string[]) {
  if (!supabase || paths.length === 0) return;
  await supabase.storage.from(bucket).remove([...paths]).catch(() => {});
}

export const uploadListingPhotos = (userId: string, names: readonly string[]) => uploadTo(LISTING_BUCKET, userId, names);
export const uploadRequestPhotos = (userId: string, names: readonly string[]) => uploadTo(REQUEST_BUCKET, userId, names);
export const removeRemotePhotos = (paths: readonly string[]) => removeFrom(LISTING_BUCKET, paths);
export const removeRequestPhotos = (paths: readonly string[]) => removeFrom(REQUEST_BUCKET, paths);

function persist(sourceUri: string): string {
  const photoDir = getPhotoDir();
  photoDir.create({ intermediates: true, idempotent: true });
  const ext = sourceUri.split('?')[0].split('.').pop()?.toLowerCase();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext && ext.length <= 4 ? ext : 'jpg'}`;
  new File(sourceUri).copy(new File(photoDir, name));
  return name;
}

const PICKER_OPTIONS = { mediaTypes: ['images' as const], quality: 0.7 };

/** Opens the photo library. Returns saved file names (empty if cancelled). */
export async function pickFromLibrary(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    ...PICKER_OPTIONS,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((asset) => persist(asset.uri));
}

/** Opens the camera. Returns the saved file name (empty if cancelled or not allowed). */
export async function takePhoto(): Promise<string[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    showAlert('Camera is off', 'Allow camera access in Settings to take photos.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
    return [];
  }
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  if (result.canceled) return [];
  return result.assets.map((asset) => persist(asset.uri));
}

export function deletePhotos(names: readonly string[] | undefined) {
  for (const name of names ?? []) {
    if (isRemotePhoto(name)) continue;
    try {
      const file = new File(getPhotoDir(), name);
      if (file.exists) file.delete();
    } catch {
      // Already gone or unreadable — nothing to clean up.
    }
  }
}

export function clearAllPhotos() {
  try {
    const photoDir = getPhotoDir();
    if (photoDir.exists) photoDir.delete();
  } catch {
    // Nothing saved yet.
  }
}
