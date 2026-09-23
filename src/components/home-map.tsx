import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LocationIcon } from '@/components/icons';
import { coordinateFor } from '@/data/city-coordinates';
import type { Listing } from '@/data/listings';
import { tapLight } from '@/lib/haptics';
import { useDeviceLocation } from '@/lib/location';
import type { PartRequest } from '@/store/my-requests';
import { Colors, Fonts, Radii, Spacing, Type } from '@/theme';

// react-native-maps has no web renderer — only require it off web, so the web
// bundle never tries to load the native module at all.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Maps = Platform.OS === 'web' ? null : (require('react-native-maps') as typeof import('react-native-maps'));

type HomeMapProps = {
  listings: Listing[];
  /** Other people's open requests — shown as a distinct pin, tap to go offer on one. */
  requests?: PartRequest[];
  height: number;
};

/** Nearby-sellers-and-requests map for Home. A static, honestly-labeled placeholder on web. */
export function HomeMap({ listings, requests = [], height }: HomeMapProps) {
  const router = useRouter();
  const { coordinate } = useDeviceLocation();
  const mapRef = useRef<import('react-native-maps').default>(null);

  const listingPins = useMemo(
    () =>
      listings
        .slice(0, 60)
        .map((listing) => ({ listing, coordinate: coordinateFor(listing) }))
        .filter((pin): pin is { listing: Listing; coordinate: NonNullable<typeof pin.coordinate> } => pin.coordinate !== null),
    [listings],
  );
  const requestPins = useMemo(
    () =>
      requests
        .slice(0, 40)
        .map((request) => ({ request, coordinate: coordinateFor(request) }))
        .filter((pin): pin is { request: PartRequest; coordinate: NonNullable<typeof pin.coordinate> } => pin.coordinate !== null),
    [requests],
  );

  if (Platform.OS === 'web' || !Maps) {
    return (
      <View style={[styles.wrap, { height }]}>
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackTitle}>Map view</Text>
          <Text style={styles.webFallbackText}>Open PaGaraji on your phone to see sellers and requests plotted near you.</Text>
        </View>
      </View>
    );
  }

  const MapView = Maps.default;
  const { Marker, PROVIDER_DEFAULT } = Maps;

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{ ...coordinate, latitudeDelta: 0.35, longitudeDelta: 0.35 }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}>
        {listingPins.map(({ listing, coordinate: pin }) => (
          <Marker
            key={`listing-${listing.id}`}
            coordinate={pin}
            onPress={() => {
              tapLight();
              router.push(`/listing/${listing.id}`);
            }}>
            <View style={styles.pin} />
          </Marker>
        ))}
        {requestPins.map(({ request, coordinate: pin }) => (
          <Marker
            key={`request-${request.id}`}
            coordinate={pin}
            onPress={() => {
              tapLight();
              router.push(`/request/${request.id}`);
            }}>
            <View style={styles.requestPin} />
          </Marker>
        ))}
      </MapView>

      <Pressable
        style={({ pressed }) => [styles.recenter, pressed && styles.recenterPressed]}
        accessibilityLabel="Center on your location"
        onPress={() => {
          tapLight();
          mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.35, longitudeDelta: 0.35 }, 300);
        }}>
        <LocationIcon size={17} color={Colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.xl,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: Colors.cardImage,
  },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.ink,
    transform: [{ rotate: '45deg' }],
  },
  // Round, not diamond — a request "wants this" pin reads differently from a
  // listing "has this" pin at a glance.
  requestPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.card,
    borderWidth: 2.5,
    borderColor: Colors.header,
  },
  recenter: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    width: 38,
    height: 38,
    borderRadius: Radii.sm,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterPressed: {
    opacity: 0.75,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xl,
  },
  webFallbackTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  webFallbackText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
    textAlign: 'center',
  },
});
