import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radii, Shadows, Spacing, useColors, type ColorPalette } from '@/theme';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  gap?: number;
  maxHeight?: DimensionValue;
};

/**
 * Sheet that springs up from the bottom, dims the page behind it, and can be
 * dragged down (or flicked) to dismiss. Drag the handle at the top.
 */
export function BottomSheet({ visible, onClose, children, gap = Spacing.lg, maxHeight }: BottomSheetProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const travel = Math.max(height, 700);
  const [translateY] = useState(() => new Animated.Value(travel));
  const [backdrop] = useState(() => new Animated.Value(0));
  // Stay mounted while the closing animation plays.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateY.setValue(travel);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, speed: 16, bounciness: 3, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: travel, duration: 220, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, travel, translateY, backdrop]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) {
            translateY.setValue(g.dy);
            backdrop.setValue(Math.max(0, 1 - g.dy / 400));
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 100 || g.vy > 0.9) {
            onClose();
          } else {
            Animated.parallel([
              Animated.spring(translateY, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }),
              Animated.timing(backdrop, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
          }
        },
      }),
    [onClose, translateY, backdrop],
  );

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + Spacing.lg, gap, maxHeight },
            { transform: [{ translateY }] },
          ]}>
          <View style={styles.grab} {...pan.panHandlers}>
            <View style={styles.handle} />
          </View>
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(26,26,26,0.4)',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    paddingHorizontal: Spacing.xl,
    ...Shadows.sheet,
  },
  grab: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    marginHorizontal: -Spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.muted,
    opacity: 0.4,
  },
});
}
