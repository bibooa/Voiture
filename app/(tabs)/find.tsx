import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AmbientBackground,
  MapCanvas,
  MapControls,
  ScaleBar,
  type MapCanvasHandle,
  AppText,
  Icon,
  GlassCard,
  PrimaryButton,
  GpsBadge,
  DirectionArrow,
  EmptyState,
  ActionSheet,
  type ActionSheetOption,
  qualityColor,
  toneColor,
} from '@/components';
import { useTheme } from '@/theme';
import { useLocationProfile } from '@/hooks/useLocationProfile';
import { useCarGuidance } from '@/hooks/useCarGuidance';
import { useNow } from '@/hooks/useNow';
import { useSettingsStore } from '@/store/settingsStore';
import { useCarStore } from '@/store/carStore';
import { formatSavedAt } from '@/utils/time';
import { navigationApps, shareLocation } from '@/services/navigation';
import { haptics } from '@/services/haptics';

const TAB_BAR_SPACE = 84;
/** Tilted camera: streets in perspective and buildings in 3D. */
const MAP_PITCH = 55;

/**
 * "Retrouver ma voiture": where am I → where is my car → which way.
 * All wording comes from the shared presentation model (useCarGuidance().view).
 */
export default function FindScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle>(null);

  useLocationProfile('guidance');
  const now = useNow(1000);
  const g = useCarGuidance(now);
  const v = g.view;
  const mapType = useSettingsStore((s) => s.mapType);
  const headingUp = useSettingsStore((s) => s.headingUpMap);
  const setSetting = useSettingsStore((s) => s.set);
  const moveCar = useCarStore((s) => s.moveCar);

  const [follow, setFollow] = useState(true);
  const [panelH, setPanelH] = useState(320);
  const [camHeading, setCamHeading] = useState(0);
  const [mpp, setMpp] = useState(0);
  const [navOptions, setNavOptions] = useState<ActionSheetOption[] | null>(null);

  // One gentle haptic when "probably arrived" is established.
  const wasArrived = useRef(false);
  useEffect(() => {
    const a = v.arrowMode === 'arrived';
    if (a && !wasArrived.current) haptics.success();
    wasArrived.current = a;
  }, [v.arrowMode]);

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

  const topH = insets.top + 64;
  const compassGood = g.compass === 'good';
  const rotate = headingUp && compassGood;

  const openGuide = async () => {
    const apps = await navigationApps(car.latitude, car.longitude, car.label ?? 'Ma voiture');
    setNavOptions(
      apps.map((a) => ({
        label: a.label,
        icon: a.id === 'apple' ? 'map-outline' : a.id === 'google' ? 'navigate-outline' : 'apps-outline',
        onPress: () => {
          a.open();
        },
      }))
    );
  };

  const freshColor =
    v.freshness === 'lost' ? t.colors.danger : v.freshness === 'stale' ? t.colors.warning : t.colors.textSecondary;
  const showArrow = v.arrowMode === 'compass' || v.arrowMode === 'north';

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <MapCanvas
        ref={mapRef}
        user={g.fix}
        car={car}
        heading={compassGood ? g.headingValue : null}
        route={g.route?.coordinates ?? null}
        mapType={mapType}
        padding={{ top: topH, bottom: panelH }}
        follow={follow}
        onFollowChange={setFollow}
        rotateWithHeading={rotate}
        onCameraHeading={setCamHeading}
        onScale={setMpp}
        pitch={MAP_PITCH}
        onCarMoved={(p) => {
          haptics.success();
          moveCar(car.id, p.latitude, p.longitude);
        }}
      />

      {/* TOP: GPS badge + freshness */}
      <LinearGradient
        pointerEvents="none"
        colors={[t.colors.background + 'E6', t.colors.background + '00']}
        style={[styles.fade, { height: topH + 24 }]}
      />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <GpsBadge accuracy={g.fix?.accuracy} freshness={v.freshness} />
        <AppText variant="caption" color={freshColor} style={styles.fresh}>
          {v.freshnessText}
        </AppText>
      </View>

      {/* Map chrome */}
      <View style={[styles.controls, { top: topH + 8 }]} pointerEvents="box-none">
        <MapControls
          onZoomIn={() => mapRef.current?.zoomBy(1)}
          onZoomOut={() => mapRef.current?.zoomBy(-1)}
          onLocate={() => {
            setFollow(true);
            mapRef.current?.fitAll();
          }}
          following={follow}
          cameraHeading={camHeading}
          headingUp={rotate}
          onCompassPress={() => {
            if (compassGood) setSetting('headingUpMap', !headingUp);
            if (!compassGood || headingUp) mapRef.current?.resetNorth();
          }}
        />
      </View>
      <View style={[styles.mapFoot, { bottom: panelH + 10 }]} pointerEvents="none">
        <View style={[styles.legend, { backgroundColor: t.colors.cardScrimStrong }]}>
          <View style={[styles.legendDot, { backgroundColor: t.colors.primary }]} />
          <AppText variant="caption" style={styles.legendText}>
            Vous
          </AppText>
          <View style={[styles.legendDot, { backgroundColor: t.colors.car, marginLeft: 10 }]} />
          <AppText variant="caption" style={styles.legendText}>
            Voiture
          </AppText>
        </View>
        <ScaleBar metersPerPoint={mpp} />
      </View>

      {/* BOTTOM: compact card */}
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[styles.bottom, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
        onLayout={(e: LayoutChangeEvent) => setPanelH(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        <GlassCard strong compact>
          {v.headline ? (
            <View style={[styles.row, { marginBottom: 8 }]}>
              {v.headlineTone === 'success' ? <Icon name="checkmark" size={17} color={t.colors.car} /> : null}
              <AppText
                variant="callout"
                weight="bold"
                color={v.headlineTone === 'success' ? t.colors.car : t.colors.primary}
                style={{ marginLeft: v.headlineTone === 'success' ? 6 : 0, flex: 1 }}
              >
                {v.headline}
              </AppText>
            </View>
          ) : null}

          {/* Distance and its margin, each under its own label: "≈ 3 m" is an
              estimate, "±15 m" is the precision — never confused. */}
          <View style={styles.row}>
            <View style={{ flex: 1.15 }}>
              <AppText variant="caption" tone="muted" style={styles.kicker}>
                {v.distanceLabel}
              </AppText>
              <AppText variant="display" weight="bold" style={styles.distance}>
                {v.distanceText ?? '—'}
              </AppText>
              {v.routeText ? (
                <AppText variant="caption" tone="secondary" weight="medium">
                  {v.routeText}
                </AppText>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" tone="muted" style={styles.kicker}>
                {v.precisionLabel}
              </AppText>
              <AppText variant="display" weight="bold" style={[styles.distance, { color: t.colors.textSecondary }]}>
                {v.precisionText ?? '—'}
              </AppText>
            </View>
            {showArrow ? (
              <DirectionArrow rotation={v.arrowRotation} mode={v.arrowMode} lowConfidence={v.lowConfidence} size={46} />
            ) : null}
          </View>

          {v.headline && v.detail ? (
            <AppText variant="caption" tone="secondary" style={[styles.lh, { marginTop: 6 }]}>
              {v.detail}
            </AppText>
          ) : v.detail ? (
            <AppText variant="caption" tone="secondary" style={[styles.lh, { marginTop: 8 }]}>
              {v.detail}
            </AppText>
          ) : v.directionText ? (
            <AppText variant="callout" weight="semibold" style={{ marginTop: 8 }}>
              {v.directionText}
            </AppText>
          ) : null}

          <View style={[styles.facts, { borderColor: t.colors.glassBorder }]}>
            <Fact label="Garée" value={formatSavedAt(car.savedAt, now).replace(/^à /, '')} />
            <Fact label="Précision voiture" value={v.carAccuracyText} color={qualityColor(t, v.carTier)} />
            <Fact label="Précision actuelle" value={v.userAccuracyText} color={qualityColor(t, v.userTier)} />
          </View>
          {!car.adjusted ? (
            <View style={styles.hint}>
              <Icon name="pin" size={13} color={t.colors.primary} />
              <AppText variant="caption" tone="secondary" style={{ marginLeft: 6, flex: 1 }}>
                Appui long sur la voiture pour la placer pile au bon endroit.
              </AppText>
            </View>
          ) : null}

          {v.warning ? (
            <View style={styles.warn}>
              <Icon name={v.warning.icon} size={14} color={toneColor(t, v.warning.tone)} />
              <AppText variant="caption" tone="secondary" style={[styles.lh, { marginLeft: 8, flex: 1, marginTop: 0 }]}>
                {v.warning.text}
              </AppText>
            </View>
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
            <PrimaryButton label="ME GUIDER" icon="compass" onPress={openGuide} style={{ flex: 1 }} />
            <Pressable
              onPress={() => shareLocation(car.latitude, car.longitude, car.label ?? 'Ma voiture', car.note)}
              style={[styles.shareBtn, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}
              accessibilityRole="button"
              accessibilityLabel="Partager la position"
              hitSlop={4}
            >
              <Icon name="share" size={20} color={t.colors.text} />
            </Pressable>
          </View>
        </GlassCard>
      </Animated.View>

      <ActionSheet
        visible={!!navOptions}
        title="Me guider avec…"
        subtitle="Itinéraire à pied vers votre voiture"
        options={navOptions ?? []}
        onClose={() => setNavOptions(null)}
      />
    </View>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="caption" weight="bold" color={color} style={styles.factValue}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted" style={styles.factLabel} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
  top: { position: 'absolute', top: 0, left: 16, right: 70 },
  fresh: { marginTop: 5, marginLeft: 4 },
  controls: { position: 'absolute', right: 14 },
  // Right-aligned: the Google logo (bottom-left) must stay visible.
  mapFoot: { position: 'absolute', right: 14, alignItems: 'flex-end', gap: 6 },
  legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, height: 24, borderRadius: 12 },
  legendDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff', marginRight: 5 },
  legendText: { fontSize: 11 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  kicker: { fontSize: 11, marginBottom: 1 },
  distance: { fontSize: 26, lineHeight: 31 },
  lh: { lineHeight: 17, marginTop: 2 },
  facts: { marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  fact: { flex: 1 },
  factValue: { fontSize: 15 },
  factLabel: { fontSize: 11, marginTop: 1 },
  hint: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  shareBtn: {
    width: 50,
    height: 50,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warn: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
