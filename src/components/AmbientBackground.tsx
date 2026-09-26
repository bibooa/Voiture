import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

/**
 * The ambient backdrop behind non-map screens: a deep vertical gradient with
 * two large, slowly drifting blurred orbs that create depth and a sense of a
 * living, premium surface. Motion is subtle and pauses when animations are off.
 */
export function AmbientBackground({ children }: { children?: React.ReactNode }) {
  const t = useTheme();
  const { width } = useWindowDimensions();

  const drift = useSharedValue(0);

  useEffect(() => {
    if (!t.animations) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [t.animations, drift]);

  const orbA = useAnimatedStyle(() => ({
    transform: [
      { translateX: -40 + drift.value * 60 },
      { translateY: -20 + drift.value * 40 },
      { scale: 1 + drift.value * 0.08 },
    ],
  }));

  const orbB = useAnimatedStyle(() => ({
    transform: [
      { translateX: 30 - drift.value * 50 },
      { translateY: 20 - drift.value * 30 },
      { scale: 1.1 - drift.value * 0.06 },
    ],
  }));

  const orbSize = width * 0.9;

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <LinearGradient
        colors={t.colors.backdropGradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          { width: orbSize, height: orbSize, top: -orbSize * 0.25, left: -orbSize * 0.2 },
          orbA,
        ]}
      >
        <LinearGradient
          colors={[t.colors.primary + '55', 'transparent']}
          style={styles.orbFill}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            width: orbSize,
            height: orbSize,
            bottom: -orbSize * 0.3,
            right: -orbSize * 0.25,
          },
          orbB,
        ]}
      >
        <LinearGradient
          colors={[t.colors.car + '3A', 'transparent']}
          style={styles.orbFill}
        />
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbFill: { flex: 1, borderRadius: 999 },
});
