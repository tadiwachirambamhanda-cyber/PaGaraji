import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HeartIcon } from '@/components/icons';
import { ListingImage } from '@/components/listing-image';
import { Pop } from '@/components/pop';
import { PriceTag } from '@/components/price-tag';
import { Stamp, stampLabel } from '@/components/stamp';
import type { Listing } from '@/data/listings';
import { tapLight } from '@/lib/haptics';
import { fitsVehicle } from '@/lib/fitment';
import { toggleSaved, useIsSaved } from '@/store/saved-listings';
import { useVehicle } from '@/store/vehicle';
import { Colors, Fonts, Spacing, Type } from '@/theme';

type ListingCardProps = {
  listing: Listing;
  /** `hero` is the big lead card; `compact` sits two-up in a grid. */
  variant?: 'hero' | 'compact';
  /** Half-width grid cell, so an odd last item in a two-column list doesn't stretch across the row. */
  half?: boolean;
};

function SaveButton({ id }: { id: string }) {
  const saved = useIsSaved(id);
  return (
    <Pressable
      style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
      accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}
      hitSlop={8}
      onPress={() => {
        tapLight();
        toggleSaved(id);
      }}>
      <Pop active={saved}>
        <HeartIcon size={15} color={saved ? Colors.primary : Colors.ink} filled={saved} />
      </Pop>
    </Pressable>
  );
}

export function ListingCard({ listing, variant = 'compact', half }: ListingCardProps) {
  const { id, title, fitment, price, condition, location, origin, sellerName, sold } = listing;
  const router = useRouter();
  const isImported = origin !== 'Local';
  const hero = variant === 'hero';
  const vehicle = useVehicle();
  const fits = !sold && fitsVehicle(listing, vehicle);

  return (
    <Pressable style={({ pressed }) => [styles.card, half ? styles.half : styles.fill, sold && styles.sold, pressed && styles.pressed]} onPress={() => router.push(`/listing/${id}`)}>
      <View style={[styles.photo, hero ? styles.photoHero : styles.photoCompact]}>
        <ListingImage listing={listing} height={hero ? 190 : 108} iconSize={hero ? 56 : 38} />
        <View style={styles.tag}>
          <PriceTag price={price} size={hero ? 'lg' : 'md'} />
        </View>
        {sold ? (
          <View style={styles.stamp}>
            <Stamp label="SOLD" color={Colors.danger} />
          </View>
        ) : hero && (
          <View style={styles.stamp}>
            <Stamp label={stampLabel(listing)} imported={isImported} />
          </View>
        )}
        <View style={styles.save}>
          <SaveButton id={id} />
        </View>
      </View>

      <Text style={hero ? styles.titleHero : styles.title} numberOfLines={1}>
        {title}
      </Text>
      {hero && (
        <Text style={styles.fitment} numberOfLines={1}>
          {fitment}
        </Text>
      )}
      <Text style={[styles.meta, isImported && styles.metaImport]} numberOfLines={1}>
        {hero
          ? `${sellerName} · ${condition}`
          : isImported
            ? `${origin} import · ${condition}`
            : `${condition} · ${location}`}
      </Text>
      {fits && vehicle && (
        <Text style={styles.fits} numberOfLines={1}>
          ✓ Fits your {vehicle.model}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 2,
  },
  fill: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  half: {
    width: '47.5%',
  },
  sold: {
    opacity: 0.6,
  },
  photo: {
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  photoHero: {
    borderRadius: 16,
  },
  photoCompact: {
    borderRadius: 14,
  },
  tag: {
    position: 'absolute',
    left: 0,
    top: 14,
  },
  stamp: {
    position: 'absolute',
    top: 12,
    right: 10,
  },
  save: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(247,241,227,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleHero: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    lineHeight: 24,
    color: Colors.ink,
  },
  title: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.body,
    lineHeight: 20,
    color: Colors.ink,
  },
  fitment: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.ink,
  },
  meta: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  fits: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.header,
  },
  metaImport: {
    color: Colors.importInk,
  },
});
