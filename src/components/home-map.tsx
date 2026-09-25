import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { CheckIcon, ChevronDownIcon, LocationIcon } from '@/components/icons';
import { coordinateFor } from '@/data/city-coordinates';
import type { Listing } from '@/data/listings';
import { selectionChange, tapLight } from '@/lib/haptics';
import { useDeviceLocation } from '@/lib/location';
import type { PartRequest } from '@/store/my-requests';
import { Fonts, Radii, Spacing, Type, useColors, type ColorPalette } from '@/theme';

// react-native-maps has no web renderer — only require it off web, so the web
// bundle never tries to load the native module at all.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Maps = Platform.OS === 'web' ? null : (require('react-native-maps') as typeof import('react-native-maps'));

// "All" plots every local seller, every import/Dubai-China seller, and every open request
// together — the actual "everything nearby" view. The other three narrow it down to just one
// kind, for whenever that's genuinely what someone's looking for.
const MAP_FILTERS = ['All', 'Local', 'Import', 'Requests'] as const;
type MapFilter = (typeof MAP_FILTERS)[number];

type HomeMapProps = {
  listings: Listing[];
  /** Other people's open requests — shown as a distinct pin, tap to go offer on one. */
  requests?: PartRequest[];
  height: number;
};

/** Nearby-sellers-and-requests map for Home. A static, honestly-labeled placeholder on web. */
export function HomeMap({ listings, requests = [], height }: HomeMapProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const { coordinate } = useDeviceLocation();
  const mapRef = useRef<import('react-native-maps').default>(null);
  const [filter, setFilter] = useState<MapFilter>('All');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const listingPins = useMemo(() => {
    let candidates: Listing[];
    if (filter === 'Requests') {
      candidates = [];
    } else if (filter === 'Local') {
      candidates = listings.filter((listing) => listing.origin === 'Local').slice(0, 60);
    } else if (filter === 'Import') {
      candidates = listings.filter((listing) => listing.origin !== 'Local').slice(0, 60);
    } else {
      // 'All': split the pin budget evenly across origins rather than one shared slice — otherwise
      // whichever origin happens to sort first in `listings` could crowd the other off the map
      // entirely, defeating the point of an "everything nearby" view.
      const local = listings.filter((listing) => listing.origin === 'Local').slice(0, 30);
      const imported = listings.filter((listing) => listing.origin !== 'Local').slice(0, 30);
      candidates = [...local, ...imported];
    }
    return candidates
      .map((listing) => ({ listing, coordinate: coordinateFor(listing) }))
      .filter((pin): pin is { listing: Listing; coordinate: NonNullable<typeof pin.coordinate> } => pin.coordinate !== null);
  }, [listings, filter]);
  const requestPins = useMemo(
    () =>
      (filter === 'All' || filter === 'Requests' ? requests : [])
        .slice(0, 40)
        .map((request) => ({ request, coordinate: coordinateFor(request) }))
        .filter((pin): pin is { request: PartRequest; coordinate: NonNullable<typeof pin.coordinate> } => pin.coordinate !== null),
    [requests, filter],
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
        // The Workshop mock's map is a dark charcoal panel with orange hatching, not a real
        // geographic map — MapKit's own dark mode is the closest real-map equivalent: a dark
        // basemap that lets our orange/white pins read as the only strong color on screen.
        userInterfaceStyle={Platform.OS === 'ios' ? 'dark' : undefined}
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
        style={({ pressed }) => [styles.filterPill, pressed && styles.recenterPressed]}
        onPress={() => {
          tapLight();
          setFilterSheetVisible(true);
        }}>
        <Text style={styles.filterPillText}>{filter}</Text>
        <ChevronDownIcon size={11} color={Colors.accent} />
      </Pressable>

      <BottomSheet visible={filterSheetVisible} onClose={() => setFilterSheetVisible(false)} gap={Spacing.xs}>
        <Text style={styles.sheetTitle}>Show on map</Text>
        {MAP_FILTERS.map((f) => {
          const active = f === filter;
          return (
            <Pressable
              key={f}
              style={({ pressed }) => [styles.sheetRow, pressed && styles.recenterPressed]}
              onPress={() => {
                selectionChange();
                setFilter(f);
                setFilterSheetVisible(false);
              }}>
              <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>{f}</Text>
              {active && <CheckIcon size={18} color={Colors.header} />}
            </Pressable>
          );
        })}
      </BottomSheet>

      <Pressable
        style={({ pressed }) => [styles.recenter, pressed && styles.recenterPressed]}
        accessibilityLabel="Center on your location"
        onPress={() => {
          tapLight();
          mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.35, longitudeDelta: 0.35 }, 300);
        }}>
        <LocationIcon size={17} color={Colors.accent} />
      </Pressable>
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
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
    borderColor: Colors.ink,
  },
  filterPill: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.header,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: Radii.chip,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterPillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.caption,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sheetTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetRowText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.body,
    color: Colors.ink,
  },
  sheetRowTextActive: {
    fontFamily: Fonts.headingSemiBold,
    color: Colors.ink,
  },
  recenter: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    width: 38,
    height: 38,
    borderRadius: Radii.sm,
    backgroundColor: Colors.header,
    borderWidth: 1.5,
    borderColor: Colors.accent,
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
}
