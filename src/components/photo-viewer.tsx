import { Image } from 'expo-image';
import { useRef, useState, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type PhotoViewerProps = {
  sources: ImageSourcePropType[];
  /** Index to open at, or null when closed. */
  index: number | null;
  onClose: () => void;
};

/** Full-screen photo pager on black. */
export function PhotoViewer({ sources, index, onClose }: PhotoViewerProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(index ?? 0);
  const visible = index !== null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={() => {
            setPage(index ?? 0);
            scrollRef.current?.scrollTo({ x: (index ?? 0) * width, animated: false });
          }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {sources.map((source, i) => (
            <Image key={i} source={source} style={{ width, height }} contentFit="contain" />
          ))}
        </ScrollView>

        <View style={[styles.top, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
          {sources.length > 1 ? (
            <Text style={styles.counter}>
              {Math.min(page + 1, sources.length)} / {sources.length}
            </Text>
          ) : (
            <View />
          )}
          <Pressable style={({ pressed }) => [styles.close, pressed && styles.pressed]} accessibilityLabel="Close photo" hitSlop={8} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  top: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.background,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(247,241,227,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.body,
    color: Colors.ink,
  },
  pressed: {
    opacity: 0.6,
  },
});
}
