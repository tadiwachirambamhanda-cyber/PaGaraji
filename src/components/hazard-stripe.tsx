import { StyleSheet, View } from 'react-native';

import { Colors } from '@/theme';

const STRIPE_COUNT = 40;

/**
 * The Workshop mock's diagonal charcoal/orange divider — "hazard tape" reading as
 * industrial rather than decorative. Built from alternating bars in one skewed row
 * (not an SVG pattern — patternTransform rotation left visible seams on-device).
 */
export function HazardStripe({ height = 6 }: { height?: number }) {
  return (
    <View style={[styles.wrap, { height }]} accessibilityElementsHidden importantForAccessibility="no">
      <View style={styles.row}>
        {Array.from({ length: STRIPE_COUNT }, (_, i) => (
          <View key={i} style={[styles.stripe, i % 2 === 0 ? styles.orange : styles.charcoal]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: Colors.header,
  },
  row: {
    flexDirection: 'row',
    width: '112%',
    marginLeft: '-6%',
    height: '100%',
    transform: [{ skewX: '-25deg' }],
  },
  stripe: {
    flex: 1,
  },
  orange: {
    backgroundColor: Colors.accent,
  },
  charcoal: {
    backgroundColor: Colors.header,
  },
});
