import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Home uses the smaller size so the page starts sooner. */
  compact?: boolean;
  /** Small row above the title (e.g. location picker) with an optional right-hand action. */
  top?: ReactNode;
  children?: ReactNode;
};

/** Tab-level heading: big plain title on the paper background, no colour block. */
export function PageHeader({ title, subtitle, top, children, compact }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.md }]}>
      {top}
      <Text style={[styles.title, compact && styles.titleCompact, top ? styles.titleAfterTop : null]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.md,
      backgroundColor: Colors.background,
    },
    title: {
      fontFamily: Fonts.headingBold,
      fontSize: Type.display,
      lineHeight: 34,
      color: Colors.ink,
    },
    titleCompact: {
      fontSize: Type.heading,
      lineHeight: 30,
    },
    titleAfterTop: {
      marginTop: Spacing.md,
    },
    subtitle: {
      fontFamily: Fonts.bodyRegular,
      fontSize: Type.small,
      lineHeight: 19,
      color: Colors.muted,
      marginTop: Spacing.xs,
    },
  });
}
