import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/components/icons';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

/** Header for pushed screens: outlined back button, plain title, paper background. */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => router.back()}>
          <ArrowLeftIcon size={20} color={Colors.ink} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: Colors.background,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    back: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: Colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.6,
    },
    title: {
      flex: 1,
      fontFamily: Fonts.headingBold,
      fontSize: Type.heading,
      lineHeight: 30,
      color: Colors.ink,
    },
    subtitle: {
      fontFamily: Fonts.bodyRegular,
      fontSize: Type.small,
      lineHeight: 19,
      color: Colors.muted,
    },
  });
}
