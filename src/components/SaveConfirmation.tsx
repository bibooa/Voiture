import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { GlassCard } from './GlassCard';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { qualityColor } from './GpsBadge';
import { formatAccuracy, gpsQuality, QUALITY_META } from '@/location/quality';
import type { ParkedLocation } from '@/types';

type Props = {
  record: ParkedLocation;
  onDone: () => void;
  onAddNote: () => void;
};

/**
 * Confirmation after saving: what was saved, how precisely, from how many
 * measurements. Auto-closes after a few seconds unless the user acts.
 */
export function SaveConfirmation({ record, onDone, onAddNote }: Props) {
  const t = useTheme();
  const q = gpsQuality(record.accuracy);
  const color = qualityColor(t, q);

  useEffect(() => {
    const id = setTimeout(onDone, 6000);
    return () => clearTimeout(id);
  }, [onDone, record.id]);

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(160)}
      style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: t.colors.background + 'E6' }]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} />
      <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.wrap}>
        <GlassCard strong>
          <View style={styles.head}>
            <View style={[styles.check, { backgroundColor: t.colors.car }]}>
              <Icon name="checkmark" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <AppText variant="headline" weight="bold">
                Voiture enregistrée
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                {record.address ?? 'Recherche de l’adresse…'}
              </AppText>
            </View>
          </View>

          <View style={[styles.stats, { borderColor: t.colors.glassBorder }]}>
            <View style={styles.stat}>
              <AppText variant="label" tone="muted">
                Précision
              </AppText>
              <AppText variant="headline" weight="bold" color={color} style={{ marginTop: 2 }}>
                {formatAccuracy(record.accuracy)}
              </AppText>
              <AppText variant="label" color={color} style={{ fontSize: 9 }}>
                {QUALITY_META[q].short}
              </AppText>
            </View>
            <View style={[styles.div, { backgroundColor: t.colors.glassBorder }]} />
            <View style={styles.stat}>
              <AppText variant="label" tone="muted">
                Mesures
              </AppText>
              <AppText variant="headline" weight="bold" style={{ marginTop: 2 }}>
                {record.sampleCount ?? '—'}
              </AppText>
              <AppText variant="label" tone="muted" style={{ fontSize: 9 }}>
                {record.forced ? 'FORCÉ' : 'STABILISÉ'}
              </AppText>
            </View>
          </View>

          <PrimaryButton label="Terminé" onPress={onDone} />
          <Pressable onPress={onAddNote} style={styles.link} hitSlop={8}>
            <Icon name="floor" size={15} color={t.colors.primary} />
            <AppText variant="callout" weight="semibold" tone="accent" style={{ marginLeft: 6 }}>
              Ajouter un repère (étage, place…)
            </AppText>
          </Pressable>
        </GlassCard>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 100, justifyContent: 'center', paddingHorizontal: 20 },
  wrap: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center' },
  check: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  stats: {
    flexDirection: 'row',
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: 'center' },
  div: { width: StyleSheet.hairlineWidth },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 14 },
});
