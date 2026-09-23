import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HeartIcon } from '@/components/icons';
import { ListingImage } from '@/components/listing-image';
import { Pop } from '@/components/pop';
import { PriceTag } from '@/components/price-tag';
import { Stamp, stampLabel } from '@/components/stamp';
import { coordinateFor } from '@/data/city-coordinates';
import type { Listing } from '@/data/listings';
import { distanceKm, formatDistance } from '@/lib/geo';
import { tapLight } from '@/lib/haptics';
import { fitsVehicle } from '@/lib/fitment';
import { useDeviceLocation } from '@/lib/location';
import { toggleSaved, useIsSaved } from '@/store/saved-listings';
import { useVehicle } from '@/store/vehicle';
import { Fonts, Radii, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type ListingCardProps = {
  listing: Listing;
  /** `hero` is the big lead card; `compact` sits two-up in a grid. */
  variant?: 'hero' | 'compact';
  /** Half-width grid cell, so an odd last item in a two-column list doesn't stretch across the row. */
  half?: boolean;
};

function SaveButton({ id }: { id: string }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
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
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id, title, fitment, price, condition, location, origin, sellerName, sold } = listing;
  const router = useRouter();
  const isImported = origin !== 'Local';
  const hero = variant === 'hero';
  const vehicle = useVehicle();
  const fits = !sold && fitsVehicle(listing, vehicle);
  // Only shown once we have a real fix — a distance guessed from the Harare
  // fallback would be misleading if location access was actually denied.
  const { coordinate: myCoordinate, granted } = useDeviceLocation();
  const listingCoordinate = coordinateFor(listing);
  const distanceLabel = granted && listingCoordinate ? `${formatDistance(distanceKm(myCoordinate, listingCoordinate))} away` : location;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, hero ? styles.cardHero : styles.cardCompact, half ? styles.half : styles.fill, sold && styles.sold, pressed && styles.pressed]}
      onPress={() => router.push(`/listing/${id}`)}>
      <View style={[styles.photo, hero ? styles.photoHero : styles.photoCompact]}>
        <ListingImage listing={listing} height={hero ? 190 : 108} iconSize={hero ? 56 : 38} />
        {hero && (
          <View style={styles.tag}>
            <PriceTag price={price} size="lg" />
          </View>
        )}
        {sold ? (
          <View style={styles.stamp}>
            <Stamp label="SOLD" color={Colors.danger} />
          </View>
        ) : listing.verified ? (
          // A stronger trust signal than where it ships from, so it takes the one stamp slot
          // even on the compact cards that otherwise skip the origin stamp entirely.
          <View style={styles.stamp}>
            <Stamp label="VERIFIED" color={Colors.header} />
          </View>
        ) : (
          hero && (
            <View style={styles.stamp}>
              <Stamp label={stampLabel(listing)} imported={isImported} />
            </View>
          )
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
      {hero ? (
        <Text style={[styles.meta, isImported && styles.metaImport]} numberOfLines={1}>
          {sellerName} · {condition}
        </Text>
      ) : (
        <View style={styles.compactMetaRow}>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>${price}</Text>
          </View>
          <Text style={[styles.compactMetaRight, isImported && styles.metaImport]} numberOfLines={1}>
            {isImported ? `${origin} import` : distanceLabel}
          </Text>
        </View>
      )}
      {fits && vehicle && (
        <Text style={styles.fits} numberOfLines={1}>
          ✓ Fits your {vehicle.model}
        </Text>
      )}
    </Pressable>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  card: {
    gap: 2,
  },
  cardHero: {},
  // A bordered, padded "toolbox card" — the Workshop mock's compact listing look.
  cardCompact: {
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: Radii.md,
    backgroundColor: Colors.card,
    padding: Spacing.sm,
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
    borderRadius: Radii.chip,
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
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  pricePill: {
    backgroundColor: Colors.header,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: Radii.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pricePillText: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.caption,
    color: Colors.accent,
  },
  compactMetaRight: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.caption,
    color: Colors.muted,
  },
  fits: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  metaImport: {
    color: Colors.importInk,
  },
});
}
