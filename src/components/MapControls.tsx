import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { AppText } from './AppText';
import { haptics } from '@/services/haptics';

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  /** Locate button highlighted when the camera follows the user. */
  following?: boolean;
  /** Camera heading (deg); the compass rotates to show north. */
  cameraHeading?: number;
  onResetNorth?: () => void;
};

/** Compact vertical map control column: compass, zoom +/−, locate. */
export function MapControls({ onZoomIn, onZoomOut, onLocate, following, cameraHeading = 0, onResetNorth }: Props) {
  const t = useTheme();
  const surface = { backgroundColor: t.colors.cardScrimStrong, borderColor: t.colors.glassBorder };

  const Btn = ({ onPress, children, label }: { onPress: () => void; children: React.ReactNode; label: string }) => (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
    >
      {children}
    </Pressable>
  );

  // Deviation from north in (-180, 180]; only show the compass when rotated.
  const deviation = ((((cameraHeading + 180) % 360) + 360) % 360) - 180;
  const rotated = Math.abs(deviation) > 3;

  return (
    <View style={styles.col}>
      {rotated && onResetNorth ? (
        <View style={[styles.single, surface]}>
          <Btn onPress={onResetNorth} label="Remettre le nord en haut">
            <View style={{ alignItems: 'center', transform: [{ rotate: `${-cameraHeading}deg` }] }}>
              <View style={[styles.needle, { borderBottomColor: t.colors.danger }]} />
              <AppText variant="label" style={{ fontSize: 9 }}>
                N
              </AppText>
            </View>
          </Btn>
        </View>
      ) : null}

      <View style={[styles.group, surface]}>
        <Btn onPress={onZoomIn} label="Zoomer">
          <Icon name="add" size={22} color={t.colors.text} />
        </Btn>
        <View style={[styles.sep, { backgroundColor: t.colors.glassBorder }]} />
        <Btn onPress={onZoomOut} label="Dézoomer">
          <View style={[styles.minus, { backgroundColor: t.colors.text }]} />
        </Btn>
      </View>

      <View style={[styles.single, surface, following && { borderColor: t.colors.primary }]}>
        <Btn onPress={onLocate} label="Recentrer">
          <Icon name="locate" size={21} color={following ? t.colors.primary : t.colors.text} />
        </Btn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: 10, alignItems: 'center' },
  group: { width: 44, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  single: { width: 44, height: 44, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  btn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: 8 },
  minus: { width: 14, height: 2, borderRadius: 1 },
  needle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
