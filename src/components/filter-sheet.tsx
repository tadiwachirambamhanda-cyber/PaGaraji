import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { ToggleChip } from '@/components/toggle-chip';
import type { Condition, Listing, Origin } from '@/data/listings';
import { fitsVehicle } from '@/lib/fitment';
import { selectionChange } from '@/lib/haptics';
import { useVehicle, type Vehicle } from '@/store/vehicle';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

export type Filters = {
  minPrice: string;
  maxPrice: string;
  conditions: Condition[];
  origins: Origin[];
  fitsVehicle: boolean;
};

export const EMPTY_FILTERS: Filters = { minPrice: '', maxPrice: '', conditions: [], origins: [], fitsVehicle: false };

export function isFiltersActive(filters: Filters) {
  return (
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.conditions.length > 0 ||
    filters.origins.length > 0 ||
    filters.fitsVehicle
  );
}

export function applyFilters(items: Listing[], filters: Filters, vehicle: Vehicle | null): Listing[] {
  const min = filters.minPrice === '' ? null : Number(filters.minPrice);
  const max = filters.maxPrice === '' ? null : Number(filters.maxPrice);
  return items.filter((item) => {
    const matchesMin = min === null || Number.isNaN(min) || item.price >= min;
    const matchesMax = max === null || Number.isNaN(max) || item.price <= max;
    const matchesCondition = filters.conditions.length === 0 || filters.conditions.includes(item.condition);
    const matchesOrigin = filters.origins.length === 0 || filters.origins.includes(item.origin);
    const matchesFit = !filters.fitsVehicle || vehicle === null || fitsVehicle(item, vehicle);
    return matchesMin && matchesMax && matchesCondition && matchesOrigin && matchesFit;
  });
}

const CONDITIONS: Condition[] = ['New', 'Used', 'Refurb'];
const ORIGINS: Origin[] = ['Local', 'Dubai', 'China'];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

type FilterSheetProps = {
  visible: boolean;
  draft: Filters;
  onChangeDraft: (filters: Filters) => void;
  baseListings: Listing[];
  onApply: () => void;
  onClose: () => void;
};

export function FilterSheet({ visible, draft, onChangeDraft, baseListings, onApply, onClose }: FilterSheetProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const vehicle = useVehicle();
  const previewCount = applyFilters(baseListings, draft, vehicle).length;

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="80%">
        <View style={styles.headerRow}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={() => onChangeDraft(EMPTY_FILTERS)} hitSlop={8}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Price range (USD)</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Min"
                placeholderTextColor={Colors.placeholder}
                keyboardType="numeric"
                value={draft.minPrice}
                onChangeText={(text) => onChangeDraft({ ...draft, minPrice: text })}
              />
              <Text style={styles.priceDash}>–</Text>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Max"
                placeholderTextColor={Colors.placeholder}
                keyboardType="numeric"
                value={draft.maxPrice}
                onChangeText={(text) => onChangeDraft({ ...draft, maxPrice: text })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Condition</Text>
            <View style={styles.chipRow}>
              {CONDITIONS.map((c) => {
                const active = draft.conditions.includes(c);
                return (
                  <Pressable
                    key={c}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                    onPress={() => {
                      selectionChange();
                      onChangeDraft({ ...draft, conditions: toggle(draft.conditions, c) });
                    }}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Origin</Text>
            <View style={styles.chipRow}>
              {ORIGINS.map((o) => {
                const active = draft.origins.includes(o);
                return (
                  <Pressable
                    key={o}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                    onPress={() => {
                      selectionChange();
                      onChangeDraft({ ...draft, origins: toggle(draft.origins, o) });
                    }}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{o}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your vehicle</Text>
            {vehicle ? (
              <View style={styles.chipRow}>
                <ToggleChip
                  label={`Fits my ${vehicle.model}`}
                  active={draft.fitsVehicle}
                  onPress={() => onChangeDraft({ ...draft, fitsVehicle: !draft.fitsVehicle })}
                />
              </View>
            ) : (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  onClose();
                  router.push('/my-vehicle');
                }}>
                <Text style={styles.addVehicle}>Add your vehicle to see parts that fit</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        <Button label={`Show ${previewCount} result${previewCount === 1 ? '' : 's'}`} variant="primary" onPress={onApply} />
    </BottomSheet>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.heading,
    color: Colors.ink,
  },
  resetText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.primary,
  },
  body: {
    gap: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  priceDash: {
    color: Colors.muted,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.ink,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.ink,
  },
  addVehicle: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
    textDecorationLine: 'underline',
  },
  chipRow: {
    flexDirection: 'row',
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
  chipText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
}
