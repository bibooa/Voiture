import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

export type ArrowMode =
  /** Heading-relative: points where to walk (compass available). */
  | 'compass'
  /** No compass: points to the true bearing with north at the top. */
  | 'north'
  /** Direction is meaningless (inside the GPS uncertainty). */
  | 'none'
  /** Probably arrived. */
  | 'arrived';

type Props = {
  rotation: number;
  mode: ArrowMode;
  /** Low confidence renders the arrow muted with a dashed ring. */
  lowConfidence?: boolean;
  size?: number;
};

/**
 * Guidance arrow. It never looks more certain than the data: a muted arrow and
 * dashed ring when confidence is low, no arrow at all when the car is within
 * the GPS uncertainty.
 */
export function DirectionArrow({ rotation, mode, lowConfidence, size = 96 }: Props) {
  const t = useTheme();
  const angle = useSharedValue(rotation);

  useEffect(() => {
    const current = angle.value % 360;
    const delta = ((rotation % 360) - current + 540) % 360 - 180;
    angle.value = t.animations ? withSpring(current + delta, { damping: 16, stiffness: 110 }) : current + delta;
  }, [rotation, angle, t.animations]);

  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  const accent = mode === 'arrived' ? t.colors.car : t.colors.primary;
  const muted = lowConfidence || mode === 'none';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: muted ? t.colors.textMuted : accent + '88',
            borderStyle: muted ? 'dashed' : 'solid',
            backgroundColor: accent + '14',
          },
        ]}
      />
      {mode === 'north' ? (
        <AppText variant="label" style={[styles.north, { fontSize: 9 }]} tone="muted">
          N
        </AppText>
      ) : null}

      {mode === 'arrived' ? (
        <Ionicons name="checkmark" size={size * 0.46} color={accent} />
      ) : mode === 'none' ? (
        <Ionicons name="scan-outline" size={size * 0.42} color={t.colors.textMuted} />
      ) : (
        <Animated.View style={[arrowStyle, { opacity: muted ? 0.45 : 1 }]}>
          <Ionicons name="navigate" size={size * 0.46} color={accent} style={{ transform: [{ rotate: '-45deg' }] }} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5 },
  north: { position: 'absolute', top: 4 },
});
