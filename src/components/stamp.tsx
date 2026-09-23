import { StyleSheet, Text, View } from 'react-native';

import type { Listing } from '@/data/listings';
import { Colors, Fonts, Type } from '@/theme';

/** "LOCAL · HARARE" or "CHINA IMPORT" — derived from where the part is coming from. */
export function stampLabel(listing: Pick<Listing, 'origin' | 'location'>): string {
  if (listing.origin === 'Local') {
    const city =
      listing.location
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '' && part.toLowerCase() !== 'zimbabwe')
        .pop() ?? '';
    return city ? `LOCAL · ${city.toUpperCase()}` : 'LOCAL';
  }
  return `${listing.origin.toUpperCase()} IMPORT`;
}

/** Toolbox-label style origin mark: solid border, square — no tilt, no dashes. */
export function Stamp({ label, imported = false, color: override }: { label: string; imported?: boolean; color?: string }) {
  const color = override ?? (imported ? Colors.importInk : Colors.header);
  return (
    <View style={[styles.stamp, { borderColor: color }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.caption,
    letterSpacing: 0.6,
  },
});
