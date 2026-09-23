import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { selectionChange } from '@/lib/haptics';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type SegmentedControlProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Content-width choices, left-aligned, for secondary controls. */
  compact?: boolean;
};

/** Equal-width choices drawn like stamps: dashed outline, filled when chosen. */
export function SegmentedControl<T extends string>({ options, value, onChange, compact }: SegmentedControlProps<T>) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            style={[styles.option, compact ? styles.optionCompact : styles.optionFill, active ? styles.optionActive : styles.optionInactive]}
            onPress={() => {
              selectionChange();
              onChange(option);
            }}>
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    option: {
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1.5,
    },
    // Equal-width choices share the row. Don't combine `flex` with basis overrides:
    // on iOS `flex: 1` wins and squeezes the label to zero width.
    optionFill: {
      flex: 1,
      paddingVertical: 11,
    },
    optionCompact: {
      paddingVertical: 7,
      paddingHorizontal: 18,
    },
    optionActive: {
      backgroundColor: Colors.header,
      borderColor: Colors.ink,
    },
    optionInactive: {
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
