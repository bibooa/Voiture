import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Pulse } from './Pulse';
import { AccuracyBadge } from './AccuracyBadge';
import { GlassButton } from './GlassButton';

type Props = {
  visible: boolean;
  bestAccuracy: number | null;
  sampleCount: number;
  onCancel: () => void;
};

/**
 * Shown while we acquire a stable fix. A live radar pulse plus the *current*
 * best accuracy so the user can see the position tightening in real time —
 * reinforcing that we wait for a reliable fix instead of grabbing a noisy one.
 */
export function GpsSearchingOverlay({ visible, bestAccuracy, sampleCount, onCancel }: Props) {
  const t = useTheme();
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      <BlurView intensity={45} tint={t.colors.blurTint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.background + 'B0' }]} />

      <View style={styles.center}>
        <View style={styles.radar}>
          <Pulse color={t.colors.primary} size={200} rings={3} />
          <View style={[styles.core, { backgroundColor: t.colors.primary, shadowColor: t.colors.primary }]}>
            <Icon name="locate" size={38} color="#fff" />
          </View>
        </View>

        <AppText variant="headline" center style={{ marginTop: 40 }}>
          Recherche d'une position précise…
        </AppText>
        <AppText variant="body" tone="secondary" center style={{ marginTop: 8 }}>
          Nous stabilisons le signal GPS pour un enregistrement fiable.
        </AppText>

        <View style={{ marginTop: 20, alignItems: 'center', gap: 4 }}>
          <AccuracyBadge accuracy={bestAccuracy} />
          <AppText variant="caption" tone="muted">
            {sampleCount} mesure{sampleCount > 1 ? 's' : ''} analysée{sampleCount > 1 ? 's' : ''}
          </AppText>
        </View>

        <GlassButton label="Annuler" onPress={onCancel} compact style={{ marginTop: 28 }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center', zIndex: 90 },
  center: { alignItems: 'center', paddingHorizontal: 32 },
  radar: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  core: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
