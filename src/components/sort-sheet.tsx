import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { CheckIcon } from '@/components/icons';
import { selectionChange } from '@/lib/haptics';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

export type SortKey = 'newest' | 'low' | 'high';

export const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  low: 'Cheapest first',
  high: 'Most expensive first',
};

export const SORT_SHORT: Record<SortKey, string> = {
  newest: 'Newest',
  low: 'Cheapest',
  high: 'Priciest',
};

type SortSheetProps = {
  visible: boolean;
  value: SortKey;
  onSelect: (key: SortKey) => void;
  onClose: () => void;
};

export function SortSheet({ visible, value, onSelect, onClose }: SortSheetProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <BottomSheet visible={visible} onClose={onClose} gap={Spacing.xs}>
      <Text style={styles.title}>Sort by</Text>
      {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => {
              selectionChange();
              onSelect(key);
            }}>
            <Text style={[styles.label, active && styles.labelActive]}>{SORT_LABELS[key]}</Text>
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
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.body,
    color: Colors.ink,
  },
  labelActive: {
    fontFamily: Fonts.headingSemiBold,
    color: Colors.ink,
  },
});
}
