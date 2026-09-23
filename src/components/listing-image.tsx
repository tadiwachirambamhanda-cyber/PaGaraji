import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { Listing } from '@/data/listings';
import { photoUri } from '@/lib/photos';
import { useColors } from '@/theme';

type ListingImageProps = {
  listing: Listing;
  height: number;
  iconSize?: number;
  style?: object;
};

export function ListingImage({ listing, height, iconSize = 38, style }: ListingImageProps) {
  const Colors = useColors();
  const { photos, Icon } = listing;
  const image = photos && photos.length > 0 ? { uri: photoUri(photos[0]) } : listing.image;

  if (image) {
    return (
      <View style={[{ height }, style]}>
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, { height, backgroundColor: Colors.cardImage }, style]}>
      <Icon size={iconSize} color={Colors.importInk} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
