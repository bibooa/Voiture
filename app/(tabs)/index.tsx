import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import {
  MapCanvas,
  type MapCanvasHandle,
  AppText,
  Icon,
  GlassCard,
  PrimaryButton,
  GlassButton,
  SaveConfirmation,
  GpsSearchingOverlay,
  PromptModal,
} from '@/components';
import { useTheme } from '@/theme';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useSaveCar } from '@/hooks/useSaveCar';
import { useCarStore } from '@/store/carStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { distanceMeters, formatDistance, formatWalkTime, formatAccuracy } from '@/utils/geo';
import { accuracyLevel } from '@/utils/accuracy';
import { timeAgo } from '@/utils/time';
import { haptics } from '@/services/haptics';

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle>(null);

  const { fix, error } = useLiveLocation();
  const current = useCarStore((s) => s.current);
  const setNote = useCarStore((s) => s.setNote);
  const favorites = useFavoritesStore((s) => s.favorites);
  const mapType = useSettingsStore((s) => s.mapType);
  const { state, save, cancel, dismissConfirmation } = useSaveCar();

  const [noteOpen, setNoteOpen] = useState(false);

  const car = current ? { latitude: current.latitude, longitude: current.longitude } : null;
  const user = fix ? { latitude: fix.latitude, longitude: fix.longitude } : null;

  const distance = useMemo(() => {
    if (!user || !car) return null;
    return distanceMeters(user, car);
  }, [user, car]);

  const recenter = () => {
    haptics.light();
    const points = [user, car].filter(Boolean) as { latitude: number; longitude: number }[];
    if (points.length) mapRef.current?.fitToPoints(points);
  };

  return (
    <View style={styles.root}>
      <MapCanvas
        ref={mapRef}
        user={user}
        userAccuracy={fix?.accuracy ?? null}
        car={car}
        favorites={favorites}
        showRoute
        mapType={mapType}
        onMarkerPress={() => car && mapRef.current?.centerOn(car)}
      />

      {/* Top floating header */}
      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Animated.View entering={FadeIn.duration(400)}>
          <GlassCard padded={false} radius={t.radius.pill} style={styles.brandPill}>
            <View style={styles.brandRow}>
              <View style={[styles.brandDot, { backgroundColor: t.colors.primary }]}>
                <Icon name="car" size={15} color="#fff" />
              </View>
              <AppText variant="headline" weight="bold" style={{ marginLeft: 9, letterSpacing: 0.2 }}>
                Garée
              </AppText>
            </View>
          </GlassCard>
        </Animated.View>

        <Pressable onPress={recenter} accessibilityLabel="Recentrer la carte">
          <GlassCard padded={false} radius={t.radius.pill} style={styles.iconPill}>
            <Icon name="locate" size={20} color={t.colors.text} />
          </GlassCard>
        </Pressable>
      </View>

      {/* Error banner (permission / services) */}
      {error ? (
        <Animated.View entering={FadeInDown} style={[styles.banner, { top: insets.top + 62 }]}>
          <GlassCard strong>
            <View style={styles.bannerRow}>
              <Icon name="warning" size={22} color={t.colors.warning} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="callout" weight="semibold">
                  {error === 'services-disabled' ? 'Localisation désactivée' : 'Permission requise'}
                </AppText>
                <AppText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  {error === 'services-disabled'
                    ? 'Activez la localisation de votre téléphone.'
                    : 'Autorisez la localisation pour enregistrer votre voiture.'}
                </AppText>
              </View>
              <GlassButton label="Réglages" compact onPress={() => Linking.openSettings()} />
            </View>
          </GlassCard>
        </Animated.View>
      ) : null}

      {/* Bottom control card */}
      <Animated.View
        entering={FadeInDown.duration(450)}
        style={[styles.bottom, { paddingBottom: insets.bottom + 92 }]}
        pointerEvents="box-none"
      >
        <GlassCard strong>
          {current ? (
            <>
              <View style={styles.cardHeader}>
                <View style={[styles.carTile, { borderColor: t.colors.glassBorder }]}>
                  <Icon name="car" size={26} color={t.colors.car} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <AppText variant="caption" tone="muted" weight="semibold">
                    VOTRE VOITURE
                  </AppText>
                  <AppText variant="headline" weight="bold" numberOfLines={1} style={{ marginTop: 1 }}>
                    {current.label ?? current.address ?? 'Position enregistrée'}
                  </AppText>
                  <AppText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                    Enregistrée {timeAgo(current.savedAt)}
                  </AppText>
                </View>
              </View>

              {current.note ? (
                <View style={[styles.noteChip, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
                  <Icon name="floor" size={15} color={t.colors.primary} />
                  <AppText variant="caption" weight="medium" style={{ marginLeft: 8, flex: 1 }} numberOfLines={2}>
                    {current.note}
                  </AppText>
                  <Pressable onPress={() => setNoteOpen(true)} hitSlop={8}>
                    <Icon name="edit" size={15} color={t.colors.textMuted} />
                  </Pressable>
                </View>
              ) : null}

              {/* Stats strip */}
              <View style={[styles.stats, { borderColor: t.colors.glassBorder }]}>
                <Stat icon="navigate" value={distance != null ? formatDistance(distance) : '—'} label="Distance" />
                <View style={[styles.divider, { backgroundColor: t.colors.glassBorder }]} />
                <Stat icon="walk" value={distance != null ? formatWalkTime(distance) : '—'} label="À pied" />
                <View style={[styles.divider, { backgroundColor: t.colors.glassBorder }]} />
                <StatAccuracy accuracy={current.accuracy} />
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  label="Me guider vers ma voiture"
                  icon="navigate"
                  onPress={() => router.push('/find')}
                  style={{ flex: 1 }}
                />
              </View>
              <View style={styles.secondaryRow}>
                <GlassButton
                  label="Réenregistrer"
                  icon="pin"
                  onPress={save}
                  compact
                  style={{ flex: 1 }}
                />
                <GlassButton
                  label={current.note ? 'Modifier le repère' : 'Ajouter un repère'}
                  icon="floor"
                  onPress={() => setNoteOpen(true)}
                  compact
                  style={{ flex: 1 }}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.cardHeader}>
                <View style={[styles.carTile, { borderColor: t.colors.glassBorder }]}>
                  <Icon name="pin" size={24} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <AppText variant="headline" weight="bold">
                    Où est votre voiture ?
                  </AppText>
                  <AppText variant="caption" tone="secondary" style={{ marginTop: 3 }}>
                    Garez-vous, appuyez, et retrouvez-la en un instant.
                  </AppText>
                </View>
              </View>
              <PrimaryButton
                label="ENREGISTRER MA POSITION"
                icon="car"
                variant="car"
                onPress={save}
                loading={state.searching}
                style={{ marginTop: 18 }}
              />
            </>
          )}
        </GlassCard>
      </Animated.View>

      <GpsSearchingOverlay
        visible={state.searching}
        bestAccuracy={state.bestAccuracy}
        sampleCount={state.sampleCount}
        onCancel={cancel}
      />
      <SaveConfirmation
        visible={!!state.confirmation}
        accuracy={state.confirmation?.accuracy ?? null}
        address={state.confirmation?.address}
        onDone={() => {
          dismissConfirmation();
          if (car) mapRef.current?.centerOn(car);
        }}
      />

      <PromptModal
        visible={noteOpen}
        title="Repère de stationnement"
        placeholder="Ex. Niveau -2, zone B, place 114"
        initialValue={current?.note ?? ''}
        onCancel={() => setNoteOpen(false)}
        onConfirm={(value) => {
          if (current) setNote(current.id, value);
          setNoteOpen(false);
        }}
      />
    </View>
  );
}

