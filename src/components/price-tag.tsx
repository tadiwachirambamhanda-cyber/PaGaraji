import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Colors, Fonts, Type } from '@/theme';

type PriceTagProps = {
  price: number;
  size?: 'md' | 'lg' | 'xl';
};

const NOTCH = 10;

/** Sunflower price tag with a notched left edge, like a hang-tag on a part. */
export function PriceTag({ price, size = 'md' }: PriceTagProps) {
  const height = size === 'xl' ? 44 : size === 'lg' ? 34 : 28;
  const fontSize = size === 'xl' ? Type.heading : size === 'lg' ? Type.title : Type.body;
  return (
    <View style={styles.row} accessibilityLabel={`${price} US dollars`}>
      <Svg width={NOTCH} height={height}>
        <Polygon points={`${NOTCH},0 ${NOTCH},${height} 0,${height / 2}`} fill={Colors.accent} />
      </Svg>
      <View style={[styles.body, { height }]}>
        <Text style={[styles.text, { fontSize, lineHeight: height - 6 }]}>
          ${price}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    backgroundColor: Colors.accent,
    paddingRight: 12,
    paddingLeft: 2,
    justifyContent: 'center',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  text: {
    fontFamily: Fonts.headingBold,
    color: Colors.tagInk,
    includeFontPadding: false,
  },
});
