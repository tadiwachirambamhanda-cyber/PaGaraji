import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { success } from '@/lib/haptics';
import { resetVehicle, saveVehicle, useVehicle } from '@/store/vehicle';
import { showAlert } from '@/lib/alert';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

export default function MyVehicleScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const existing = useVehicle();
  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [year, setYear] = useState(existing?.year ?? '');

  const handleSave = () => {
    if (model.trim().length < 2) {
      showAlert('Add the model', 'For example Hilux, Fit or Corolla.');
      return;
    }
    const trimmedYear = year.trim();
    const yearNumber = Number(trimmedYear);
    if (trimmedYear !== '' && !(/^\d{4}$/.test(trimmedYear) && yearNumber >= 1960 && yearNumber <= new Date().getFullYear() + 1)) {
      showAlert('Check the year', 'Use four digits, like 2018. You can also leave it empty.');
      return;
    }
    saveVehicle({ make: make.trim(), model: model.trim(), year: trimmedYear });
    success();
    router.back();
  };

  const handleRemove = () =>
    showAlert('Remove your vehicle?', 'Parts will stop being flagged as a fit.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          resetVehicle();
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="My vehicle" subtitle="Save it once. We’ll flag parts that fit it and let you filter to them." />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Make (optional)</Text>
          <TextInput style={styles.input} placeholder="Toyota" placeholderTextColor={Colors.placeholder} value={make} onChangeText={setMake} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Model</Text>
          <TextInput style={styles.input} placeholder="Hilux" placeholderTextColor={Colors.placeholder} value={model} onChangeText={setModel} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Year (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="2018"
            placeholderTextColor={Colors.placeholder}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Text style={styles.hint}>With a year, we skip parts listed for other years.</Text>
        </View>

        <Button label={existing ? 'Save changes' : 'Save vehicle'} variant="primary" onPress={handleSave} />
        {existing && (
          <Pressable hitSlop={8} onPress={handleRemove}>
            <Text style={styles.remove}>Remove vehicle</Text>
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
  remove: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.danger,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
}
