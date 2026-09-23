import { useMemo } from 'react';
import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { tapLight } from '@/lib/haptics';
import { resetAllData } from '@/store/reset-all';
import { clearMyRequests } from '@/lib/request-actions';
import { useMyRequests } from '@/store/my-requests';
import { resetSaved, useSavedIds } from '@/store/saved-listings';
import { updateSettings, useSettings } from '@/store/settings';
import { showAlert } from '@/lib/alert';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

function confirm(title: string, message: string, actionLabel: string, onConfirm: () => void) {
  showAlert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({
  label,
  detail,
  danger,
  last,
  onPress,
  right,
}: {
  label: string;
  detail?: string;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Pressable
      disabled={!onPress}
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.rowPressed]}
      onPress={onPress}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {right ?? (detail ? <Text style={styles.rowDetail}>{detail}</Text> : null)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const settings = useSettings();
  const savedCount = useSavedIds().size;
  const requestCount = useMyRequests().length;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Preferences">
          <Row
            label="Haptic feedback"
            right={
              <Switch
                value={settings.haptics}
                onValueChange={(value) => {
                  updateSettings({ haptics: value });
                  if (value) tapLight();
                }}
                trackColor={{ true: Colors.header, false: Colors.border }}
              />
            }
          />
          <Row
            label="Dark mode"
            last
            right={
              <Switch
                value={settings.themeMode === 'dark'}
                onValueChange={(value) => {
                  updateSettings({ themeMode: value ? 'dark' : 'light' });
                  tapLight();
                }}
                trackColor={{ true: Colors.header, false: Colors.border }}
              />
            }
          />
        </Section>

        <Section title="Your data">
          <Row
            label="Clear saved parts"
            detail={`${savedCount}`}
            onPress={() => confirm('Clear saved parts?', 'Your hearted listings will be removed.', 'Clear', resetSaved)}
          />
          <Row
            label="Clear my requests"
            detail={`${requestCount}`}
            onPress={() =>
              confirm(
                'Clear requests?',
                'All your part requests will be deleted, including those on your account.',
                'Clear',
                () => {
                  clearMyRequests();
                },
              )
            }
          />
          <Row
            label="Reset all app data"
            danger
            last
            onPress={() =>
              confirm(
                'Reset everything?',
                'Saved parts, vehicle, settings and anything kept only on this phone are cleared. Your account, chats, online listings and requests are not affected.',
                'Reset',
                resetAllData,
              )
            }
          />
        </Section>

        <Section title="About">
          <Row label="Version" detail={Constants.expoConfig?.version ?? '1.0.0'} />
          <Row label="Part photos" detail="Unsplash" last />
        </Section>
      </ScrollView>
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  sectionCard: {
    borderTopWidth: 1.5,
    borderTopColor: Colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg - 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    backgroundColor: Colors.background,
  },
  rowLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.body,
    color: Colors.ink,
  },
  rowLabelDanger: {
    color: Colors.danger,
  },
  rowDetail: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.muted,
  },
});
}
