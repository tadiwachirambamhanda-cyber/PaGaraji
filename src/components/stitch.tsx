import { StyleSheet, View } from 'react-native';

import { useColors } from '@/theme';

type StitchProps = {
  color?: string;
  thickness?: number;
  vertical?: boolean;
  /** The old Market Stall look. Workshop's default is a plain solid line. */
  dashed?: boolean;
};

/**
 * A plain divider line — solid by default (Workshop). React Native only renders
 * dashed borders reliably when all four sides are drawn, so for `dashed` this
 * draws an oversized dashed box and clips it to a single edge.
 */
export function Stitch({ color, thickness = 1.5, vertical = false, dashed = false }: StitchProps) {
  const Colors = useColors();
  const box = { borderColor: color ?? Colors.line, borderWidth: thickness, borderStyle: dashed ? ('dashed' as const) : ('solid' as const) };
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
    borderRadius: 1,
  },
});
