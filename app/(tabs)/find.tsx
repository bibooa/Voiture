import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

import {
  GuidanceScene,
  AppText,
  Icon,
  GlassCard,
  GlassButton,
  PrimaryButton,
  AccuracyBadge,
  EmptyState,
} from '@/components';
import { useTheme } from '@/theme';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useCarStore } from '@/store/carStore';
import { distanceMeters, bearingDegrees, compassFromBearing, formatDistance, formatWalkTime } from '@/utils/geo';
import { formatHistoryDate } from '@/utils/time';
import { openWalkingDirections, shareLocation } from '@/services/navigation';
import { haptics } from '@/services/haptics';

/** Distance (m) under which we consider the user has arrived at the car. */
const ARRIVAL_RADIUS = 18;

export default function FindScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { fix, heading } = useLiveLocation();
  const current = useCarStore((s) => s.current);

  const car = current ? { latitude: current.latitude, longitude: current.longitude } : null;
  const user = fix ? { latitude: fix.latitude, longitude: fix.longitude } : null;

  const nav = useMemo(() => {
    if (!user || !car) return null;
    const distance = distanceMeters(user, car);
    const bearing = bearingDegrees(user, car);
    return { distance, bearing, compass: compassFromBearing(bearing) };
  }, [user, car]);

  // Arrow rotation: point where to physically walk when heading is known,
  // otherwise show the true bearing to the car.
  const arrowRotation = useMemo(() => {
    if (!nav) return 0;
    return heading != null ? (nav.bearing - heading + 360) % 360 : nav.bearing;
  }, [nav, heading]);

  const arrived = nav != null && nav.distance <= ARRIVAL_RADIUS;

  // Fire a single celebratory haptic the moment the user arrives.
  const arrivedRef = useRef(false);
  useEffect(() => {
    if (arrived && !arrivedRef.current) {
      arrivedRef.current = true;
      haptics.success();
    } else if (!arrived) {
      arrivedRef.current = false;
    }
  }, [arrived]);

  if (!current) {
    return (
      <View style={styles.root}>
        <GuidanceScene rotation={0} />
        <View style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: 120 }}>
          <EmptyState
            icon="car"
            title="Aucune voiture enregistrée"
            message="Enregistrez d'abord l'emplacement de votre voiture pour pouvoir la retrouver."
            action={<PrimaryButton label="Enregistrer ma position" onPress={() => router.push('/')} />}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GuidanceScene rotation={arrowRotation} arrived={arrived} />

      <View style={[styles.header, { top: insets.top + 8 }]} pointerEvents="none">
        <GlassCard padded={false} radius={t.radius.pill} style={styles.titlePill}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="compass" size={18} color={t.colors.primary} />
            <AppText variant="callout" weight="semibold" style={{ marginLeft: 8 }}>
              Retrouver ma voiture
            </AppText>
          </View>
        </GlassCard>
      </View>

      {/* Big distance readout floating over the scene */}
      <Animated.View entering={FadeIn.duration(500)} style={[styles.readout, { top: insets.top + 74 }]} pointerEvents="none">
        <AppText variant="label" tone="muted" center>
          {arrived ? 'VOUS Y ÊTES' : 'VOTRE VOITURE EST À'}
        </AppText>
        <AppText variant="hero" center color={arrived ? t.colors.car : undefined} style={{ marginTop: 2 }}>
          {arrived ? 'Arrivé' : nav ? formatDistance(nav.distance) : '—'}
        </AppText>
        {!arrived && nav ? (
          <View style={styles.dirRow}>
            <View style={[styles.dirBadge, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
              <AppText variant="caption" weight="bold" tone="accent">
                {nav.compass.arrow}
              </AppText>
            </View>
            <AppText variant="callout" weight="semibold" style={{ marginLeft: 8 }}>
              {nav.compass.label} · ~{formatWalkTime(nav.distance)}
            </AppText>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(450)}
        style={[styles.bottom, { paddingBottom: insets.bottom + 92 }]}
        pointerEvents="box-none"
      >
        <GlassCard strong>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <AppText variant="label" tone="muted">
                Précision actuelle
              </AppText>
              <AccuracyBadge accuracy={fix?.accuracy ?? null} showValue compact style={{ marginTop: 4 }} />
            </View>
            <View style={styles.metaItem}>
              <AppText variant="label" tone="muted">
                Enregistrée
              </AppText>
              <AppText variant="caption" weight="medium" style={{ marginTop: 4 }}>
                {formatHistoryDate(current.savedAt)}
              </AppText>
            </View>
          </View>

          {current.note ? (
            <View style={[styles.noteChip, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
              <Icon name="floor" size={15} color={t.colors.primary} />
              <AppText variant="caption" weight="medium" style={{ marginLeft: 8, flex: 1 }} numberOfLines={2}>
                {current.note}
              </AppText>
            </View>
          ) : null}

          {heading == null ? (
            <View style={styles.hintRow}>
              <Icon name="compass" size={14} color={t.colors.textMuted} />
              <AppText variant="caption" tone="muted" style={{ marginLeft: 6, flex: 1 }}>
                Boussole indisponible — la flèche indique le cap vers la voiture (nord en haut).
              </AppText>
            </View>
          ) : null}

          <PrimaryButton
            label="ME GUIDER"
            icon="navigate"
            onPress={() => openWalkingDirections(current.latitude, current.longitude, current.label ?? 'Ma voiture')}
            style={{ marginTop: 16 }}
          />
          <GlassButton
            label="Partager la position"
            icon="share"
            onPress={() =>
              shareLocation(current.latitude, current.longitude, current.label ?? 'Ma voiture', current.note)
            }
            style={{ marginTop: 10 }}
          />
        </GlassCard>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  titlePill: { paddingHorizontal: 18, height: 46, justifyContent: 'center' },
  readout: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  dirRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  dirBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  noteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaRow: { flexDirection: 'row' },
  metaItem: { flex: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});
