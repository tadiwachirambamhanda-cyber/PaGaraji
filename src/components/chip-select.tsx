import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { selectionChange } from '@/lib/haptics';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type ChipOption = { id: string; label: string };

type ChipSelectProps = {
  options: readonly ChipOption[];
  value: string;
  onChange: (id: string) => void;
};

/** Scrolling row of stamp-style choices. */
export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
            onPress={() => {
              selectionChange();
              onChange(option.id);
            }}>
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      gap: Spacing.sm,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    chipActive: {
      backgroundColor: Colors.header,
      borderColor: Colors.ink,
    },
    chipInactive: {
      borderColor: Colors.line,
    },
    label: {
      fontFamily: Fonts.headingSemiBold,
      fontSize: Type.small,
    },
    labelActive: {
      color: '#FFFFFF',
    },
    labelInactive: {
      color: Colors.ink,
    },
  });
}
