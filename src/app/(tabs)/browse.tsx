import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { Stitch } from '@/components/stitch';
import { categories } from '@/data/categories';
import { refreshAll } from '@/lib/refresh';
import { useAllListings } from '@/store/my-listings';
import { Colors, Fonts, Spacing, Type } from '@/theme';

export default function BrowseScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const listings = useAllListings();

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, []),
  );

  const query = search.trim().toLowerCase();
  const filtered = categories.filter((cat) => query === '' || cat.label.toLowerCase().includes(query));

  const countFor = (categoryId: string) =>
    categoryId === 'all' ? listings.length : listings.filter((l) => l.categoryId === categoryId).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={Colors.header}
          onRefresh={async () => {
            setRefreshing(true);
            await refreshAll();
            setRefreshing(false);
          }}
        />
      }>
      <PageHeader title="Browse by part" subtitle="Local sellers, plus imports from Dubai and China.">
        <View style={styles.search}>
          <SearchBar placeholder="Search a category" value={search} onChangeText={setSearch} />
        </View>
      </PageHeader>

      <View style={styles.list}>
        {filtered.map((cat, index) => {
          const count = countFor(cat.id);
          return (
            <View key={cat.id}>
              {index > 0 && <Stitch color={Colors.muted} thickness={1} />}
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => router.push({ pathname: '/', params: { category: cat.id } })}>
                <Text style={styles.label}>{cat.label}</Text>
                <Text style={styles.count}>{count === 0 ? 'none yet' : `${count} ${count === 1 ? 'part' : 'parts'}`}</Text>
                <Text style={styles.arrow}>→</Text>
              </Pressable>
            </View>
          );
        })}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No category matches “{search.trim()}”</Text>
            <Text style={styles.emptyText}>Search for the part itself on the Home tab instead.</Text>
          </View>
        )}
      </View>
    </ScrollView>
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
  search: {
    marginTop: Spacing.lg,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  rowPressed: {
    opacity: 0.6,
  },
  label: {
    flex: 1,
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  count: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  arrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.body,
    color: Colors.header,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  emptyText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
});
