import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { getSettings } from '@/store/settings';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const enabled = () => supported && getSettings().haptics;

export function tapLight() {
  if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selectionChange() {
  if (enabled()) Haptics.selectionAsync().catch(() => {});
}

export function success() {
  if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
