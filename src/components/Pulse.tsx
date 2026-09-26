import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

type Props = {
  color: string;
  size?: number;
  /** Number of concentric ripples. */
  rings?: number;
};

/**
 * A softly expanding ripple used behind markers and the GPS-search animation.
 * Rings fade as they grow, giving a calm "radar" pulse.
 */
export function Pulse({ color, size = 120, rings = 2 }: Props) {
  const t = useTheme();
  return (
    <>
      {Array.from({ length: rings }).map((_, i) => (
        <Ring key={i} color={color} size={size} delay={(i * 1400) / rings} enabled={t.animations} />
      ))}
    </>
  );
}

function Ring({
  color,
  size,
  delay,
  enabled,
}: {
  color: string;
  size: number;
  delay: number;
  enabled: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    const id = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
    }, delay);
    return () => {
      clearTimeout(id);
      cancelAnimation(progress);
    };
  }, [enabled, delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + progress.value * 0.9 }],
    opacity: 0.5 * (1 - progress.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
});
