import { StyleSheet, Text, View } from 'react-native';

import { WrenchIcon } from '@/components/icons';
import { Colors, Fonts } from '@/theme';

type LogoProps = {
  size?: number;
  onDark?: boolean;
};

export function Logo({ size = 32, onDark = false }: LogoProps) {
  const fontSize = size;
  const wrenchSize = size * 0.32;

  return (
    <View style={styles.row}>
      <Text style={[styles.pa, { fontSize, color: Colors.accent }]}>Pa</Text>
      <View style={{ marginHorizontal: size * 0.02, marginBottom: size * 0.42, transform: [{ rotate: '-12deg' }] }}>
        <WrenchIcon size={wrenchSize} color={Colors.primary} />
      </View>
      <Text style={[styles.garaji, { fontSize, color: onDark ? '#FFFFFF' : Colors.ink }]}>Garaji</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pa: {
    fontFamily: Fonts.display,
    letterSpacing: -0.5,
  },
  garaji: {
    fontFamily: Fonts.display,
    letterSpacing: -0.5,
  },
});
