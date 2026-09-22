import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';

/** Gives its child a small bounce each time `active` switches on (e.g. a heart being saved). */
export function Pop({ active, children }: { active: boolean; children: ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (active) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 90, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [active, scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
