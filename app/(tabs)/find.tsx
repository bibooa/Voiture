import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AmbientBackground,
  MapCanvas,
  MapControls,
  type MapCanvasHandle,
  AppText,
  Icon,
  type IconName,
  GlassCard,
  GlassButton,
  PrimaryButton,
  GpsBadge,
  DirectionArrow,
  type ArrowMode,
  EmptyState,
  qualityColor,
} from '@/components';
import { useTheme } from '@/theme';
import { useLocationProfile } from '@/hooks/useLocationProfile';
import { useCarGuidance, type CarGuidance } from '@/hooks/useCarGuidance';
import { useNow } from '@/hooks/useNow';
import { useSettingsStore } from '@/store/settingsStore';
import { compassFromBearing, formatDistance, formatDuration } from '@/utils/geo';
import { arrivalRadius } from '@/location/guidance';
import { formatAccuracy, gpsQuality } from '@/location/quality';
import { formatShortWhen } from '@/utils/time';
import { openWalkingDirections, shareLocation } from '@/services/navigation';
import { useRouteStore } from '@/store/routeStore';
import { haptics } from '@/services/haptics';

const TAB_BAR_SPACE = 84;

type Warning = { icon: IconName; text: string; tone: 'warning' | 'danger' | 'muted' };

/** The single most important caveat to show, by priority. */
function topWarning(g: CarGuidance): Warning | null {
  const u = g.guidance?.uncertainty;
  if (g.freshness === 'lost') {
    return {
      icon: 'warning',
      tone: 'danger',
      text: `Signal GPS perdu (dernière position il y a ${g.fixAgeS} s). Éloignez-vous des bâtiments ou sortez du parking couvert.`,
    };
  }
  if (g.freshness === 'stale') return { icon: 'clock', tone: 'warning', text: 'En attente d’une nouvelle position GPS…' };
  if (g.arrival !== 'probably-arrived' && g.guidance?.confidence === 'none') {
    return {
      icon: 'accuracy',
      tone: 'warning',
      text: `Votre voiture est dans la marge d’incertitude du GPS (±${u ?? '?'} m) : aucune direction fiable n’est possible à cette distance.`,
    };
  }
  if (g.compass === 'needs-calibration') {
    return { icon: 'compass', tone: 'warning', text: 'Boussole imprécise : calibrez-la en déplaçant votre téléphone en forme de 8.' };
  }
  if (g.userQuality === 'poor') {
    return {
      icon: 'warning',
      tone: 'warning',
      text: `GPS imprécis ici (${formatAccuracy(g.fix?.accuracy)}). Bâtiments, arbres ou ciel masqué réduisent la précision.`,
    };
  }
  if (g.compass === 'unavailable') {
    return { icon: 'compass', tone: 'muted', text: 'Boussole indisponible : la flèche indique la direction avec le nord en haut.' };
  }
  return null;
}

