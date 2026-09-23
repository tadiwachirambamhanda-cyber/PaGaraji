import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Shadows, Spacing, useColors, type ColorPalette } from '@/theme';

type SideSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

const WIDTH_RATIO = 0.82;
const MAX_WIDTH = 340;

/**
 * Panel that slides in from the left, dims the page behind it, and can be
 * dragged left (or flicked) to dismiss. Same Modal/Animated/PanResponder shape as
 * BottomSheet, just the horizontal axis instead of vertical.
 */
export function SideSheet({ visible, onClose, children }: SideSheetProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * WIDTH_RATIO, MAX_WIDTH);
  const [translateX] = useState(() => new Animated.Value(-panelWidth));
  const [backdrop] = useState(() => new Animated.Value(0));
  // Stay mounted while the closing animation plays.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateX.setValue(-panelWidth);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, speed: 16, bounciness: 3, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -panelWidth, duration: 220, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, panelWidth, translateX, backdrop]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          if (g.dx < 0) {
            translateX.setValue(g.dx);
            backdrop.setValue(Math.max(0, 1 - Math.abs(g.dx) / panelWidth));
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx < -80 || g.vx < -0.9) {
            onClose();
          } else {
            Animated.parallel([
              Animated.spring(translateX, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }),
              Animated.timing(backdrop, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
          }
        },
      }),
    [onClose, translateX, backdrop, panelWidth],
  );

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        </Animated.View>
        <Animated.View
          {...pan.panHandlers}
          style={[
            styles.panel,
            { width: panelWidth, paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg },
            { transform: [{ translateX }] },
          ]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    backgroundColor: 'rgba(26,26,26,0.4)',
  },
  panel: {
    height: '100%',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    ...Shadows.md,
  },
});
}
