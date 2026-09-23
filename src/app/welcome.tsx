import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChipSelect } from '@/components/chip-select';
import { ZIMBABWE_CITIES } from '@/components/location-sheet';
import { Logo } from '@/components/logo';
import { Stamp } from '@/components/stamp';
import { Stitch } from '@/components/stitch';
import { saveProfile, useProfile } from '@/store/profile';
import { updateSettings } from '@/store/settings';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

const CITY_OPTIONS = ZIMBABWE_CITIES.map((c) => ({ id: c, label: c }));

const POINTS = [
  { stamp: 'LOCAL', imported: false, text: 'Parts from sellers across Zimbabwe, with prices in US dollars.' },
  { stamp: 'IMPORT', imported: true, text: 'Parts shipped from Dubai and China, with the delivery time shown.' },
  { stamp: 'REQUEST', imported: false, text: 'Can’t find it? Post what you need and we’ll match it against listings.' },
] as const;

/** Shown once, on first launch. */
export default function WelcomeScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useProfile();

  const finish = (href: '/' | '/post?view=sell') => {
    updateSettings({ onboarded: true });
    router.replace(href);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xl }]}>
      <Logo size={40} />
      <Text style={styles.title}>{'Every part.\nEvery corner of Zim.'}</Text>

      <View style={styles.points}>
        {POINTS.map((point, index) => (
          <View key={point.stamp}>
            {index > 0 && <Stitch color={Colors.muted} thickness={1} />}
            <View style={styles.point}>
              <View style={styles.stampCell}>
                <Stamp label={point.stamp} imported={point.imported} />
              </View>
              <Text style={styles.pointText}>{point.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Where are you?</Text>
        <ChipSelect options={CITY_OPTIONS} value={profile.city} onChange={(city) => saveProfile({ ...profile, city })} />
      </View>

      <View style={styles.actions}>
        <Button label="Start browsing" variant="primary" onPress={() => finish('/')} />
        <Button label="I want to sell parts" variant="outline" onPress={() => finish('/post?view=sell')} />
      </View>
    </ScrollView>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.display,
    lineHeight: 36,
    color: Colors.ink,
  },
  points: {
    marginTop: Spacing.sm,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  stampCell: {
    width: 88,
    alignItems: 'flex-start',
  },
  pointText: {
    flex: 1,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    lineHeight: 19,
    color: Colors.ink,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.muted,
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
}
