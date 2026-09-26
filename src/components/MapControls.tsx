import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { haptics } from '@/services/haptics';

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  /** Locate highlighted when the camera follows the user. */
  following?: boolean;
  /** Camera heading (deg): the compass needle always points to north. */
  cameraHeading?: number;
  /** Tap on the compass (north-up / heading-up toggle, or reset north). */
  onCompassPress?: () => void;
  /** Compass highlighted when the map follows the phone's orientation. */
  headingUp?: boolean;
};

/** Compact map controls: small compass, zoom +/−, locate. */
export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocate,
  following,
  cameraHeading = 0,
  onCompassPress,
  headingUp,
}: Props) {
  const t = useTheme();
  // Discreet: lighter scrim, small visuals, touch area enlarged by hitSlop.
  const surface = { backgroundColor: t.colors.cardScrim, borderColor: t.colors.glassBorder };

  const tap = (fn?: () => void) => () => {
    haptics.selection();
    fn?.();
  };

  return (
    <View style={styles.col}>
      <Pressable
        onPress={tap(onCompassPress)}
        accessibilityRole="button"
        accessibilityLabel={headingUp ? 'Carte orientée selon le téléphone. Appuyer pour le nord en haut.' : 'Boussole'}
        hitSlop={6}
        style={[styles.compass, surface, headingUp && { borderColor: t.colors.primary }]}
      >
        <View style={{ alignItems: 'center', transform: [{ rotate: `${-cameraHeading}deg` }] }}>
          <View style={[styles.needleN, { borderBottomColor: t.colors.danger }]} />
          <View style={[styles.needleS, { borderTopColor: t.colors.textMuted }]} />
        </View>
      </Pressable>

      <View style={[styles.group, surface]}>
        <Pressable onPress={tap(onZoomIn)} style={styles.btn} accessibilityLabel="Zoomer" hitSlop={6}>
          <Icon name="add" size={17} color={t.colors.text} />
        </Pressable>
        <View style={[styles.sep, { backgroundColor: t.colors.glassBorder }]} />
        <Pressable onPress={tap(onZoomOut)} style={styles.btn} accessibilityLabel="Dézoomer" hitSlop={6}>
          <View style={[styles.minus, { backgroundColor: t.colors.text }]} />
        </Pressable>
      </View>

      <Pressable
        onPress={tap(onLocate)}
        style={[styles.single, surface, following && { borderColor: t.colors.primary }]}
        accessibilityLabel="Recentrer"
        hitSlop={6}
      >
        <Icon name="locate" size={16} color={following ? t.colors.primary : t.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: 8, alignItems: 'center' },
  compass: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { width: 34, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  single: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: { height: 34, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: 8 },
  minus: { width: 11, height: 2, borderRadius: 1 },
  needleN: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  needleS: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
