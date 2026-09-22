import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { selectionChange } from '@/lib/haptics';
import { Colors, Fonts, Spacing, Type } from '@/theme';

type CategoryTabsProps = {
  categories: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
};

/** Plain text tabs with a sunflower underline on the active one. */
export function CategoryTabs({ categories, value, onChange }: CategoryTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((cat) => {
        const active = cat.id === value;
        return (
          <Pressable
            key={cat.id}
            hitSlop={6}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => {
              selectionChange();
              onChange(cat.id);
            }}>
            <Text style={[styles.label, active && styles.labelActive]}>{cat.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.xl,
    paddingRight: Spacing.xl,
  },
  tab: {
    paddingBottom: 5,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accent,
  },
  label: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.body,
    color: Colors.muted,
  },
  labelActive: {
    color: Colors.ink,
  },
});
