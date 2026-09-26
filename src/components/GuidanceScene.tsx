import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { Pulse } from './Pulse';

type Props = {
  /** Rotation (deg) for the guidance arrow — heading-relative bearing to car. */
  rotation: number;
  /** True when the user has arrived at the car. */
  arrived?: boolean;
};

/**
 * A stylised, animated "3D" guidance scene used in place of a raw map on the
 * Find screen: a dark city grid tilted into perspective with glowing streets, a
 * floating glowing car pin, and a navigation arrow that rotates toward the car.
 * Purely decorative — the real distance/bearing drive the arrow, and turn-by-turn
 * still opens the native maps app.
 */
export function GuidanceScene({ rotation, arrived }: Props) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();

  // Gentle looping "life" for the ground plane and floating markers.
  const drift = useSharedValue(0);
  const float = useSharedValue(0);
  useEffect(() => {
    if (!t.animations) {
      drift.value = 0;
      float.value = 0;
      return;
    }
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 7000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [t.animations, drift, float]);

  const groundStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: '58deg' },
      { scale: 1.7 },
      { translateY: -20 + drift.value * 18 },
      { translateX: -12 + drift.value * 24 },
    ],
  }));

  const carFloat = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 6 }],
  }));

  // Arrow rotates toward the car via the shortest path.
  const angle = useSharedValue(rotation);
  useEffect(() => {
    const current = angle.value % 360;
    const target = rotation % 360;
    const delta = ((target - current + 540) % 360) - 180;
    angle.value = t.animations
      ? withSpring(current + delta, { damping: 14, stiffness: 90 })
      : current + delta;
  }, [rotation, angle, t.animations]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 4 }, { rotate: `${angle.value}deg` }],
  }));

  const streets = useMemo(() => buildStreets(), []);
  const stroke = t.colors.primary;

  return (
    <View style={styles.root} pointerEvents="none">
      {/* Deep backdrop */}
      <LinearGradient
        colors={['#0A1230', '#070B1C', '#04060F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Corner glows */}
      <View style={[styles.cornerGlow, { top: -height * 0.12, left: -width * 0.25 }]}>
        <LinearGradient colors={[stroke + '55', 'transparent']} style={styles.glowFill} />
      </View>
      <View style={[styles.cornerGlow, { bottom: -height * 0.14, right: -width * 0.28 }]}>
        <LinearGradient colors={['#7C5CFF55', 'transparent']} style={styles.glowFill} />
      </View>

      {/* Tilted ground plane with glowing streets */}
      <Animated.View style={[styles.groundWrap, groundStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 400 400">
          <Defs>
            <SvgGradient id="road" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity="0.05" />
              <Stop offset="0.5" stopColor={stroke} stopOpacity="0.22" />
              <Stop offset="1" stopColor={stroke} stopOpacity="0.05" />
            </SvgGradient>
          </Defs>
          {/* Wide soft glow pass */}
          {streets.map((s, i) => (
            <Line
              key={`g${i}`}
              x1={s[0]}
              y1={s[1]}
              x2={s[2]}
              y2={s[3]}
              stroke={stroke}
              strokeOpacity={0.08}
              strokeWidth={s[4] ? 9 : 6}
              strokeLinecap="round"
            />
          ))}
          {/* Crisp line pass */}
          {streets.map((s, i) => (
            <Line
              key={`c${i}`}
              x1={s[0]}
              y1={s[1]}
              x2={s[2]}
              y2={s[3]}
              stroke={stroke}
              strokeOpacity={s[4] ? 0.5 : 0.24}
              strokeWidth={s[4] ? 2.4 : 1.4}
              strokeLinecap="round"
            />
          ))}
          {/* Faint route between the two markers */}
          <Path
            d="M 150 300 Q 210 235 250 140"
            stroke={stroke}
            strokeOpacity={0.55}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeDasharray="1 12"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Car pin (upper) */}
      <Animated.View style={[styles.carAnchor, carFloat]}>
        <View style={styles.pulseWrap}>
          <Pulse color={t.colors.car} size={120} rings={2} />
        </View>
        <View style={[styles.pin, { borderColor: t.colors.car + 'CC', shadowColor: t.colors.car }]}>
          <View style={[styles.pinInner, { backgroundColor: t.colors.car + '22' }]}>
            <Icon name="car" size={26} color={t.colors.car} />
          </View>
        </View>
        <View style={[styles.pinTip, { backgroundColor: t.colors.car }]} />
      </Animated.View>

      {/* User navigation arrow (lower center) */}
      <View style={styles.arrowAnchor}>
        <View style={[styles.arrowGlowRing, { borderColor: t.colors.primary + '40' }]} />
        <Animated.View
          style={[
            styles.arrowDisc,
            arrived ? { backgroundColor: t.colors.car + '2A', borderColor: t.colors.car + '80' } : { backgroundColor: t.colors.primary + '2A', borderColor: t.colors.primary + '80' },
            arrowStyle,
          ]}
        >
          <Ionicons
            name={arrived ? 'checkmark' : 'navigate'}
            size={40}
            color={arrived ? t.colors.car : t.colors.primary}
          />
        </Animated.View>
      </View>
    </View>
  );
}

/** A small hand-made street network (viewBox 0..400). [x1,y1,x2,y2, main?]. */
function buildStreets(): [number, number, number, number, number?][] {
  return [
    // Vertical-ish avenues
    [70, -20, 40, 420],
    [160, -20, 150, 420, 1],
    [250, -20, 265, 420],
    [340, -20, 370, 420],
    // Horizontal-ish streets
    [-20, 90, 420, 70],
    [-20, 170, 420, 165, 1],
    [-20, 250, 420, 260],
    [-20, 330, 420, 350],
    // Diagonals for depth
    [40, 420, 250, 140],
    [370, 420, 160, 150],
    [200, -20, 330, 200],
  ];
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  cornerGlow: { position: 'absolute', width: 360, height: 360, borderRadius: 180 },
  glowFill: { flex: 1, borderRadius: 180 },
  groundWrap: { position: 'absolute', top: '18%', left: 0, right: 0, height: '70%' },
  carAnchor: { position: 'absolute', top: '26%', right: '20%', alignItems: 'center' },
  pulseWrap: { position: 'absolute', top: -36, alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    backgroundColor: 'rgba(10,20,20,0.35)',
  },
  pinInner: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTip: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginTop: -5,
    transform: [{ rotate: '45deg' }],
    opacity: 0.9,
  },
  arrowAnchor: { position: 'absolute', top: '56%', left: 0, right: 0, alignItems: 'center' },
  arrowGlowRing: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1.5,
  },
  arrowDisc: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
