import { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FilterIcon, SearchIcon } from '@/components/icons';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type SearchBarProps = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress?: () => void;
  filtersActive?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
};

/** Underlined field, like a line on a form — no box. */
export function SearchBar({
  placeholder,
  value,
  onChangeText,
  onFilterPress,
  filtersActive,
  onFocus,
  onBlur,
  onSubmit,
}: SearchBarProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.row}>
      <SearchIcon size={18} color={Colors.ink} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={onSubmit}
        autoCorrect={false}
      />
      {onFilterPress && (
        <Pressable
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
          accessibilityLabel="Filter results"
          hitSlop={8}
          onPress={onFilterPress}>
          <FilterIcon size={20} color={Colors.ink} />
          {filtersActive && <View style={styles.filterDot} />}
        </Pressable>
      )}
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderBottomWidth: 1.5,
      borderBottomColor: Colors.ink,
      paddingVertical: Spacing.sm,
    },
    input: {
      flex: 1,
      fontFamily: Fonts.bodyRegular,
      fontSize: Type.body,
      color: Colors.ink,
      padding: 0,
    },
    filterButton: {
      padding: 2,
    },
    pressed: {
      opacity: 0.6,
    },
    filterDot: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary,
    },
  });
}
