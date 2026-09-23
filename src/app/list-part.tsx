import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { ChipSelect } from '@/components/chip-select';
import { PhotoPicker } from '@/components/photo-picker';
import { WrenchIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { categories } from '@/data/categories';
import { NO_DESCRIPTION, type Condition, type Listing, type Origin } from '@/data/listings';
import { success } from '@/lib/haptics';
import { editListing, postListing, type ListingFields } from '@/lib/listing-actions';
import { deletePhotos } from '@/lib/photos';
import { backendEnabled } from '@/lib/supabase';
import { useSession } from '@/store/auth';
import { addListing, useMyListings } from '@/store/my-listings';
import { getProfile, initialsOf } from '@/store/profile';
import { getSupplier, isApprovedSupplier, useSupplier } from '@/store/supplier';
import { showAlert } from '@/lib/alert';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

const CONDITIONS: Condition[] = ['New', 'Used', 'Refurb'];

const SELLABLE_CATEGORIES = categories.filter((c) => c.id !== 'all');

export default function ListPartScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ origin?: string; edit?: string }>();
  const myListings = useMyListings();
  const editing = params.edit ? myListings.find((l) => l.id === params.edit) : undefined;
  const [title, setTitle] = useState(editing?.title ?? '');
  const [fitment, setFitment] = useState(editing?.fitment ?? '');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [description, setDescription] = useState(
    editing && editing.description !== NO_DESCRIPTION ? editing.description : '',
  );
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [condition, setCondition] = useState<Condition>(editing?.condition ?? 'Used');
  const [photos, setPhotos] = useState<string[]>(editing?.photos ?? []);
  const supplier = useSupplier();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const approved = isApprovedSupplier(supplier);
  // Zimbabwe suppliers always post as Local (they're not shipping in from anywhere) — only an
  // import supplier gets a second, overseas origin to choose from.
  const [origin, setOrigin] = useState<Origin>(
    params.origin === 'import' && approved && supplier.country !== 'Zimbabwe' ? supplier.country : 'Local',
  );
  const origins: Origin[] = approved && supplier.country !== 'Zimbabwe' ? ['Local', supplier.country] : ['Local'];

  // Photos already saved on this listing, plus a live view of the row, so leaving
  // without saving can clean up only the files added in this session.
  const [savedPhotos] = useState<string[]>(editing?.photos ?? []);
  const currentPhotos = useRef(photos);
  const finished = useRef(false);
  useEffect(() => {
    currentPhotos.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      if (!finished.current) deletePhotos(currentPhotos.current.filter((n) => !savedPhotos.includes(n)));
    },
    [savedPhotos],
  );

  const handleSubmit = async () => {
    if (busy) return;
    const parsedPrice = Number(price);
    if (categoryId === '') {
      showAlert('Pick a category', 'Choose the kind of part so buyers can find it.');
      return;
    }
    if (title.trim() === '' || fitment.trim() === '' || !price || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      showAlert('Missing details', 'Add a title, fitment, and a valid price before posting.');
      return;
    }

    const fields: ListingFields = {
      categoryId,
      title: title.trim(),
      fitment: fitment.trim(),
      price: parsedPrice,
      condition,
      description: description.trim() || NO_DESCRIPTION,
      photos,
    };

    if (editing) {
      setBusy(true);
      const problem = await editListing(editing, fields);
      setBusy(false);
      if (problem) {
        showAlert('Couldn’t save your changes', problem);
        return;
      }
      finished.current = true;
      success();
      router.back();
      return;
    }

    const profile = getProfile();

    if (backendEnabled) {
      if (!session) {
        showAlert('Sign in to post', 'Create a free account or sign in so buyers can find and contact you.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/sign-in') },
        ]);
        return;
      }
      const importing = origin !== 'Local';
      const approvedNow = getSupplier();
      const postingAsSupplier = isApprovedSupplier(approvedNow) && approvedNow.country === 'Zimbabwe';
      if (importing && !isApprovedSupplier(approvedNow)) {
        showAlert('Import listings need approval', 'Your supplier application hasn’t been approved yet.');
        return;
      }
      if (!importing && !postingAsSupplier && (!profile.phone || profile.name === 'Guest')) {
        showAlert('Add your name and WhatsApp number', 'Buyers contact you on WhatsApp, so we need both before you post.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Add them', onPress: () => router.push('/edit-profile') },
        ]);
        return;
      }
      setBusy(true);
      const problem = await postListing(
        importing && approvedNow
          ? {
              ...fields,
              // Only an import supplier reaches this branch — origin was chosen from `origins`,
              // which never offers Zimbabwe as a second choice.
              origin: approvedNow.country as Origin,
              location: `${approvedNow.city} · ${approvedNow.leadTime}`,
              leadTime: `Imported · ~${approvedNow.leadTime} to Harare`,
              sellerName: approvedNow.business,
              sellerPhone: approvedNow.whatsapp,
            }
          : postingAsSupplier
            ? {
                ...fields,
                origin: 'Local',
                location: approvedNow.city,
                leadTime: approvedNow.leadTime,
                sellerName: approvedNow.business,
                sellerPhone: approvedNow.whatsapp,
              }
            : {
                ...fields,
                origin: 'Local',
                location: profile.city,
                leadTime: 'Ready now · pickup or local delivery',
                sellerName: profile.name,
                sellerPhone: profile.phone,
              },
      );
      setBusy(false);
      if (problem) {
        showAlert('Couldn’t post your listing', problem);
        return;
      }
      finished.current = true;
      success();
      showAlert('Listing posted', `“${fields.title}” is now live for everyone on PaGaraji.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    // No backend configured: keep the listing on this phone.
    const supplierNow = getSupplier();
    const imported = origin !== 'Local' && supplierNow !== null;
    const seller = imported ? supplierNow.business : profile.name;
    const category = SELLABLE_CATEGORIES.find((c) => c.id === categoryId);
    const listing: Listing = {
      id: `local-${Date.now()}`,
      ...fields,
      location: imported ? `${supplierNow.city} · ${supplierNow.leadTime}` : profile.city,
      // Reachable only when `origin` was picked from `origins`, which never offers Zimbabwe.
      origin: imported ? (supplierNow.country as Origin) : 'Local',
      Icon: category?.Icon ?? WrenchIcon,
      sellerName: seller,
      sellerInitials: initialsOf(seller),
      sellerPhone: imported ? supplierNow.whatsapp : profile.phone,
      leadTime: imported ? `Imported · ~${supplierNow.leadTime} to Harare` : 'Ready now · pickup or local delivery',
    };

    addListing(listing);
    finished.current = true;
    success();
    showAlert('Listing posted', `“${listing.title}” is now in your listings.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={editing ? 'Edit listing' : 'List a part'}
        subtitle={editing ? undefined : 'Local stock or imports from Dubai and China. Reach buyers across Zim.'}
      />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Photos</Text>
          <PhotoPicker photos={photos} onChange={setPhotos} max={5} hint="The first one is the cover" keep={savedPhotos} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Part name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Front brake pads"
            placeholderTextColor={Colors.placeholder}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <ChipSelect options={SELLABLE_CATEGORIES} value={categoryId} onChange={setCategoryId} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Fitment</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Fits Toyota Hilux 2015-2020"
            placeholderTextColor={Colors.placeholder}
            value={fitment}
            onChangeText={setFitment}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.flex1]}>
            <Text style={styles.label}>Price (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="45"
              placeholderTextColor={Colors.placeholder}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Condition</Text>
          <SegmentedControl options={CONDITIONS} value={condition} onChange={setCondition} />
        </View>

        {origins.length > 1 && !editing ? (
          <View style={styles.field}>
            <Text style={styles.label}>Where is it coming from?</Text>
            <SegmentedControl options={origins} value={origin} onChange={setOrigin} />
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Condition details, warranty, minimum order, anything a buyer should know..."
            placeholderTextColor={Colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <Button label={busy ? 'One moment…' : editing ? 'Save changes' : 'Post listing'} variant="primary" onPress={handleSubmit} />
        {!approved && !editing && (
          <Pressable hitSlop={8} onPress={() => router.push('/become-supplier')}>
            <Text style={styles.supplierLink}>Selling in bulk, local or overseas? Become a verified supplier</Text>
          </Pressable>
        )}
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
  form: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  field: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  flex1: {
    flex: 1,
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
  supplierLink: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  textarea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
});
}
