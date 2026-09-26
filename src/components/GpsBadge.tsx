import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme, type Theme } from '@/theme';
import { AppText } from './AppText';
import { GlassCard } from './GlassCard';
import { Icon } from './Icon';
import { formatAccuracy, gpsQuality, QUALITY_META, QUALITY_THRESHOLDS, type GpsQuality, type QualityTone } from '@/location/quality';

import type { Freshness as GpsFreshness } from '@/location/presentation';

export type { GpsFreshness };

export function toneColor(t: Theme, tone: QualityTone): string {
  return tone === 'success'
    ? t.colors.success
    : tone === 'warning'
      ? t.colors.warning
      : tone === 'danger'
        ? t.colors.danger
        : t.colors.textMuted;
}

export function qualityColor(t: Theme, q: GpsQuality): string {
  return toneColor(t, QUALITY_META[q].tone);
}

type Props = {
  accuracy: number | null | undefined;
  /** Live freshness of the fix; omit for a stored position. */
  freshness?: GpsFreshness;
  style?: ViewStyle;
  /** Smaller variant for inline use. */
  small?: boolean;
};

/**
 * The one GPS indicator used everywhere: "● GPS · ±9 m". The dot colour gives
 * the tier; the real value is always shown. Tapping it explains GPS accuracy.
 */
export function GpsBadge({ accuracy, freshness = 'live', style, small }: Props) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  const q = gpsQuality(accuracy);
  let color = qualityColor(t, q);
  let value = formatAccuracy(accuracy);
  if (freshness === 'none') {
    color = t.colors.textMuted;
    value = 'recherche…';
  } else if (freshness === 'lost') {
    color = t.colors.danger;
    value = 'signal perdu';
  } else if (freshness === 'stale') {
    color = t.colors.warning;
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`GPS ${value}, ${QUALITY_META[q].label}. Appuyer pour en savoir plus.`}
        hitSlop={6}
      >
        <View
          style={[
            styles.badge,
            small && styles.badgeSmall,
            { backgroundColor: t.colors.cardScrimStrong, borderColor: t.colors.glassBorder },
            style,
          ]}
        >
          <View style={[styles.dot, { backgroundColor: color }]} />
          <AppText variant="caption" weight="semibold" tone="secondary" style={{ fontSize: small ? 12 : 13 }}>
            GPS ·{' '}
          </AppText>
          <AppText variant="caption" weight="bold" style={{ fontSize: small ? 12 : 13 }}>
            {value}
          </AppText>
        </View>
      </Pressable>
      <GpsInfoModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const LEGEND: { q: GpsQuality; range: string }[] = [
  { q: 'excellent', range: `±0 – ${QUALITY_THRESHOLDS.excellent} m` },
  { q: 'good', range: `±${QUALITY_THRESHOLDS.excellent} – ${QUALITY_THRESHOLDS.good} m` },
  { q: 'fair', range: `±${QUALITY_THRESHOLDS.good} – ${QUALITY_THRESHOLDS.fair} m` },
  { q: 'poor', range: `au-delà de ±${QUALITY_THRESHOLDS.fair} m` },
];

export function GpsInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(150)} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,5,12,0.72)' }]} onPress={onClose} />
      </Animated.View>
      <View style={styles.modalWrap} pointerEvents="box-none">
        <Animated.View entering={FadeInDown.duration(200)}>
          <GlassCard strong>
            <View style={styles.modalHead}>
              <Icon name="accuracy" size={20} color={t.colors.primary} />
              <AppText variant="headline" weight="bold" style={{ marginLeft: 10, flex: 1 }}>
                Précision de la localisation
              </AppText>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
                <Icon name="close" size={20} color={t.colors.textMuted} />
              </Pressable>
            </View>

            <AppText variant="body" tone="secondary" style={{ marginTop: 10, lineHeight: 21 }}>
              La précision dépend du GPS, des satellites visibles, du Wi-Fi, du réseau mobile et de
              l’environnement. « ±5 m » signifie que la position réelle se trouve le plus souvent dans un
              rayon de 5 m.
            </AppText>

            <View style={[styles.legend, { borderColor: t.colors.glassBorder }]}>
              {LEGEND.map(({ q, range }) => (
                <View key={q} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: qualityColor(t, q) }]} />
                  <AppText variant="caption" weight="semibold" style={{ flex: 1 }}>
                    {QUALITY_META[q].short}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {range}
                  </AppText>
                </View>
              ))}
            </View>

            <AppText variant="caption" weight="semibold" style={{ marginTop: 14 }}>
              La précision baisse souvent :
            </AppText>
            <AppText variant="caption" tone="secondary" style={{ marginTop: 4, lineHeight: 19 }}>
              • à l’intérieur d’un bâtiment ou d’un parking souterrain{'\n'}• entre de grands immeubles{'\n'}
              • sous des arbres ou un ciel masqué
            </AppText>

            <AppText variant="caption" tone="muted" style={{ marginTop: 14, lineHeight: 18 }}>
              VéhiTrack affiche toujours la précision réellement fournie par votre téléphone, arrondie au
              mètre supérieur — jamais une valeur plus flatteuse.
            </AppText>
          </GlassCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  badgeSmall: { height: 28, paddingHorizontal: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  modalWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  modalHead: { flexDirection: 'row', alignItems: 'center' },
  legend: { marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
});
