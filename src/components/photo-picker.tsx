import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoViewer } from '@/components/photo-viewer';
import { selectionChange } from '@/lib/haptics';
import { deletePhotos, photoUri, pickFromLibrary, takePhoto } from '@/lib/photos';
import { showAlert } from '@/lib/alert';
import { Colors, Fonts, Spacing, Type } from '@/theme';

type PhotoPickerProps = {
  /** Saved photo file names (see lib/photos). */
  photos: string[];
  onChange: (photos: string[]) => void;
  max: number;
  hint?: string;
  /** Files that belong to something already saved: removing them from the row must not delete them. */
  keep?: readonly string[];
};

const TILE = 84;

/** Row of photo tiles plus a dashed "add" tile. Tap a photo to view it, ✕ to remove. */
export function PhotoPicker({ photos, onChange, max, hint, keep }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const add = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const added = source === 'camera' ? await takePhoto() : await pickFromLibrary(max - photos.length);
      if (added.length > 0) onChange([...photos, ...added].slice(0, max));
    } catch {
      showAlert('Couldn’t add that photo', 'Try again, or pick a different picture.');
    } finally {
      setBusy(false);
    }
  };

  const chooseSource = () => {
    selectionChange();
    showAlert('Add a photo', undefined, [
      { text: 'Take photo', onPress: () => add('camera') },
      { text: 'Choose from library', onPress: () => add('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const remove = (index: number) => {
    if (!keep?.includes(photos[index])) deletePhotos([photos[index]]);
    onChange(photos.filter((_, i) => i !== index));
  };

  if (Platform.OS === 'web') {
    return <Text style={styles.hint}>Photos can be added in the mobile app.</Text>;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((name, index) => (
          <View key={name} style={styles.tile}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewerIndex(index)}>
              <Image source={{ uri: photoUri(name) }} style={styles.image} contentFit="cover" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
              accessibilityLabel="Remove photo"
              hitSlop={8}
              onPress={() => remove(index)}>
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ))}
        {photos.length < max && (
          <Pressable
            style={({ pressed }) => [styles.tile, styles.add, pressed && styles.pressed]}
            disabled={busy}
            accessibilityLabel="Add a photo"
            onPress={chooseSource}>
            {busy ? (
              <ActivityIndicator color={Colors.header} />
            ) : (
              <>
                <Text style={styles.plus}>+</Text>
                <Text style={styles.addLabel}>Add photo</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
      <Text style={styles.hint}>
        {photos.length} of {max}
        {hint ? ` · ${hint}` : ''}
      </Text>

      <PhotoViewer
        sources={photos.map((name) => ({ uri: photoUri(name) }))}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  row: {
    gap: Spacing.sm,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EADFC8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  add: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.muted,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  plus: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.heading,
    lineHeight: 26,
    color: Colors.header,
  },
  addLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.caption,
    color: Colors.ink,
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: 'rgba(26,26,26,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.caption,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.6,
  },
  hint: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
  },
});
