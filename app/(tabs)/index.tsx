import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import {
  MapCanvas,
  type MapCanvasHandle,
  AppText,
  GlassCard,
  PrimaryButton,
  GlassButton,
  AccuracyBadge,
  SaveConfirmation,
  GpsSearchingOverlay,
} from '@/components';
import { useTheme } from '@/theme';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useSaveCar } from '@/hooks/useSaveCar';
import { useCarStore } from '@/store/carStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { distanceMeters, formatDistance } from '@/utils/geo';
import { timeAgo } from '@/utils/time';
import { haptics } from '@/services/haptics';

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle>(null);

  const { fix, error, permission } = useLiveLocation();
  const current = useCarStore((s) => s.current);
  const favorites = useFavoritesStore((s) => s.favorites);
  const mapType = useSettingsStore((s) => s.mapType);
  const { state, save, cancel, dismissConfirmation } = useSaveCar();

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
              <Ionicons name="car-sport" size={18} color={t.colors.primary} />
              <AppText variant="headline" weight="bold" style={{ marginLeft: 8 }}>
                Garée
              </AppText>
            </View>
          </GlassCard>
        </Animated.View>

        <Pressable onPress={recenter} accessibilityLabel="Recentrer la carte">
          <GlassCard padded={false} radius={t.radius.pill} style={styles.iconPill}>
            <Ionicons name="locate" size={20} color={t.colors.text} />
          </GlassCard>
        </Pressable>
      </View>

      {/* Error banner (permission / services) */}
      {error ? (
        <Animated.View entering={FadeInDown} style={[styles.banner, { top: insets.top + 62 }]}>
          <GlassCard strong>
            <View style={styles.bannerRow}>
              <Ionicons name="warning" size={22} color={t.colors.warning} />
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
              <GlassButton
                label="Réglages"
                compact
                onPress={() => Linking.openSettings()}
              />
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
                <View style={{ flex: 1 }}>
                  <AppText variant="label" tone="muted">
                    Votre voiture
                  </AppText>
                  <AppText variant="display" style={{ marginTop: 2 }}>
                    {distance != null ? `À ${formatDistance(distance)}` : '—'}
                  </AppText>
                  <AppText variant="body" tone="secondary" style={{ marginTop: 2 }}>
                    Position enregistrée {timeAgo(current.savedAt)}
                  </AppText>
                </View>
                <View style={styles.accCol}>
                  <AccuracyBadge accuracy={current.accuracy} showValue compact />
                </View>
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  label="ENREGISTRER MA POSITION"
                  icon="🚗"
                  variant="car"
                  onPress={save}
                  loading={state.searching}
                  style={{ flex: 1 }}
                />
              </View>
              <GlassButton
                label="Me guider vers ma voiture"
                icon="🧭"
                onPress={() => router.push('/find')}
                style={{ marginTop: 10 }}
              />
            </>
          ) : (
            <>
              <AppText variant="title">Où est votre voiture ?</AppText>
              <AppText variant="body" tone="secondary" style={{ marginTop: 6, marginBottom: 18 }}>
                Garez-vous, puis appuyez pour mémoriser l'emplacement exact. Vous la retrouverez en un
                instant.
              </AppText>
              <PrimaryButton
                label="ENREGISTRER MA POSITION"
                icon="🚗"
                variant="car"
                onPress={save}
                loading={state.searching}
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
  brandPill: { paddingHorizontal: 16, height: 46, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  iconPill: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  banner: { position: 'absolute', left: 16, right: 16 },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  accCol: { alignItems: 'flex-end', maxWidth: 130 },
  actions: { flexDirection: 'row', marginTop: 18 },
});
