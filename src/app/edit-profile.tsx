import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { ChipSelect } from '@/components/chip-select';
import { ScreenHeader } from '@/components/screen-header';
import { ZIMBABWE_CITIES } from '@/components/location-sheet';
import { success } from '@/lib/haptics';
import { pushProfile } from '@/lib/profile-sync';
import { updateSeller } from '@/store/my-listings';
import { initialsOf, saveProfile, useProfile } from '@/store/profile';
import { showAlert } from '@/lib/alert';
import { Colors, Fonts, Spacing, Type } from '@/theme';

const CITY_OPTIONS = ZIMBABWE_CITIES.map((c) => ({ id: c, label: c }));

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useProfile();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [city, setCity] = useState(profile.city);

  const handleSave = async () => {
    const digits = phone.replace(/[\s+()-]/g, '');
    if (name.trim().length < 2) {
      showAlert('Add your name', 'Buyers see this on your listings.');
      return;
    }
    if (!/^\d{9,15}$/.test(digits)) {
      showAlert('Check your number', 'Use digits only, with the country code — e.g. 263771234567.');
      return;
    }
    const next = { name: name.trim(), phone: digits, city };
    saveProfile(next);
    updateSeller({ name: next.name, initials: initialsOf(next.name), phone: next.phone });
    // Signed in: also save it on your account, so it follows you and updates your online listings.
    const problem = await pushProfile(next);
    if (problem) showAlert('Saved on this phone only', `Your account couldn’t be updated: ${problem}`);
    success();
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Edit details" />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.placeholder} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>WhatsApp number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="263771234567"
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.hint}>Buyers reach you on this number. Include the country code.</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>City</Text>
          <ChipSelect options={CITY_OPTIONS} value={city} onChange={setCity} />
        </View>

        <Button label="Save changes" variant="primary" onPress={handleSave} />
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
});
