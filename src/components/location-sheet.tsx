import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { CheckIcon, LocationIcon } from '@/components/icons';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

export const ZIMBABWE_CITIES = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe', 'Masvingo'];

type LocationSheetProps = {
  visible: boolean;
  value: string;
  onSelect: (city: string) => void;
  onClose: () => void;
};

export function LocationSheet({ visible, value, onSelect, onClose }: LocationSheetProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <BottomSheet visible={visible} onClose={onClose} gap={Spacing.xs}>
        <Text style={styles.title}>Choose your city</Text>
        {ZIMBABWE_CITIES.map((city) => {
          const active = city === value;
          return (
            <Pressable
              key={city}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => onSelect(city)}>
              <LocationIcon size={16} color={active ? Colors.header : Colors.muted} />
              <Text style={[styles.cityText, active && styles.cityTextActive]}>{city}</Text>
              {active && <CheckIcon size={18} color={Colors.header} />}
            </Pressable>
          );
        })}
    </BottomSheet>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowPressed: {
    opacity: 0.7,
  },
  cityText: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.body,
    color: Colors.ink,
  },
  cityTextActive: {
    fontFamily: Fonts.headingSemiBold,
    color: Colors.ink,
  },
});
}
