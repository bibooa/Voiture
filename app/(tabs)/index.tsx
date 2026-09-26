import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  MapCanvas,
  MapControls,
  type MapCanvasHandle,
  AppText,
  Icon,
  GlassCard,
  GpsBadge,
  PrimaryButton,
  GlassButton,
  StabilizationOverlay,
  SaveConfirmation,
  PromptModal,
  qualityColor,
} from '@/components';
import { useTheme } from '@/theme';
import { useLocationProfile } from '@/hooks/useLocationProfile';
import { useCarGuidance } from '@/hooks/useCarGuidance';
import { useNow } from '@/hooks/useNow';
import { useSaveCar } from '@/hooks/useSaveCar';
import { useCarStore } from '@/store/carStore';
import { useLocationStore } from '@/store/locationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { timeAgo } from '@/utils/time';
import { APP_NAME } from '@/constants';

const TAB_BAR_SPACE = 84;

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle>(null);

  useLocationProfile('map');
  const now = useNow(2000);
  const g = useCarGuidance(now);
  const error = useLocationStore((s) => s.error);
  const setNote = useCarStore((s) => s.setNote);
  const mapType = useSettingsStore((s) => s.mapType);
  const save = useSaveCar();

  const [cardH, setCardH] = useState(260);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [camHeading, setCamHeading] = useState(0);

  const headerH = insets.top + 46;
  const car = g.car;

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <MapCanvas
        ref={mapRef}
        user={g.fix}
        car={car}
        route={g.route?.coordinates ?? null}
        mapType={mapType}
        padding={{ top: headerH, bottom: cardH }}
        onCameraHeading={setCamHeading}
      />

      {/* Header over a soft fade so the title stays readable on any map */}
      <LinearGradient
        pointerEvents="none"
        colors={[t.colors.background, t.colors.background + 'CC', t.colors.background + '00']}
        style={[styles.fade, { height: headerH + 40 }]}
      />
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <LinearGradient colors={t.colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
          <Icon name="pin" size={15} color="#fff" />
        </LinearGradient>
        <AppText variant="callout" weight="bold" style={{ flex: 1, marginLeft: 9 }}>
          {APP_NAME}
        </AppText>
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Réglages" hitSlop={10}>
          <View style={[styles.iconBtn, { backgroundColor: t.colors.cardScrim, borderColor: t.colors.glassBorder }]}>
            <Icon name="settings" size={16} color={t.colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      <View style={[styles.badgeRow, { top: headerH + 4 }]} pointerEvents="box-none">
        <GpsBadge accuracy={g.fix?.accuracy} freshness={g.view.freshness} />
      </View>

      <View style={[styles.controls, { bottom: cardH + 12 }]} pointerEvents="box-none">
        <MapControls
          onZoomIn={() => mapRef.current?.zoomBy(1)}
          onZoomOut={() => mapRef.current?.zoomBy(-1)}
          onLocate={() => mapRef.current?.fitAll()}
          cameraHeading={camHeading}
          onCompassPress={() => mapRef.current?.resetNorth()}
        />
      </View>

      {/* Compact bottom card */}
      <Animated.View
        entering={FadeInDown.duration(350)}
        style={[styles.bottom, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
        onLayout={(e: LayoutChangeEvent) => setCardH(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        {error === 'permission-denied' || error === 'services-disabled' ? (
          <GlassCard strong style={{ marginBottom: 10 }}>
            <View style={styles.row}>
              <Icon name="warning" size={20} color={t.colors.warning} />
              <AppText variant="caption" style={{ flex: 1, marginHorizontal: 10 }}>
                {error === 'services-disabled'
                  ? 'Localisation désactivée : activez-la pour voir votre position.'
                  : 'Autorisez la localisation pour voir votre position.'}
              </AppText>
              <GlassButton label="Réglages" compact onPress={() => Linking.openSettings()} />
            </View>
          </GlassCard>
        ) : null}

        <GlassCard strong compact>
          {car ? (
            <>
              <Pressable onPress={() => router.push('/find')} style={styles.row}>
                <View style={[styles.carTile, { backgroundColor: t.colors.car + '1F', borderColor: t.colors.car + '55' }]}>
                  <Icon name="car" size={22} color={t.colors.car} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="label" tone="muted" style={{ fontSize: 10 }}>
                    Votre voiture
                  </AppText>
                  <AppText variant="callout" weight="bold" numberOfLines={1}>
                    {car.label ?? car.address ?? 'Position enregistrée'}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    Enregistrée {timeAgo(car.savedAt, now)}
                  </AppText>
                </View>
                <Icon name="chevron" size={18} color={t.colors.textMuted} />
              </Pressable>

              <DistanceSummary g={g} />

              {car.note ? (
                <Pressable
                  onPress={() => setNoteFor(car.id)}
                  style={[styles.note, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}
                >
                  <Icon name="floor" size={14} color={t.colors.primary} />
                  <AppText variant="caption" weight="medium" numberOfLines={1} style={{ marginLeft: 8, flex: 1 }}>
                    {car.note}
                  </AppText>
                </Pressable>
              ) : null}

              <PrimaryButton label="RETROUVER MA VOITURE" icon="navigate" onPress={() => router.push('/find')} style={{ marginTop: 12 }} />
              <Pressable onPress={save.start} style={styles.textBtn} hitSlop={6}>
                <Icon name="pin" size={15} color={t.colors.textSecondary} />
                <AppText variant="callout" weight="semibold" tone="secondary" style={{ marginLeft: 6 }}>
                  Enregistrer une nouvelle position
                </AppText>
              </Pressable>
            </>
          ) : (
            <>
              <AppText variant="headline" weight="bold">
                Aucune voiture enregistrée
              </AppText>
              <AppText variant="caption" tone="secondary" style={{ marginTop: 4, lineHeight: 18 }}>
                Une fois garé, appuyez sur le bouton. La position est stabilisée pendant quelques secondes
                pour être aussi fiable que possible.
              </AppText>
              <PrimaryButton label="ENREGISTRER MA POSITION" icon="car" variant="car" onPress={save.start} style={{ marginTop: 16 }} />
            </>
          )}
        </GlassCard>
      </Animated.View>

      {save.phase === 'acquiring' || save.phase === 'review' ? (
        <StabilizationOverlay
          phase={save.phase}
          progress={save.progress}
          result={save.result}
          onCancel={save.cancel}
          onRetry={save.retry}
          onSaveAnyway={save.saveAnyway}
        />
      ) : null}
      {save.phase === 'saved' && save.saved ? (
        <SaveConfirmation
          record={save.saved}
          onDone={save.dismiss}
          onAddNote={() => {
            const id = save.saved!.id;
            save.dismiss();
            setNoteFor(id);
          }}
        />
      ) : null}

      <PromptModal
        visible={!!noteFor}
        title="Repère de stationnement"
        placeholder="Ex. Niveau -2, zone B, place 114"
        initialValue={car?.id === noteFor ? car?.note ?? '' : ''}
        onCancel={() => setNoteFor(null)}
        onConfirm={(value) => {
          if (noteFor) setNote(noteFor, value);
          setNoteFor(null);
        }}
      />
    </View>
  );
}

/**
 * Compact summary, worded by the shared presentation model so it always says
 * the same thing as the Find screen: "≈ 125 m · 2 min à pied", then the real
 * accuracies ("Voiture ±5 m · Vous ±9 m").
 */
function DistanceSummary({ g }: { g: ReturnType<typeof useCarGuidance> }) {
  const t = useTheme();
  const v = g.view;
  return (
    <View style={[styles.summary, { borderColor: t.colors.glassBorder }]}>
      {v.headline ? (
        <View style={[styles.row, { marginBottom: 8 }]}>
          {v.headlineTone === 'success' ? <Icon name="checkmark" size={16} color={t.colors.car} /> : null}
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
      {v.distanceText ? (
        // Distance and its margin side by side, each under its own label, so
        // "≈ 3 m" can never be read as a 3 m GPS precision.
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted" style={styles.kicker}>
              {v.distanceLabel}
            </AppText>
            <AppText variant="headline" weight="bold">
              {v.distanceText}
              {v.routeText ? (
                <AppText variant="caption" tone="secondary" weight="medium">
                  {`  ${v.routeText}`}
                </AppText>
              ) : null}
            </AppText>
          </View>
          {v.precisionText ? (
            <View style={{ flex: 1 }}>
              <AppText variant="caption" tone="muted" style={styles.kicker}>
                {v.precisionLabel}
              </AppText>
              <AppText variant="headline" weight="bold">
                {v.precisionText}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : (
        <AppText variant="caption" tone="secondary">
          {v.freshnessText}
        </AppText>
      )}
      <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }}>
        Voiture{' '}
        <AppText variant="caption" weight="bold" color={qualityColor(t, v.carTier)}>
          {v.carAccuracyText}
        </AppText>
        {g.fix ? (
          <>
            {'  ·  Vous '}
            <AppText variant="caption" weight="bold" color={qualityColor(t, v.userTier)}>
              {v.userAccuracyText}
            </AppText>
          </>
        ) : null}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  logo: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeRow: { position: 'absolute', left: 16 },
  controls: { position: 'absolute', right: 14 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  carTile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  summary: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  kicker: { fontSize: 11, marginBottom: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 0 },
});
