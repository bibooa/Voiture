import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Path, Rect, G } from 'react-native-svg';
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
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Pulse } from './Pulse';

type Props = {
  /** 'dot' shows a glowing user dot (home); 'arrow' shows a rotating arrow (guidance). */
  variant?: 'dot' | 'arrow';
  /** Rotation (deg) for the arrow variant — heading-relative bearing to the car. */
  rotation?: number;
  /** True when the user has arrived at the car. */
  arrived?: boolean;
  /** Optional distance label shown in a bubble above the car pin, e.g. "127 m". */
  distanceLabel?: string;
};

/**
 * A stylised, animated "3D" scene used as the app's living background: a dark
 * city grid tilted into perspective with glowing streets and blocks, a floating
 * glowing car pin (with distance bubble), a dashed route, and a user marker
 * (glowing dot, or an arrow that rotates toward the car). Purely decorative —
 * real distance/bearing drive the arrow and turn-by-turn opens native maps.
 */
export function GuidanceScene({ variant = 'dot', rotation = 0, arrived, distanceLabel }: Props) {
  const t = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const stroke = t.colors.primary;

  // Screen-space anchor centres for the two markers (and the route between).
  const car = { x: W * 0.64, y: H * 0.27 };
  const usr = { x: W * 0.4, y: H * 0.52 };

  // Gentle looping motion.
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
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 8000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [t.animations, drift, float]);

  const groundStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: '60deg' },
      { scale: 1.8 },
      { translateY: -10 + drift.value * 16 },
      { translateX: -10 + drift.value * 20 },
    ],
  }));

  const carFloat = useAnimatedStyle(() => ({ transform: [{ translateY: -float.value * 6 }] }));

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
  const blocks = useMemo(() => buildBlocks(), []);

  return (
    <View style={styles.root} pointerEvents="none">
      {/* Deep backdrop */}
      <LinearGradient
        colors={t.colors.isDark ? ['#0A1230', '#070B1C', '#04060F'] : ['#Dfe7fb', '#e9eefb', '#f3f6ff']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Corner glows */}
      <View style={[styles.cornerGlow, { top: -H * 0.12, left: -W * 0.28 }]}>
        <LinearGradient colors={[stroke + '4D', 'transparent']} style={styles.glowFill} />
      </View>
      <View style={[styles.cornerGlow, { bottom: -H * 0.1, right: -W * 0.3 }]}>
        <LinearGradient colors={['#7C5CFF4D', 'transparent']} style={styles.glowFill} />
      </View>

      {/* Tilted ground plane: blocks + glowing streets */}
      <Animated.View style={[styles.groundWrap, groundStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 400 400">
          <G>
            {blocks.map((b, i) => (
              <Rect
                key={`b${i}`}
                x={b[0]}
                y={b[1]}
                width={b[2]}
                height={b[3]}
                rx={4}
                fill={stroke}
                fillOpacity={t.colors.isDark ? 0.06 : 0.1}
                stroke={stroke}
                strokeOpacity={0.12}
                strokeWidth={0.8}
              />
            ))}
          </G>
          {streets.map((s, i) => (
            <Line
              key={`g${i}`}
              x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]}
              stroke={stroke} strokeOpacity={0.09} strokeWidth={s[4] ? 10 : 6} strokeLinecap="round"
            />
          ))}
          {streets.map((s, i) => (
            <Line
              key={`c${i}`}
              x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]}
              stroke={stroke} strokeOpacity={s[4] ? 0.5 : 0.22} strokeWidth={s[4] ? 2.6 : 1.3} strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>

      {/* Dashed route (screen space, aligns with upright markers) */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Line x1={usr.x} y1={usr.y} x2={car.x} y2={car.y} stroke={stroke} strokeOpacity={0.14} strokeWidth={7} strokeLinecap="round" />
        <Line
          x1={usr.x} y1={usr.y} x2={car.x} y2={car.y}
          stroke={stroke} strokeOpacity={0.85} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="2 9"
        />
      </Svg>

      {/* Car pin + distance bubble */}
      <Animated.View style={[styles.marker, { left: car.x, top: car.y }, carFloat]}>
        {distanceLabel ? (
          <View style={[styles.bubble, { backgroundColor: t.colors.glassStrong, borderColor: t.colors.glassBorder }]}>
            <Icon name="car" size={13} color={t.colors.text} />
            <AppText variant="caption" weight="bold" style={{ marginLeft: 5 }}>
              {distanceLabel}
            </AppText>
          </View>
        ) : null}
        <View style={styles.pulseWrap}>
          <Pulse color={t.colors.car} size={110} rings={2} />
        </View>
        <View style={[styles.pin, { borderColor: t.colors.primary + 'CC', shadowColor: t.colors.primary }]}>
          <View style={[styles.pinInner, { backgroundColor: t.colors.primary + '26' }]}>
            <Icon name="car" size={24} color={t.colors.text} />
          </View>
        </View>
        <View style={[styles.pinTip, { backgroundColor: t.colors.primary }]} />
        <View style={[styles.groundRing, { borderColor: t.colors.primary + '66' }]} />
      </Animated.View>

      {/* User marker */}
      <View style={[styles.marker, { left: usr.x, top: usr.y }]}>
        <View style={[styles.userRing, { borderColor: t.colors.primary + '33' }]} />
        {variant === 'arrow' ? (
          <Animated.View
            style={[
              styles.arrowDisc,
              arrived
                ? { backgroundColor: t.colors.car + '2E', borderColor: t.colors.car + '99' }
                : { backgroundColor: t.colors.primary + '2E', borderColor: t.colors.primary + '99' },
              arrowStyle,
            ]}
          >
            <Ionicons name={arrived ? 'checkmark' : 'navigate'} size={34} color={arrived ? t.colors.car : t.colors.primary} />
          </Animated.View>
        ) : (
          <View style={[styles.userDotOuter, { backgroundColor: t.colors.primary + '33' }]}>
            <View style={[styles.userDot, { backgroundColor: t.colors.primary, shadowColor: t.colors.primary }]} />
          </View>
        )}
      </View>
    </View>
  );
}

/** Street network (viewBox 0..400). [x1,y1,x2,y2, main?]. */
function buildStreets(): [number, number, number, number, number?][] {
  return [
    [70, -20, 40, 420],
    [160, -20, 150, 420, 1],
    [250, -20, 265, 420],
    [340, -20, 372, 420],
    [-20, 90, 420, 72],
    [-20, 170, 420, 166, 1],
    [-20, 250, 420, 262],
    [-20, 330, 420, 350],
    [40, 420, 250, 140],
    [372, 420, 160, 150],
  ];
}

/** City blocks between the streets, for a bit of depth. [x,y,w,h]. */
function buildBlocks(): [number, number, number, number][] {
  return [
    [88, 96, 52, 52], [172, 92, 60, 54], [278, 98, 46, 50],
    [84, 190, 54, 44], [174, 188, 64, 48], [284, 192, 52, 46],
    [92, 274, 50, 44], [176, 276, 60, 46], [286, 278, 50, 44],
  ];
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  cornerGlow: { position: 'absolute', width: 380, height: 380, borderRadius: 190 },
  glowFill: { flex: 1, borderRadius: 190 },
  groundWrap: { position: 'absolute', top: '10%', left: 0, right: 0, height: '72%' },
  marker: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    position: 'absolute',
    bottom: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pulseWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: 58,
    height: 58,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    backgroundColor: 'rgba(10,16,32,0.45)',
  },
  pinInner: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pinTip: { width: 10, height: 10, borderRadius: 2, marginTop: -5, transform: [{ rotate: '45deg' }], opacity: 0.9 },
  groundRing: { position: 'absolute', bottom: -18, width: 70, height: 22, borderRadius: 35, borderWidth: 1.5, transform: [{ scaleX: 1.4 }] },
  userRing: { position: 'absolute', width: 116, height: 116, borderRadius: 58, borderWidth: 1.5 },
  userDotOuter: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  userDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  arrowDisc: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
