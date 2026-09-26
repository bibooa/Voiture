import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import {
  MapCanvas,
  type MapCanvasHandle,
  AppText,
  GlassCard,
  GlassButton,
  PrimaryButton,
  AccuracyBadge,
  DirectionArrow,
  EmptyState,
} from '@/components';
import { useTheme } from '@/theme';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useCarStore } from '@/store/carStore';
import { useSettingsStore } from '@/store/settingsStore';
import { distanceMeters, bearingDegrees, compassFromBearing, formatDistance, formatWalkTime } from '@/utils/geo';
import { formatHistoryDate } from '@/utils/time';
import { openWalkingDirections } from '@/services/navigation';

export default function FindScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle>(null);

  const { fix, heading } = useLiveLocation();
  const current = useCarStore((s) => s.current);
  const mapType = useSettingsStore((s) => s.mapType);

  const car = current ? { latitude: current.latitude, longitude: current.longitude } : null;
  const user = fix ? { latitude: fix.latitude, longitude: fix.longitude } : null;

  const nav = useMemo(() => {
    if (!user || !car) return null;
    const distance = distanceMeters(user, car);
    const bearing = bearingDegrees(user, car);
    return { distance, bearing, compass: compassFromBearing(bearing) };
  }, [user, car]);

  // Fit both points when we first have them.
  useEffect(() => {
    if (user && car) mapRef.current?.fitToPoints([user, car]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user, !!car]);

  // Arrow rotation: point where to physically walk when heading is known,
  // otherwise show the map-relative bearing.
  const arrowRotation = useMemo(() => {
    if (!nav) return 0;
    return heading != null ? (nav.bearing - heading + 360) % 360 : nav.bearing;
  }, [nav, heading]);

  if (!current) {
    return (
      <View style={[styles.root, { backgroundColor: t.colors.background }]}>
        <View style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: 120 }}>
          <EmptyState
            icon="🚗"
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
      <MapCanvas
        ref={mapRef}
        user={user}
        userAccuracy={fix?.accuracy ?? null}
        car={car}
        showRoute
        mapType={mapType}
      />

      <View style={[styles.header, { top: insets.top + 8 }]} pointerEvents="none">
        <GlassCard padded={false} radius={t.radius.pill} style={styles.titlePill}>
          <AppText variant="callout" weight="semibold">
            🧭 Retrouver ma voiture
          </AppText>
        </GlassCard>
      </View>

      <Animated.View
        entering={FadeInUp.duration(450)}
        style={[styles.bottom, { paddingBottom: insets.bottom + 92 }]}
        pointerEvents="box-none"
      >
        <GlassCard strong>
          <View style={styles.arrowRow}>
            <DirectionArrow rotation={arrowRotation} size={150} />
            <View style={styles.info}>
              <AppText variant="label" tone="muted">
                Votre voiture est à
              </AppText>
              <AppText variant="hero" style={{ marginVertical: 2 }}>
                {nav ? formatDistance(nav.distance) : '—'}
              </AppText>
              <View style={styles.dirRow}>
                <AppText variant="headline" tone="accent">
                  {nav ? nav.compass.arrow : '·'}
                </AppText>
                <AppText variant="callout" weight="semibold" style={{ marginLeft: 6 }}>
                  {nav ? nav.compass.label : 'Recherche…'}
                </AppText>
              </View>
              {nav ? (
                <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                  ⏱️ ~{formatWalkTime(nav.distance)} à pied
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={[styles.metaRow, { borderTopColor: t.colors.glassBorder }]}>
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

          {heading == null ? (
            <View style={styles.hintRow}>
              <Ionicons name="compass-outline" size={14} color={t.colors.textMuted} />
              <AppText variant="caption" tone="muted" style={{ marginLeft: 6, flex: 1 }}>
                Boussole indisponible — la flèche indique le cap vers la voiture (nord en haut).
              </AppText>
            </View>
          ) : null}

          <PrimaryButton
            label="ME GUIDER"
            icon="🧭"
            onPress={() => openWalkingDirections(current.latitude, current.longitude, current.label ?? 'Ma voiture')}
            style={{ marginTop: 16 }}
          />
          <GlassButton
            label="Recentrer la carte"
            onPress={() => user && car && mapRef.current?.fitToPoints([user, car])}
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
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  arrowRow: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: 14 },
  dirRow: { flexDirection: 'row', alignItems: 'center' },
  metaRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { flex: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});