function Stat({ icon, value, label }: { icon: 'navigate' | 'walk'; value: string; label: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={16} color={t.colors.primary} />
      <AppText variant="callout" weight="bold" style={{ marginTop: 5 }}>
        {value}
      </AppText>
      <AppText variant="label" tone="muted" style={{ fontSize: 9, marginTop: 1 }}>
        {label}
      </AppText>
    </View>
  );
}

function StatAccuracy({ accuracy }: { accuracy: number | null }) {
  const t = useTheme();
  const level = accuracyLevel(accuracy);
  const dotColor =
    level === 'excellent'
      ? t.colors.success
      : level === 'good'
      ? t.colors.warning
      : level === 'poor'
      ? t.colors.danger
      : t.colors.textMuted;
  return (
    <View style={styles.stat}>
      <Icon name="accuracy" size={16} color={t.colors.primary} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginRight: 6 }} />
        <AppText variant="callout" weight="bold">
          {formatAccuracy(accuracy).replace('précision inconnue', '—')}
        </AppText>
      </View>
      <AppText variant="label" tone="muted" style={{ fontSize: 9, marginTop: 1 }}>
        Précision
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandPill: { paddingHorizontal: 14, height: 46, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconPill: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  banner: { position: 'absolute', left: 16, right: 16 },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  carTile: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  noteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 34 },
  actions: { flexDirection: 'row', marginTop: 16 },
  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
