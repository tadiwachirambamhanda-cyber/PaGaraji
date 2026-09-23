import { useState, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { LocationIcon } from '@/components/icons';
import { useDeviceLocation, type Coordinate } from '@/lib/location';
import { Fonts, Radii, Spacing, Type, useColors, type ColorPalette } from '@/theme';

// react-native-maps has no web renderer — only require it off web.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Maps = Platform.OS === 'web' ? null : (require('react-native-maps') as typeof import('react-native-maps'));

type LocationPickerMapProps = {
  value: Coordinate | null;
  onChange: (coordinate: Coordinate | null) => void;
};

/**
 * A drag-the-map-not-the-pin picker: the pin stays fixed in the center of the
 * sheet, and moving the map updates the coordinate underneath it. More reliable
 * across platforms than a draggable marker, and the standard pattern for this.
 */
function PickerSheet({
  visible,
  initial,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initial: Coordinate;
  onConfirm: (coordinate: Coordinate) => void;
  onClose: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [pending, setPending] = useState<Coordinate>(initial);

  if (!Maps) return null;
  const MapView = Maps.default;

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="80%">
      <Text style={styles.sheetTitle}>Drop your pin</Text>
      <Text style={styles.sheetSubtitle}>Move the map so the pin sits where you’d like sellers to find you.</Text>
      <View style={styles.mapBox}>
        <MapView
          style={StyleSheet.absoluteFill}
          userInterfaceStyle={Platform.OS === 'ios' ? 'dark' : undefined}
          initialRegion={{ ...initial, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
          onRegionChangeComplete={(region: { latitude: number; longitude: number }) =>
            setPending({ latitude: region.latitude, longitude: region.longitude })
          }
        />
        <View pointerEvents="none" style={styles.centerPin} />
      </View>
      <Button label="Use this location" variant="primary" onPress={() => onConfirm(pending)} />
    </BottomSheet>
  );
}

/** "Pin your location (optional)" row for the Request form — opens a map to drop a pin. */
export function LocationPickerMap({ value, onChange }: LocationPickerMapProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { coordinate: deviceCoordinate } = useDeviceLocation();

  if (Platform.OS === 'web' || !Maps) {
    return (
      <View style={styles.row}>
        <LocationIcon size={16} color={Colors.muted} />
        <Text style={styles.webNote}>Pinning an exact spot needs the phone app — a city is enough for now.</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => setSheetOpen(true)}>
        <LocationIcon size={16} color={Colors.header} />
        <Text style={styles.rowText}>{value ? 'Pin added — tap to change' : 'Add a pin (optional)'}</Text>
        {value && (
          <Pressable hitSlop={8} onPress={() => onChange(null)}>
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        )}
      </Pressable>
      <PickerSheet
        visible={sheetOpen}
        initial={value ?? deviceCoordinate}
        onConfirm={(coordinate) => {
          onChange(coordinate);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  remove: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.danger,
    textDecorationLine: 'underline',
  },
  webNote: {
    flex: 1,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  sheetTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  sheetSubtitle: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  mapBox: {
    height: 320,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: Colors.cardImage,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 16,
    height: 16,
    marginTop: -20,
    marginLeft: -8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.ink,
    transform: [{ rotate: '45deg' }],
  },
});
}
