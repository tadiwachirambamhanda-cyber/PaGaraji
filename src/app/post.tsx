import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { CategoryTabs } from '@/components/category-tabs';
import { ChipSelect } from '@/components/chip-select';
import { LocationPickerMap } from '@/components/location-picker-map';
import { PhotoPicker } from '@/components/photo-picker';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Stitch } from '@/components/stitch';
import { categories } from '@/data/categories';
import { coordinateFor } from '@/data/city-coordinates';
import { distanceKm, formatDistance } from '@/lib/geo';
import { success } from '@/lib/haptics';
import { useDeviceLocation, type Coordinate } from '@/lib/location';
import { fetchCategoryPriceGuidance, type PriceGuidance } from '@/lib/price-guidance';
import { refreshAll } from '@/lib/refresh';
import { createRequest } from '@/lib/request-actions';
import { backendEnabled } from '@/lib/supabase';
import { useSession } from '@/store/auth';
import { timeAgo } from '@/lib/time';
import { useMyListings } from '@/store/my-listings';
import { useOpenRequests, useOpenRequestsHydrated } from '@/store/open-requests';
import { type PartRequest, type RequestSource } from '@/store/my-requests';
import { isApprovedSupplier, useSupplier } from '@/store/supplier';
import { showAlert } from '@/lib/alert';
import { Fonts, Radii, Spacing, Type, useColors, type ColorPalette } from '@/theme';

const SOURCES: RequestSource[] = ['Any', 'Local', 'Import'];
const MODES = [
  { id: 'new', label: 'Request' },
  { id: 'sell', label: 'Sell' },
  { id: 'browse', label: 'Open requests' },
] as const;
type Mode = (typeof MODES)[number]['id'];

const CATEGORY_OPTIONS = [{ id: 'any', label: 'Any category' }, ...categories.filter((c) => c.id !== 'all')];

function categoryLabel(id: string) {
  return CATEGORY_OPTIONS.find((c) => c.id === id)?.label ?? 'Any category';
}

function BrowseCard({ request }: { request: PartRequest }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const { coordinate: myCoordinate } = useDeviceLocation();
  const requestCoordinate = coordinateFor(request);
  const distance = requestCoordinate ? formatDistance(distanceKm(myCoordinate, requestCoordinate)) : null;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => router.push(`/request/${request.id}`)}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {request.partName}
        </Text>
        {request.budget !== undefined && <Text style={styles.browseBudget}>${request.budget}</Text>}
      </View>
      <Text style={styles.cardMeta}>
        {[
          request.vehicle || null,
          request.source === 'Any' ? 'Local or import' : request.source,
          categoryLabel(request.categoryId),
          distance ? `${distance} away` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {request.notes !== '' && (
        <Text style={styles.cardNotes} numberOfLines={2}>
          {request.notes}
        </Text>
      )}
      <View style={styles.browseFooter}>
        <Text style={styles.cardTime}>{timeAgo(request.createdAt)}</Text>
        <Text style={styles.offersRowText}>Make an offer →</Text>
      </View>
    </Pressable>
  );
}

function BrowsePanel() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const rawRequests = useOpenRequests();
  const hydrated = useOpenRequestsHydrated();
  const { coordinate: myCoordinate } = useDeviceLocation();

  // Closest first — requests with a dropped pin sort by real distance; the rest
  // (no pin, so no distance to compare) stay in their existing newest-first order,
  // after the ones we can actually measure.
  const requests = [...rawRequests].sort((a, b) => {
    const coordA = coordinateFor(a);
    const coordB = coordinateFor(b);
    if (coordA && coordB) return distanceKm(myCoordinate, coordA) - distanceKm(myCoordinate, coordB);
    if (coordA) return -1;
    if (coordB) return 1;
    return 0;
  });

  if (!hydrated) {
    return <ActivityIndicator color={Colors.muted} style={styles.browseLoading} />;
  }
  if (requests.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Nothing open right now</Text>
        <Text style={styles.emptyText}>When someone posts what they need, it shows up here for you to offer on.</Text>
      </View>
    );
  }
  return (
    <View>
      {requests.map((request, index) => (
        <View key={request.id}>
          {index > 0 && (
            <View style={styles.cardGap}>
              <Stitch />
            </View>
          )}
          <BrowseCard request={request} />
        </View>
      ))}
    </View>
  );
}

