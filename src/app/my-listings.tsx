import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { PlusIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/screen-header';
import { ListingCard } from '@/components/listing-card';
import { refreshAll } from '@/lib/refresh';
import { useMyListings } from '@/store/my-listings';
import { Colors, Fonts, Spacing, Type } from '@/theme';

export default function MyListingsScreen() {
  const router = useRouter();
  const myListings = useMyListings();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, []),
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Your listings"
        right={
          <Pressable style={({ pressed }) => [styles.postButton, pressed && styles.postButtonPressed]} hitSlop={8} onPress={() => router.push('/list-part')}>
            <PlusIcon size={16} color={Colors.header} />
            <Text style={styles.postButtonText}>List a part</Text>
          </Pressable>
        }
      />

      <FlatList
        data={myListings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
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
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing listed yet</Text>
            <Text style={styles.emptyText}>Tap “List a part” to post your first item, local or imported.</Text>
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
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postButtonPressed: {
    opacity: 0.85,
  },
  postButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.header,
    textDecorationLine: 'underline',
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
