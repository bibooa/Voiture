import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon, safeIconName } from './Icon';

/**
 * Map markers (children of react-native-maps <Marker>). Kept static and small:
 * a real navigation app needs crisp, readable markers — not glowing props.
 */

export function CarMarker({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={styles.carWrap}>
      {label ? (
        <View style={[styles.label, { backgroundColor: t.colors.backgroundElevated, borderColor: t.colors.glassBorder }]}>
          <AppText variant="caption" weight="bold" style={{ fontSize: 12 }}>
            {label}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.pin, { backgroundColor: t.colors.car, borderColor: '#FFFFFF' }]}>
        <Icon name="car" size={20} color="#FFFFFF" />
      </View>
      <View style={[styles.tip, { borderTopColor: '#FFFFFF' }]} />
    </View>
  );
}

export function UserMarker() {
  const t = useTheme();
  return (
    <View style={styles.userWrap}>
      <View style={[styles.userHalo, { backgroundColor: t.colors.primary + '30' }]} />
      <View style={[styles.userDot, { backgroundColor: t.colors.primary }]} />
    </View>
  );
}

/** A view cone pointing up; the map rotates it with the compass heading. */
export function HeadingCone() {
  const t = useTheme();
  return (
    <View style={styles.coneWrap}>
      <View style={[styles.cone, { borderTopColor: t.colors.primary + '55' }]} />
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

const styles = StyleSheet.create({
  carWrap: { alignItems: 'center' },
  label: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  userWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  userHalo: { position: 'absolute', width: 34, height: 34, borderRadius: 17 },
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
  // 90×90 square with the cone tip at the exact centre so it rotates about
  // the user's position on both iOS and Android.
  coneWrap: { width: 90, height: 90, alignItems: 'center' },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 26,
    borderRightWidth: 26,
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
