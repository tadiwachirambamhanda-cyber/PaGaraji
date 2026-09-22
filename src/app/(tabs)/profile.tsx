import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stitch } from '@/components/stitch';
import { refreshAll } from '@/lib/refresh';
import { backendEnabled } from '@/lib/supabase';
import { signOut, useSession } from '@/store/auth';
import { useMyListings } from '@/store/my-listings';
import { useMyRequests } from '@/store/my-requests';
import { initialsOf, useProfile } from '@/store/profile';
import { useSavedIds } from '@/store/saved-listings';
import { useSupplier } from '@/store/supplier';
import { useVehicle, vehicleLabel } from '@/store/vehicle';
import { Colors, Fonts, Spacing, Type } from '@/theme';

function Stat({ value, label, onPress }: { value: number; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.stat, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.menuLabel}>{label}</Text>
      {detail ? <Text style={styles.menuDetail}>{detail}</Text> : null}
      <Text style={styles.menuArrow}>→</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfile();
  const listingCount = useMyListings().filter((l) => !l.sold).length;
  const savedCount = useSavedIds().size;
  const openRequests = useMyRequests().filter((r) => r.status === 'Open').length;
  const supplier = useSupplier();
  const vehicle = useVehicle();
  const session = useSession();

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, []),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(profile.name)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.name}
          </Text>
          <Text style={styles.details} numberOfLines={1}>
            {profile.phone ? `${profile.city} · +${profile.phone}` : profile.city}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => router.push('/edit-profile')}>
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
      </View>

      <Stitch />
      <View style={styles.stats}>
        <Stat value={listingCount} label="for sale" onPress={() => router.push('/my-listings')} />
        <Stitch vertical />
        <Stat value={savedCount} label="saved" onPress={() => router.push('/saved-parts')} />
        <Stitch vertical />
        <Stat value={openRequests} label="wanted" onPress={() => router.push('/request?view=mine')} />
      </View>
      <Stitch />

      <View>
        <MenuRow
          label="My vehicle"
          detail={vehicle ? vehicleLabel(vehicle) : 'Add'}
          onPress={() => router.push('/my-vehicle')}
        />
        {supplier && (
          <>
            <Stitch color={Colors.muted} thickness={1} />
            <MenuRow
              label="Supplier details"
              detail={
                supplier.status === 'pending'
                  ? 'Pending'
                  : supplier.status === 'rejected'
                    ? 'Not approved'
                    : supplier.country
              }
              onPress={() => router.push('/become-supplier')}
            />
          </>
        )}
        <Stitch color={Colors.muted} thickness={1} />
        <MenuRow label="Settings" onPress={() => router.push('/settings')} />
        {backendEnabled && (
          <>
            <Stitch color={Colors.muted} thickness={1} />
            {session ? (
              <MenuRow
                label="Sign out"
                detail={session.user.email || session.user.phone || undefined}
                onPress={() => signOut()}
              />
            ) : (
              <MenuRow label="Sign in or create account" onPress={() => router.push('/sign-in')} />
            )}
          </>
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  avatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.tagInk,
  },
  name: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    lineHeight: 24,
    color: Colors.ink,
  },
  details: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  edit: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.header,
    textDecorationLine: 'underline',
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    lineHeight: 24,
    color: Colors.ink,
  },
  statLabel: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.body,
    color: Colors.ink,
  },
  menuDetail: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.muted,
  },
  menuArrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.body,
    color: Colors.header,
  },
});
