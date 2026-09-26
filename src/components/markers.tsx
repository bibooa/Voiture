import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Icon, safeIconName } from './Icon';

/**
 * Map markers (children of react-native-maps <Marker>).
 *
 *  - Car: green disc with a white car glyph, discreet halo, "VOITURE" above and
 *    the estimated distance below — plain outlined text, no opaque badge that
 *    would hide the map.
 *  - User: the familiar blue dot with a white ring. Different shape AND colour
 *    from the car, so "blue dot = me" is instant.
 *
 * On Android custom markers are rasterised, so the pulse only runs on iOS
 * (live views); Android shows the static halo.
 */

const LABEL_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};

function PulseRing({ color }: { color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(p);
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - p.value),
    transform: [{ scale: 0.8 + p.value * 0.9 }],
  }));
  return <Animated.View style={[styles.pulse, { borderColor: color }, style]} />;
}

export function CarMarker({ distance, animate = true }: { distance?: string; animate?: boolean }) {
  const t = useTheme();
  const car = t.colors.car;
  return (
    <View style={styles.carWrap}>
      <Text style={[styles.caption, LABEL_SHADOW]}>VOITURE</Text>
      <View style={styles.carCenter}>
        <View style={[styles.halo, { backgroundColor: car + '2E' }]} />
        {animate && Platform.OS === 'ios' ? <PulseRing color={car} /> : null}
        <View style={[styles.carDisc, { backgroundColor: car }]}>
          <Icon name="car" size={19} color="#FFFFFF" />
        </View>
      </View>
      {distance ? <Text style={[styles.distance, LABEL_SHADOW]}>{distance}</Text> : <View style={{ height: 16 }} />}
    </View>
  );
}

export function UserMarker() {
  const t = useTheme();
  return (
    <View style={styles.userWrap}>
      <View style={[styles.userHalo, { backgroundColor: t.colors.primary + '33' }]} />
      <View style={[styles.userDot, { backgroundColor: t.colors.primary }]} />
    </View>
  );
}

/** A view cone pointing up; rotated with the compass heading by the map. */
export function HeadingCone() {
  const t = useTheme();
  return (
    <View style={styles.coneWrap}>
      <View style={[styles.cone, { borderTopColor: t.colors.primary + '4D' }]} />
    </View>
  );
}

export function FavoriteMarker({ icon }: { icon: string }) {
  const t = useTheme();
  return (
    <View style={[styles.fav, { backgroundColor: t.colors.backgroundElevated, borderColor: t.colors.glassBorder }]}>
      <Icon name={safeIconName(icon)} size={16} color={t.colors.primary} />
    </View>
  );
}

const CAR_BOX = 64;

const styles = StyleSheet.create({
  carWrap: { alignItems: 'center', width: 96 },
  // caption and distance share the same height so the disc is exactly centred
  caption: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, height: 16, lineHeight: 16 },
  carCenter: { width: CAR_BOX, height: CAR_BOX, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 52, height: 52, borderRadius: 26 },
  pulse: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  carDisc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  distance: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', height: 16, lineHeight: 16 },
  userWrap: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  userHalo: { position: 'absolute', width: 30, height: 30, borderRadius: 15 },
  userDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  // 90×90 box with the cone tip at the exact centre (rotation pivot).
  coneWrap: { width: 90, height: 90, alignItems: 'center' },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 24,
    borderRightWidth: 24,
    borderTopWidth: 45,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  fav: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
