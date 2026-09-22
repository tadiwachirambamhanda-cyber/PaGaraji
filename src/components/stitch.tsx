import { StyleSheet, View } from 'react-native';

import { Colors } from '@/theme';

type StitchProps = {
  color?: string;
  thickness?: number;
  vertical?: boolean;
};

/**
 * Dashed "stitched" divider. React Native only renders dashed borders reliably
 * when all four sides are drawn, so draw an oversized dashed box and clip it to
 * a single edge.
 */
export function Stitch({ color = Colors.header, thickness = 1.5, vertical = false }: StitchProps) {
  const box = { borderColor: color, borderWidth: thickness };
  return (
    <View
      style={vertical ? { width: thickness, overflow: 'hidden' } : { height: thickness, overflow: 'hidden' }}
      accessibilityElementsHidden
      importantForAccessibility="no">
      <View style={[styles.line, box, vertical ? { width: thickness * 4, height: '100%' } : { height: thickness * 4 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    borderStyle: 'dashed',
    borderRadius: 1,
  },
});