/** InDrive nudges drivers toward high-demand areas; the equivalent here is showing a seller
 * which categories have the most open requests right now, from data already on the phone. */
function DemandBanner() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const requests = useOpenRequests();
  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of requests) {
      if (r.categoryId === '' || r.categoryId === 'any') continue;
      counts.set(r.categoryId, (counts.get(r.categoryId) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [requests]);

  if (topCategories.length === 0) return null;

  return (
    <View style={styles.demandBanner}>
      <Text style={styles.demandTitle}>In demand right now</Text>
      {topCategories.map(([categoryId, count]) => (
        <Text key={categoryId} style={styles.demandText}>
          {count} {count === 1 ? 'person is' : 'people are'} looking for {categoryLabel(categoryId)}
        </Text>
      ))}
    </View>
  );
}

function SellOption({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Pressable style={({ pressed }) => [styles.sellRow, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.sellText}>
        <Text style={styles.sellTitle}>{title}</Text>
        <Text style={styles.sellDetail}>{detail}</Text>
      </View>
      <Text style={styles.sellArrow}>→</Text>
    </Pressable>
  );
}

function SellPanel() {
  const Colors = useColors();
  const router = useRouter();
  const supplier = useSupplier();
  const supplierStatus = supplier?.status;
  const approved = isApprovedSupplier(supplier);
  const listingCount = useMyListings().filter((l) => !l.sold).length;

  return (
    <View>
      <DemandBanner />
      <SellOption
        title="Local stock"
        detail="Parts you have in Zimbabwe. Buyers collect, or you deliver."
        onPress={() => router.push('/list-part?origin=local')}
      />
      <Stitch color={Colors.muted} thickness={1} />
      {approved && supplier.country !== 'Zimbabwe' ? (
        <SellOption
          title={`Import from ${supplier.country}`}
          detail={`Ships from ${supplier.city}, about ${supplier.leadTime} to Zimbabwe.`}
          onPress={() => router.push('/list-part?origin=import')}
        />
      ) : approved ? (
        <SellOption
          title="Verified wholesale stock"
          detail={`Listed as ${supplier.business}. Your listings show a Verified tag.`}
          onPress={() => router.push('/list-part')}
        />
      ) : supplierStatus === 'pending' ? (
        <SellOption
          title="Supplier application under review"
          detail="We check every supplier by hand. You can still edit your details."
          onPress={() => router.push('/become-supplier')}
        />
      ) : supplierStatus === 'rejected' ? (
        <SellOption
          title="Supplier application not approved"
          detail="Update your details and send it again."
          onPress={() => router.push('/become-supplier')}
        />
      ) : (
        <SellOption
          title="Become a verified supplier"
          detail="For a local wholesaler or an overseas supplier. Once approved, your listings show a Verified tag."
          onPress={() => router.push('/become-supplier')}
        />
      )}
      <Stitch color={Colors.muted} thickness={1} />
      <SellOption
        title="Your listings"
        detail={listingCount === 0 ? 'Nothing listed yet.' : `${listingCount} ${listingCount === 1 ? 'part' : 'parts'} listed on this device.`}
        onPress={() => router.push('/my-listings')}
      />
    </View>
  );
}

export default function PostScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string; partName?: string }>();
  const [mode, setMode] = useState<Mode>('new');
  const [partName, setPartName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [pin, setPin] = useState<Coordinate | null>(null);
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<RequestSource>('Any');
  const [categoryId, setCategoryId] = useState('any');
  const [refreshing, setRefreshing] = useState(false);
  const [priceGuidance, setPriceGuidance] = useState<PriceGuidance | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    fetchCategoryPriceGuidance(categoryId).then((guidance) => {
      if (!cancelled) setPriceGuidance(guidance);
    });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  useEffect(() => {
    if (params.partName) {
      // "Post this again" from Deal History — a one-shot prefill, same pattern as `view` below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPartName(params.partName);
      router.setParams({ partName: undefined });
    }
  }, [params.partName, router]);

  useEffect(() => {
    if (params.view === 'sell' || params.view === 'browse') {
      // Route params are external state; this mirrors a one-shot navigation hint into local state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(params.view);
      router.setParams({ view: undefined });
    }
  }, [params.view, router]);

  const handleSubmit = async () => {
    if (busy) return;
    if (partName.trim().length < 2) {
      showAlert('Add a part name', 'Tell sellers what you’re looking for first.');
      return;
    }
    if (backendEnabled && !session) {
      showAlert('Sign in to post a request', 'Requests are saved on your account so they stay with you.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/sign-in') },
      ]);
      return;
    }
    setBusy(true);
    const budgetValue = Number(budget);
    const problem = await createRequest({
      partName: partName.trim(),
      vehicle: vehicle.trim(),
      source,
      categoryId,
      notes: notes.trim(),
      photos,
      budget: budget.trim() !== '' && Number.isFinite(budgetValue) && budgetValue > 0 ? budgetValue : undefined,
      latitude: pin?.latitude,
      longitude: pin?.longitude,
    });
    setBusy(false);
    if (problem) {
      showAlert('Couldn’t post your request', problem);
      return;
    }
    success();
    router.push('/(tabs)/activity?mode=requests');
  };

  const subtitle =
    mode === 'sell'
      ? 'List a part for buyers across Zimbabwe, from your shelf or from overseas.'
      : mode === 'browse'
        ? 'Name a price and offer on what someone else needs — no listing required.'
        : 'Post what you need and a price you’d pay. Sellers can offer that price, or counter.';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Post" subtitle={subtitle} />
      <ScrollView
        contentContainerStyle={styles.body}
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
        <View style={styles.tabs}>
          <CategoryTabs categories={MODES} value={mode} onChange={(id) => setMode(id as Mode)} />
        </View>

        <View style={styles.form}>
          {mode === 'sell' ? (
            <SellPanel />
          ) : mode === 'browse' ? (
            <BrowsePanel />
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Part name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Front brake pads"
                  placeholderTextColor={Colors.placeholder}
                  value={partName}
                  onChangeText={setPartName}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Vehicle make, model and year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Toyota Hilux 2018"
                  placeholderTextColor={Colors.placeholder}
                  value={vehicle}
                  onChangeText={setVehicle}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <ChipSelect options={CATEGORY_OPTIONS} value={categoryId} onChange={setCategoryId} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Where from</Text>
                <SegmentedControl options={SOURCES} value={source} onChange={setSource} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Your budget, USD (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="45"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="decimal-pad"
                  value={budget}
                  onChangeText={setBudget}
                />
                {priceGuidance && (
                  <Text style={styles.priceGuidance}>
                    Similar parts closed at ${priceGuidance.minPrice}–${priceGuidance.maxPrice} recently (avg ${priceGuidance.avgPrice})
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Exact location</Text>
                <LocationPickerMap value={pin} onChange={setPin} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Photos (optional)</Text>
                <PhotoPicker photos={photos} onChange={setPhotos} max={3} hint="The old part, or the number stamped on it" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Left side, ceramic, OEM only"
                  placeholderTextColor={Colors.placeholder}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>

              <Button label={busy ? 'One moment…' : 'Post request'} variant="primary" onPress={handleSubmit} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    paddingBottom: Spacing.xxxl,
  },
  tabs: {
    paddingLeft: Spacing.xl,
    marginTop: Spacing.sm,
  },
  form: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  pressed: {
    opacity: 0.6,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
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
  textarea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  priceGuidance: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
  },
  demandBanner: {
    backgroundColor: Colors.header,
    borderRadius: Radii.md,
    padding: Spacing.lg,
    gap: 4,
    marginBottom: Spacing.lg,
  },
  demandTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.caption,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  demandText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: '#FFFFFF',
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
    lineHeight: 19,
    color: Colors.muted,
  },
  sellArrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  browseLoading: {
    marginTop: Spacing.xxxl,
  },
  browseBudget: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  browseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  offersRowText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  cardGap: {
    marginVertical: Spacing.xl,
  },
  card: {
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardTitle: {
    flex: 1,
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    lineHeight: 24,
    color: Colors.ink,
  },
  cardMeta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.muted,
  },
  cardNotes: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.ink,
    lineHeight: 19,
  },
  cardTime: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
  },
  emptyState: {
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
    lineHeight: 19,
    color: Colors.muted,
  },
});
}
