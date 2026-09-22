import { Pressable, StyleSheet, Text, View } from 'react-native';

import { selectionChange } from '@/lib/haptics';
import { Colors, Fonts, Spacing, Type } from '@/theme';

type InlineToggleProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

/** Small text-only switch: the chosen word is dark with an underline, the others are grey. */
export function InlineToggle<T extends string>({ options, value, onChange }: InlineToggleProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            hitSlop={6}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => {
              selectionChange();
              onChange(option);
            }}>
            <Text style={[styles.label, active && styles.labelActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  item: {
    paddingBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  itemActive: {
    borderBottomColor: Colors.header,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.muted,
  },
  labelActive: {
    fontFamily: Fonts.bodyBold,
    color: Colors.ink,
  },
});
