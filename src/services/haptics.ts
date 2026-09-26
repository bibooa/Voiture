import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback wrapper. Every call is guarded so it degrades silently on
 * devices/platforms without a haptic engine (e.g. web), and respects a global
 * enable flag set from Settings.
 */

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

function guard(fn: () => Promise<void>) {
  if (!enabled || !isSupported) return;
  fn().catch(() => {
    /* haptics are best-effort — never surface an error */
  });
}

export const haptics = {
  light: () => guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => guard(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => guard(() => Haptics.selectionAsync()),
  success: () =>
    guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () =>
    guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () =>
    guard(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
