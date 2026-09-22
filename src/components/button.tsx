import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { tapLight } from '@/lib/haptics';
import { Colors, Fonts, Spacing, Type } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'whatsapp';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export function Button({ label, onPress, variant = 'primary', icon }: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        VARIANT_STYLES[variant],
        pressed && styles.pressed,
      ]}
      onPress={() => {
        tapLight();
        onPress?.();
      }}>
      {icon}
      <Text style={[styles.label, VARIANT_LABEL_STYLES[variant]]}>{label}</Text>
    </Pressable>
  );
}

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

const VARIANT_STYLES = StyleSheet.create({
  primary: { backgroundColor: Colors.header },
  secondary: { backgroundColor: Colors.accent },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.header },
  whatsapp: { backgroundColor: Colors.whatsapp },
});

const VARIANT_LABEL_STYLES = StyleSheet.create({
  primary: { color: '#FFFFFF' },
  secondary: { color: Colors.ink },
  outline: { color: Colors.header },
  whatsapp: { color: '#FFFFFF' },
});
