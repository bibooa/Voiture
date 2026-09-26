import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Pulse } from './Pulse';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { accuracyLevel, ACCURACY_META } from '@/utils/accuracy';
import { formatAccuracy } from '@/utils/geo';

type Props = {
  visible: boolean;
  bestAccuracy: number | null;
  sampleCount: number;
  onCancel: () => void;
};

/**
 * A dedicated, fully opaque "acquiring GPS" screen. The background is solid so
 * nothing from the map/home card bleeds through. A live radar pulse plus the
 * current best accuracy show the fix tightening in real time.
 */
export function GpsSearchingOverlay({ visible, bestAccuracy, sampleCount, onCancel }: Props) {
  const t = useTheme();
  if (!visible) return null;

  const level = accuracyLevel(bestAccuracy);
  const meta = ACCURACY_META[level];
  const dotColor =
    level === 'excellent'
      ? t.colors.success
      : level === 'good'
      ? t.colors.warning
      : level === 'poor'
      ? t.colors.danger
      : t.colors.textMuted;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(220)}
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      {/* Fully opaque premium backdrop */}
      <LinearGradient colors={t.colors.backdropGradient} style={StyleSheet.absoluteFill} />

      <View style={styles.center}>
        <View style={styles.radar}>
          <Pulse color={t.colors.primary} size={210} rings={3} />
          <LinearGradient
            colors={t.colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.core, { shadowColor: t.colors.primary }]}
          >
            <Icon name="locate" size={40} color="#fff" />
          </LinearGradient>
        </View>

        <AppText variant="title" center style={{ marginTop: 48 }}>
          Recherche d'une position précise
        </AppText>
        <AppText variant="body" tone="secondary" center style={{ marginTop: 10, maxWidth: 300 }}>
          Nous stabilisons le signal GPS pour un enregistrement fiable.
        </AppText>

        <GlassCard strong style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: dotColor, shadowColor: dotColor }]} />
            <View style={{ flex: 1 }}>
              <AppText variant="callout" weight="semibold">
                {meta.label}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                {sampleCount} mesure{sampleCount > 1 ? 's' : ''} analysée{sampleCount > 1 ? 's' : ''}
              </AppText>
            </View>
            <AppText variant="headline" weight="bold" tone="accent">
              {bestAccuracy != null ? formatAccuracy(bestAccuracy) : '…'}
            </AppText>
          </View>
        </GlassCard>

        <GlassButton label="Annuler" onPress={onCancel} compact style={{ marginTop: 24, minWidth: 160 }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center', zIndex: 90 },
  center: { alignItems: 'center', paddingHorizontal: 32, width: '100%' },
  radar: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  core: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  statusCard: { marginTop: 28, width: '100%', maxWidth: 360 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
