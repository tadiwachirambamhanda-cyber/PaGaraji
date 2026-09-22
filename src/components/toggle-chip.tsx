import { Pressable, StyleSheet, Text } from 'react-native';

import { selectionChange } from '@/lib/haptics';
import { Colors, Fonts, Type } from '@/theme';

type ToggleChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

/** Single stamp-style choice that switches on and off. */
export function ToggleChip({ label, active = false, onPress }: ToggleChipProps) {
  return (
    <Pressable
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
      accessibilityState={{ selected: active }}
      onPress={() => {
        selectionChange();
        onPress();
      }}>
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    maxWidth: 200,
  },
  chipActive: {
    backgroundColor: Colors.header,
    borderColor: Colors.header,
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
