import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { tapLight } from '@/lib/haptics';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'whatsapp';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export function Button({ label, onPress, variant = 'primary', icon }: ButtonProps) {
  const Colors = useColors();
  const { styles, variantStyles, variantLabelStyles } = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && styles.pressed,
      ]}
      onPress={() => {
        tapLight();
        onPress?.();
      }}>
      {icon}
      <Text style={[styles.label, variantLabelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(Colors: ColorPalette) {
  const styles = StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: 12,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    label: {
      fontFamily: Fonts.bodyBold,
      fontSize: Type.body,
    },
  });

  const variantStyles = StyleSheet.create({
    primary: { backgroundColor: Colors.header },
    secondary: { backgroundColor: Colors.accent },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.ink },
    whatsapp: { backgroundColor: Colors.whatsapp },
  });

  const variantLabelStyles = StyleSheet.create({
    primary: { color: '#FFFFFF' },
    secondary: { color: Colors.ink },
    outline: { color: Colors.ink },
    whatsapp: { color: '#FFFFFF' },
  });

  return { styles, variantStyles, variantLabelStyles };
}
