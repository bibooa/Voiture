import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

type Props = {
  /**
   * Rotation in degrees for the arrow, i.e. the bearing to the car relative to
   * the device heading (0 = car is straight ahead / North of the device).
   */
  rotation: number;
  size?: number;
};

/**
 * The big guidance arrow. It rotates smoothly toward the car. When device
 * heading is available the caller passes a heading-relative angle so the arrow
 * points where to physically walk; otherwise it points to true bearing.
 */
export function DirectionArrow({ rotation, size = 200 }: Props) {
  const t = useTheme();
  const angle = useSharedValue(rotation);

  useEffect(() => {
    // Take the shortest rotational path so it never spins the long way round.
    const current = angle.value % 360;
    let target = rotation % 360;
    const delta = ((target - current + 540) % 360) - 180;
    angle.value = t.animations
      ? withSpring(current + delta, { damping: 14, stiffness: 90 })
      : current + delta;
  }, [rotation, angle, t.animations]);

  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: t.colors.glassBorder },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size,
            borderColor: t.colors.glassBorder,
            opacity: 0.6,
          },
        ]}
      />
      <Animated.View style={arrowStyle}>
        <LinearGradient
          colors={t.colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.arrow, { shadowColor: t.colors.primary }]}
        >
          <AppText variant="hero" color="#fff">
            ↑
          </AppText>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5 },
  arrow: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
