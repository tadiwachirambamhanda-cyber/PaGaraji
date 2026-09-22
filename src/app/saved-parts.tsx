import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ListingCard } from '@/components/listing-card';
import { useAllListings } from '@/store/my-listings';
import { useSavedIds } from '@/store/saved-listings';
import { Colors, Fonts, Spacing, Type } from '@/theme';

export default function SavedPartsScreen() {
  const savedIds = useSavedIds();
  const allListings = useAllListings();
  const saved = allListings.filter((item) => savedIds.has(item.id));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Saved parts" />

      <FlatList
        data={saved}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyText}>Tap the heart on any listing to keep it here.</Text>
          </View>
        }
        renderItem={({ item }) => <ListingCard listing={item} half />}
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
    padding: Spacing.xl,
    flexGrow: 1,
  },
  gridRow: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  emptyText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
    textAlign: 'center',
  },
});