export default function FindScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle>(null);

  useLocationProfile('guidance');
  const now = useNow(1000);
  const g = useCarGuidance(now);
  const mapType = useSettingsStore((s) => s.mapType);
  const autoRotate = useSettingsStore((s) => s.autoRotateMap);
  const onlineRouting = useSettingsStore((s) => s.onlineRouting);
  const routeStatus = useRouteStore((s) => s.status);
  const routeReason = useRouteStore((s) => s.reason);

  const [follow, setFollow] = useState(true);
  const [panelH, setPanelH] = useState(300);
  const [camHeading, setCamHeading] = useState(0);

  // One gentle haptic when entering the "probably arrived" state.
  const wasArrived = useRef(false);
  useEffect(() => {
    const a = g.arrival === 'probably-arrived';
    if (a && !wasArrived.current) haptics.success();
    wasArrived.current = a;
  }, [g.arrival]);

  const car = g.car;
  if (!car) {
    return (
      <AmbientBackground>
        <View style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: 120 }}>
          <EmptyState
            icon="car"
            title="Aucune voiture enregistrée"
            message="Enregistrez d'abord l'emplacement de votre voiture pour pouvoir la retrouver."
            action={<PrimaryButton label="Enregistrer ma position" onPress={() => router.push('/')} />}
          />
        </View>
      </AmbientBackground>
    );
  }

  const headerH = insets.top + 56;
  const arrived = g.arrival === 'probably-arrived';
  const gd = g.guidance;

  let mode: ArrowMode = 'north';
  let rotation = gd?.bearing ?? 0;
  if (arrived) mode = 'arrived';
  else if (!gd || gd.confidence === 'none') mode = 'none';
  else if (g.relativeBearing != null) {
    mode = 'compass';
    rotation = g.relativeBearing;
  }
  const lowConfidence =
    gd?.confidence === 'low' || g.compass === 'needs-calibration' || g.freshness !== 'live';

  const warning = topWarning(g);
  const carQ = gpsQuality(car.accuracy);
  const updated = g.fixAgeS == null ? '—' : g.fixAgeS <= 1 ? 'à l’instant' : `il y a ${g.fixAgeS} s`;
  const mapsApp = Platform.OS === 'ios' ? 'Plans' : 'Google Maps';

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <MapCanvas
        ref={mapRef}
        user={g.fix}
        car={car}
        carLabel={g.primary ? formatDistance(g.primary.meters) : undefined}
        heading={g.compass === 'good' ? g.headingValue : null}
        route={g.route?.coordinates ?? null}
        mapType={mapType}
        padding={{ top: headerH, bottom: panelH }}
        follow={follow}
        onFollowChange={setFollow}
        rotateWithHeading={autoRotate && g.compass === 'good'}
        onCameraHeading={setCamHeading}
      />

      {/* Live status */}
      <View style={[styles.status, { top: insets.top + 8 }]} pointerEvents="box-none">
        <GpsBadge accuracy={g.fix?.accuracy} freshness={g.freshness} />
        <View style={[styles.updated, { backgroundColor: t.colors.cardScrimStrong, borderColor: t.colors.glassBorder }]}>
          <Icon name="clock" size={13} color={t.colors.textSecondary} />
          <AppText variant="caption" tone="secondary" style={{ marginLeft: 5 }}>
            {updated}
          </AppText>
        </View>
      </View>

      <View style={[styles.controls, { bottom: panelH + 12 }]} pointerEvents="box-none">
        <MapControls
          onZoomIn={() => mapRef.current?.zoomBy(1)}
          onZoomOut={() => mapRef.current?.zoomBy(-1)}
          onLocate={() => {
            setFollow(true);
            mapRef.current?.centerOnUser();
          }}
          following={follow}
          cameraHeading={camHeading}
          onResetNorth={() => mapRef.current?.resetNorth()}
        />
      </View>

      <Animated.View
        entering={FadeInDown.duration(350)}
        style={[styles.bottom, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
        onLayout={(e: LayoutChangeEvent) => setPanelH(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        <GlassCard strong>
          <View style={styles.row}>
            <DirectionArrow rotation={rotation} mode={mode} lowConfidence={lowConfidence} size={84} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              {arrived ? (
                <>
                  <AppText variant="headline" weight="bold" color={t.colors.car}>
                    Vous êtes probablement arrivé
                  </AppText>
                  <AppText variant="caption" tone="secondary" style={{ marginTop: 3, lineHeight: 17 }}>
                    Votre voiture se trouve dans un rayon d’environ {arrivalRadius(gd?.uncertainty ?? null)} m.
                    Regardez autour de vous.
                  </AppText>
                </>
              ) : gd && g.primary ? (
                <>
                  <AppText variant="label" tone="muted" style={{ fontSize: 10 }}>
                    {g.primary.kind === 'route' ? 'Itinéraire à pied' : 'Distance directe estimée'}
                  </AppText>
                  <AppText variant="display" weight="bold" style={{ marginTop: 1 }}>
                    {formatDistance(g.primary.meters)}
                    {g.primary.durationS != null ? (
                      <AppText variant="callout" tone="secondary" weight="medium">
                        {'  '}
                        {formatDuration(g.primary.durationS)}
                      </AppText>
                    ) : null}
                  </AppText>
                  <AppText variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                    Direction : {compassFromBearing(gd.bearing).label}
                    {mode === 'none' ? ' (incertaine)' : lowConfidence ? ' (approximative)' : ''}
                  </AppText>
                </>
              ) : (
                <AppText variant="callout" tone="secondary">
                  Recherche de votre position…
                </AppText>
              )}
            </View>
          </View>

          <View style={[styles.metrics, { borderColor: t.colors.glassBorder }]}>
            <Metric label="Incertitude" value={gd?.uncertainty != null ? `±${gd.uncertainty} m` : '—'} />
            <Metric label="Voiture" value={formatAccuracy(car.accuracy)} color={qualityColor(t, carQ)} />
            <Metric label="Vous" value={formatAccuracy(g.fix?.accuracy)} color={qualityColor(t, g.userQuality)} />
            <Metric label="Garée" value={formatShortWhen(car.savedAt, now)} />
          </View>

          {warning ? (
            <View style={styles.warn}>
              <Icon
                name={warning.icon}
                size={15}
                color={warning.tone === 'danger' ? t.colors.danger : warning.tone === 'warning' ? t.colors.warning : t.colors.textMuted}
              />
              <AppText variant="caption" tone="secondary" style={{ marginLeft: 8, flex: 1, lineHeight: 17 }}>
                {warning.text}
              </AppText>
            </View>
          ) : null}

          {onlineRouting && routeStatus === 'unavailable' && gd && gd.distance >= 40 ? (
            <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>
              {routeReason === 'offline'
                ? 'Itinéraire indisponible sans connexion : distance à vol d’oiseau affichée.'
                : 'Aucun itinéraire piéton trouvé : distance à vol d’oiseau affichée.'}
            </AppText>
          ) : null}

          {car.note ? (
            <View style={[styles.note, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
              <Icon name="floor" size={14} color={t.colors.primary} />
              <AppText variant="caption" weight="medium" style={{ marginLeft: 8, flex: 1 }} numberOfLines={2}>
                {car.note}
              </AppText>
            </View>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              label={`Itinéraire dans ${mapsApp}`}
              icon="navigate"
              onPress={() => openWalkingDirections(car.latitude, car.longitude, car.label ?? 'Ma voiture')}
              style={{ flex: 1 }}
            />
            <GlassButton
              icon="share"
              accessibilityLabel="Partager la position"
              onPress={() => shareLocation(car.latitude, car.longitude, car.label ?? 'Ma voiture', car.note)}
              style={{ width: 54, height: 54, marginLeft: 10 }}
            />
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="label" tone="muted" style={{ fontSize: 9 }}>
        {label}
      </AppText>
      <AppText variant="callout" weight="bold" color={color} style={{ marginTop: 2 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  status: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  updated: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
  },
  controls: { position: 'absolute', right: 14 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  metrics: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metric: { flex: 1 },
  warn: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
});
