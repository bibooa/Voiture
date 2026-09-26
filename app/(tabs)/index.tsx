import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import {
  AmbientBackground,
  AppText,
  Icon,
  GlassCard,
  PrimaryButton,
  GlassButton,
  SaveConfirmation,
  GpsSearchingOverlay,
  PromptModal,
  Pulse,
} from '@/components';
import { useTheme } from '@/theme';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useSaveCar } from '@/hooks/useSaveCar';
import { useCarStore } from '@/store/carStore';
import { distanceMeters, formatDistance, formatWalkTime, formatAccuracy } from '@/utils/geo';
import { accuracyLevel } from '@/utils/accuracy';
import { timeAgo } from '@/utils/time';

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { fix, error } = useLiveLocation();
  const current = useCarStore((s) => s.current);
  const setNote = useCarStore((s) => s.setNote);
  const { state, save, cancel, dismissConfirmation } = useSaveCar();

  const [noteOpen, setNoteOpen] = useState(false);

  const distance = useMemo(() => {
    if (!fix || !current) return null;
    return distanceMeters(
      { latitude: fix.latitude, longitude: fix.longitude },
      { latitude: current.latitude, longitude: current.longitude }
    );
  }, [fix, current]);

  return (
    <AmbientBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={[styles.brandDot, { backgroundColor: t.colors.primary }]}>
              <Icon name="car" size={18} color="#fff" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <AppText variant="title" weight="bold">
                Garée
              </AppText>
              <AppText variant="caption" tone="secondary">
                Votre voiture, retrouvée.
              </AppText>
            </View>
          </View>
          <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Réglages" hitSlop={10}>
            <View style={[styles.iconBtn, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
              <Icon name="settings" size={20} color={t.colors.text} />
            </View>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130, flexGrow: 1 }}
        >
          {/* Hero visual */}
          <View style={styles.hero}>
            {current ? <Pulse color={t.colors.car} size={190} rings={2} /> : null}
            <Animated.View
              entering={FadeIn.duration(400)}
              style={[
                styles.heroBadge,
                {
                  borderColor: t.colors.glassBorder,
                  backgroundColor: t.colors.glassStrong,
                  shadowColor: current ? t.colors.car : t.colors.primary,
                },
              ]}
            >
              <Icon name={current ? 'car' : 'pin'} size={62} color={current ? t.colors.car : t.colors.primary} />
            </Animated.View>
          </View>

          {/* Error banner */}
          {error ? (
            <Animated.View entering={FadeInDown} style={{ marginBottom: 14 }}>
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

          {/* Main card */}
          <Animated.View entering={FadeInDown.duration(400)}>
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

                  <View style={[styles.stats, { borderColor: t.colors.glassBorder }]}>
                    <Stat icon="navigate" value={distance != null ? formatDistance(distance) : '—'} label="Distance" />
                    <View style={[styles.divider, { backgroundColor: t.colors.glassBorder }]} />
                    <Stat icon="walk" value={distance != null ? formatWalkTime(distance) : '—'} label="À pied" />
                    <View style={[styles.divider, { backgroundColor: t.colors.glassBorder }]} />
                    <StatAccuracy accuracy={current.accuracy} />
                  </View>

                  <PrimaryButton
                    label="Me guider vers ma voiture"
                    icon="navigate"
                    onPress={() => router.push('/find')}
                    style={{ marginTop: 16 }}
                  />
                  <View style={styles.secondaryRow}>
                    <GlassButton label="Réenregistrer" icon="pin" onPress={save} compact style={{ flex: 1 }} />
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
                  <AppText variant="title" center>
                    Où est votre voiture ?
                  </AppText>
                  <AppText variant="body" tone="secondary" center style={{ marginTop: 8, marginBottom: 20 }}>
                    Garez-vous, appuyez sur le bouton, et retrouvez-la en un instant.
                  </AppText>
                  <PrimaryButton
                    label="ENREGISTRER MA POSITION"
                    icon="car"
                    variant="car"
                    onPress={save}
                    loading={state.searching}
                  />
                </>
              )}
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </View>

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
        onDone={dismissConfirmation}
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
    </AmbientBackground>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  hero: { height: 210, alignItems: 'center', justifyContent: 'center' },
  heroBadge: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
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
  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
