import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { CategoryTabs } from '@/components/category-tabs';
import { applyFilters, EMPTY_FILTERS, FilterSheet, isFiltersActive, type Filters } from '@/components/filter-sheet';
import { BellIcon, ChevronDownIcon, LocationIcon } from '@/components/icons';
import { InlineToggle } from '@/components/inline-toggle';
import { ListingCard } from '@/components/listing-card';
import { LocationSheet } from '@/components/location-sheet';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { SORT_SHORT, SortSheet, type SortKey } from '@/components/sort-sheet';
import { Stitch } from '@/components/stitch';
import { ToggleChip } from '@/components/toggle-chip';
import { categories } from '@/data/categories';
import { useAllListings } from '@/store/my-listings';
import { saveProfile, useProfile } from '@/store/profile';
import { addRecentSearch, clearRecentSearches, useRecentSearches } from '@/store/recent-searches';
import { refreshRemoteListings } from '@/store/remote-listings';
import { useSettings, useSettingsHydrated } from '@/store/settings';
import { useVehicle } from '@/store/vehicle';
import { Colors, Fonts, Spacing, Type } from '@/theme';

const SOURCES = ['All', 'Local', 'Import'] as const;
type Source = (typeof SOURCES)[number];

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<Source>('All');
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortVisible, setSortVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const recentSearches = useRecentSearches();
  const { onboarded } = useSettings();
  const hydrated = useSettingsHydrated();
  const vehicle = useVehicle();
  const profile = useProfile();
  const [locationVisible, setLocationVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const listings = useAllListings();

  useEffect(() => {
    if (params.category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors a one-shot route param
      setSelectedCategory(params.category);
      // Consume the param immediately so it can't resurface later (e.g. on a
      // re-render or reload) and silently override a category the user picks
      // manually afterward.
      router.setParams({ category: undefined });
    }
  }, [params.category, router]);

  const query = search.trim().toLowerCase();
  const categoryAndSearchFiltered = listings.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesQuery =
      query === '' || item.title.toLowerCase().includes(query) || item.fitment.toLowerCase().includes(query);
    const matchesSource =
      source === 'All' || (source === 'Local' ? item.origin === 'Local' : item.origin !== 'Local');
    return matchesCategory && matchesQuery && matchesSource;
  });
  const filtered = applyFilters(categoryAndSearchFiltered, filters, vehicle);
  const sorted =
    sort === 'newest' ? filtered : [...filtered].sort((a, b) => (sort === 'low' ? a.price - b.price : b.price - a.price));
  const showRecents = searchFocused && search === '' && recentSearches.length > 0;

  // First launch: show the welcome screen once. Wait until saved settings are read so
  // returning users never see it flash.
  if (hydrated && !onboarded) return <Redirect href="/welcome" />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.header}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshRemoteListings();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <>
            <PageHeader
              compact
              title="What are you fixing today?"
              top={
                <View style={styles.topRow}>
                  <Pressable style={styles.location} hitSlop={8} onPress={() => setLocationVisible(true)}>
                    <LocationIcon size={16} color={Colors.header} />
                    <Text style={styles.locationText}>{profile.city}</Text>
                    <ChevronDownIcon size={13} color={Colors.header} />
                  </Pressable>
                  <Pressable accessibilityLabel="Notifications" hitSlop={10} onPress={() => router.push('/notifications')}>
                    <BellIcon size={22} color={Colors.ink} />
                  </Pressable>
                </View>
              }>
              <View style={styles.search}>
                <SearchBar
                  placeholder="Part, make or model"
                  value={search}
                  onChangeText={setSearch}
                  filtersActive={isFiltersActive(filters)}
                  onFocus={() => setSearchFocused(true)}
                  // Wait a beat so a tap on a recent search still lands before the list hides.
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  onSubmit={() => addRecentSearch(search)}
                  onFilterPress={() => {
                    setDraftFilters(filters);
                    setFilterVisible(true);
                  }}
                />
              </View>
            </PageHeader>

            {showRecents && (
              <View style={styles.recents}>
                <Text style={styles.recentLabel}>Recent</Text>
                {recentSearches.map((q) => (
                  <ToggleChip
                    key={q}
                    label={q}
                    onPress={() => {
                      setSearch(q);
                      addRecentSearch(q);
                    }}
                  />
                ))}
                <Pressable hitSlop={8} onPress={clearRecentSearches}>
                  <Text style={styles.link}>Clear</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.tabs}>
              <CategoryTabs categories={categories} value={selectedCategory} onChange={setSelectedCategory} />
            </View>

            <View style={styles.controls}>
              <InlineToggle options={SOURCES} value={source} onChange={setSource} />
              <Pressable hitSlop={8} onPress={() => setSortVisible(true)}>
                <Text style={styles.link}>
                  {sorted.length} {sorted.length === 1 ? 'part' : 'parts'} · {SORT_SHORT[sort]}
                </Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>Try another category or fewer filters. Or tell sellers what you need.</Text>
            <Pressable hitSlop={8} onPress={() => router.push('/request')}>
              <Text style={styles.link}>Request a part</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          <View style={styles.sellPrompt}>
            <Stitch />
            <Pressable
              style={({ pressed }) => [styles.sellRow, pressed && styles.pressed]}
              onPress={() => router.push('/request?view=sell')}>
              <View style={styles.sellText}>
                <Text style={styles.sellTitle}>Got parts to sell?</Text>
                <Text style={styles.sellDetail}>List them here, from your shelf or from overseas.</Text>
              </View>
              <Text style={styles.sellArrow}>→</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <ListingCard listing={item} half />}
      />

      <SortSheet
        visible={sortVisible}
        value={sort}
        onSelect={(key) => {
          setSort(key);
          setSortVisible(false);
        }}
        onClose={() => setSortVisible(false)}
      />

      <LocationSheet
        visible={locationVisible}
        value={profile.city}
        onSelect={(c) => {
          saveProfile({ ...profile, city: c });
          setLocationVisible(false);
        }}
        onClose={() => setLocationVisible(false)}
      />

      <FilterSheet
        visible={filterVisible}
        draft={draftFilters}
        onChangeDraft={setDraftFilters}
        baseListings={categoryAndSearchFiltered}
        onApply={() => {
          setFilters(draftFilters);
          setFilterVisible(false);
        }}
        onClose={() => setFilterVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.header,
  },
  search: {
    marginTop: Spacing.md,
  },
  recents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  recentLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.muted,
  },
  tabs: {
    paddingLeft: Spacing.xl,
    marginTop: Spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  link: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.header,
    textDecorationLine: 'underline',
  },
  gridRow: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  pressed: {
    opacity: 0.6,
  },
  sellPrompt: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  sellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  sellText: {
    flex: 1,
    gap: 2,
  },
  sellTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  sellDetail: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  sellArrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.body,
    color: Colors.header,
  },
  emptyState: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  emptyText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    lineHeight: 19,
    color: Colors.muted,
  },
});
