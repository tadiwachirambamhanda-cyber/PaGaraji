import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ChipSelect } from '@/components/chip-select';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Stamp } from '@/components/stamp';
import { categories } from '@/data/categories';
import { success } from '@/lib/haptics';
import { backendEnabled } from '@/lib/supabase';
import { useSession } from '@/store/auth';
import { saveSupplier, useSupplier, type SupplierCountry, type SupplierStatus } from '@/store/supplier';
import { showAlert } from '@/lib/alert';
import { Colors, Fonts, Spacing, Type } from '@/theme';

const COUNTRIES: SupplierCountry[] = ['Zimbabwe', 'Dubai', 'China'];
const LEAD_TIMES = ['Same day', '1-2 days', '5-7 days', '8-12 days', '2-3 weeks', '4+ weeks'].map((t) => ({
  id: t,
  label: t,
}));
const DEFAULT_LEAD_TIME = '8-12 days';
const SUPPLY_CATEGORIES = categories.filter((c) => c.id !== 'all');
const CITY_HINT: Record<SupplierCountry, string> = { Zimbabwe: 'Harare', Dubai: 'Al Quoz', China: 'Guangzhou' };
const WHATSAPP_HINT: Record<SupplierCountry, string> = {
  Zimbabwe: '263771234567',
  Dubai: '971501234567',
  China: '8613800001234',
};

const STATUS_STAMP: Record<SupplierStatus, { label: string; color: string; note: string }> = {
  pending: {
    label: 'PENDING REVIEW',
    color: Colors.importInk,
    note: 'We check every supplier by hand before approving them. You can still edit your details.',
  },
  approved: {
    label: 'APPROVED',
    color: Colors.header,
    note: 'Your listings now show a Verified supplier tag.',
  },
  rejected: {
    label: 'NOT APPROVED',
    color: Colors.danger,
    note: 'This application wasn’t approved. Update your details and it goes back for review.',
  },
};

export default function BecomeSupplierScreen() {
  const router = useRouter();
  const existing = useSupplier();
  const [business, setBusiness] = useState(existing?.business ?? '');
  const [country, setCountry] = useState<SupplierCountry>(existing?.country ?? 'Zimbabwe');
  const [city, setCity] = useState(existing?.city ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? SUPPLY_CATEGORIES[0].id);
  const [leadTime, setLeadTime] = useState(existing?.leadTime ?? DEFAULT_LEAD_TIME);
  const [whatsapp, setWhatsapp] = useState(existing?.whatsapp ?? '');
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const locked = existing?.status === 'approved';

  const handleSubmit = async () => {
    if (busy || locked) return;
    const digits = whatsapp.replace(/[\s+()-]/g, '');
    if (business.trim().length < 2) {
      showAlert('Add your business name', 'Buyers in Zimbabwe see this on your listings.');
      return;
    }
    if (city.trim().length < 2) {
      showAlert('Add your city', `Where in ${country} do the parts ship from?`);
      return;
    }
    if (!/^\d{9,15}$/.test(digits)) {
      showAlert('Check your number', `Use digits only, with the country code. For example ${WHATSAPP_HINT[country]}.`);
      return;
    }
    if (backendEnabled && !session) {
      showAlert('Sign in first', 'Supplier applications belong to an account, so we can tell you when it’s approved.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/sign-in') },
      ]);
      return;
    }

    setBusy(true);
    const problem = await saveSupplier({
      business: business.trim(),
      country,
      city: city.trim(),
      categoryId,
      leadTime,
      whatsapp: digits,
      submittedAt: existing?.submittedAt ?? Date.now(),
    });
    setBusy(false);
    if (problem) {
      showAlert('Couldn’t save your application', problem);
      return;
    }
    success();
    showAlert(
      backendEnabled ? 'Application sent' : 'Saved',
      backendEnabled
        ? 'We’ll review it by hand. Once it’s approved your listings show a Verified supplier tag — open this screen again to see the result.'
        : 'You can now list as a verified supplier.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="Become a supplier"
        subtitle="For businesses that stock parts in bulk — local wholesalers or overseas suppliers."
      />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {existing && (
          <View style={styles.statusBlock}>
            {existing.status ? (
              <>
                <View style={styles.status}>
                  <Stamp label={STATUS_STAMP[existing.status].label} color={STATUS_STAMP[existing.status].color} />
                </View>
                <Text style={styles.statusNote}>{STATUS_STAMP[existing.status].note}</Text>
              </>
            ) : (
              <View style={styles.status}>
                <Stamp label="SAVED ON THIS PHONE" imported />
              </View>
            )}
          </View>
        )}

        <View style={[styles.fields, locked && styles.fieldsLocked]} pointerEvents={locked ? 'none' : 'auto'}>
          <View style={styles.field}>
            <Text style={styles.label}>Business name</Text>
            <TextInput
              style={styles.input}
              placeholder="Al Barsha Spares"
              placeholderTextColor={Colors.placeholder}
              value={business}
              onChangeText={setBusiness}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Based in</Text>
            <SegmentedControl options={COUNTRIES} value={country} onChange={setCountry} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>City or trading area</Text>
            <TextInput
              style={styles.input}
              placeholder={CITY_HINT[country]}
              placeholderTextColor={Colors.placeholder}
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Main parts you supply</Text>
            <ChipSelect options={SUPPLY_CATEGORIES} value={categoryId} onChange={setCategoryId} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Usual time to reach a buyer</Text>
            <ChipSelect options={LEAD_TIMES} value={leadTime} onChange={setLeadTime} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>WhatsApp number</Text>
            <TextInput
              style={styles.input}
              placeholder={WHATSAPP_HINT[country]}
              placeholderTextColor={Colors.placeholder}
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>Buyers contact you here. Include the country code.</Text>
          </View>
        </View>

        {!locked && (
          <Button
            label={busy ? 'One moment…' : existing ? 'Update details' : backendEnabled ? 'Send application' : 'Save'}
            variant="primary"
            onPress={handleSubmit}
          />
        )}
        <Text style={styles.note}>
          {backendEnabled ? 'We review every application by hand.' : 'Your details are saved on this device.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  statusBlock: {
    gap: Spacing.sm,
  },
  statusNote: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    lineHeight: 19,
    color: Colors.muted,
  },
  status: {
    alignSelf: 'flex-start',
  },
  fields: {
    gap: Spacing.xl,
  },
  fieldsLocked: {
    opacity: 0.6,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.muted,
  },
  hint: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
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
  note: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
    textAlign: 'center',
  },
});
