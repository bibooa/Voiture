import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import {
  GuidanceScene,
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
import { useSettingsStore } from '@/store/settingsStore';
import { distanceMeters, formatDistance, formatWalkTime, formatAccuracy } from '@/utils/geo';
import { accuracyLevel } from '@/utils/accuracy';
import { timeAgo } from '@/utils/time';
import { APP_NAME } from '@/constants';

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { fix, error } = useLiveLocation();
  const current = useCarStore((s) => s.current);
  const setNote = useCarStore((s) => s.setNote);
  const reminders = useSettingsStore((s) => s.parkingReminders);
  const { state, save, cancel, dismissConfirmation } = useSaveCar();

  const [noteOpen, setNoteOpen] = useState(false);

  const distance = useMemo(() => {
    if (!fix || !current) return null;
    return distanceMeters(
      { latitude: fix.latitude, longitude: fix.longitude },
      { latitude: current.latitude, longitude: current.longitude }
    );
  }, [fix, current]);

  const acc = fix?.accuracy ?? null;
  const level = accuracyLevel(acc);
  const accColor =
    level === 'excellent' ? t.colors.success : level === 'good' ? t.colors.warning : level === 'poor' ? t.colors.danger : t.colors.textMuted;

  return (
    <View style={styles.root}>
      {/* Animated 3D scene as the living background */}
      <GuidanceScene variant="dot" distanceLabel={current && distance != null ? formatDistance(distance) : undefined} />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <LinearGradient colors={t.colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brandIcon}>
              <Icon name="pin" size={22} color="#fff" />
            </LinearGradient>
            <View style={{ marginLeft: 12 }}>
              <AppText variant="title" weight="bold">
                {APP_NAME}
              </AppText>
              <AppText variant="caption" tone="secondary">
                Votre voiture, toujours à portée.
              </AppText>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Notifications" hitSlop={8}>
              <View style={[styles.circleBtn, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
                <Icon name="bell" size={19} color={t.colors.text} />
                {reminders ? <View style={[styles.dot, { backgroundColor: t.colors.danger }]} /> : null}
              </View>
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Réglages" hitSlop={8}>
              <View style={[styles.circleBtn, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
                <Icon name="settings" size={19} color={t.colors.text} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Precision pill + compass overlay */}
        <View style={styles.overlayRow} pointerEvents="box-none">
          <GlassCard padded={false} radius={t.radius.lg} style={styles.precisionPill}>
            <View style={styles.precisionRow}>
              <View style={[styles.accDot, { backgroundColor: accColor, shadowColor: accColor }]} />
              <View style={{ marginLeft: 10 }}>
                <AppText variant="label" tone="muted" style={{ fontSize: 9 }}>
                  PRÉCISION GPS
                </AppText>
                <AppText variant="callout" weight="bold" color={accColor}>
                  {formatAccuracy(acc).replace('précision inconnue', '—')}
                </AppText>
              </View>
            </View>
          </GlassCard>

          <GlassCard padded={false} radius={t.radius.pill} style={styles.compass}>
            <Icon name="navigate" size={16} color={t.colors.danger} style={{ transform: [{ rotate: '-45deg' }] }} />
            <AppText variant="label" style={{ fontSize: 9, marginTop: 1 }}>
              N
            </AppText>
          </GlassCard>
        </View>

        <View style={{ flex: 1 }} />

        {/* Bottom content */}
        <Animated.View entering={FadeInDown.duration(450)} style={[styles.bottom, { paddingBottom: insets.bottom + 92 }]}>
          {error ? (
            <GlassCard strong style={{ marginBottom: 12 }}>
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
          ) : null}

          <GlassCard strong>
            {current ? (
              <>
                <Pressable onPress={() => router.push('/find')} style={styles.cardHeader}>
                  <LinearGradient
                    colors={[t.colors.primary + '33', t.colors.primary + '11']}
                    style={[styles.carTile, { borderColor: t.colors.primary + '66' }]}
                  >
                    <Icon name="car" size={26} color={t.colors.text} />
                  </LinearGradient>
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
                  <Icon name="chevron" size={20} color={t.colors.textMuted} />
                </Pressable>

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
                  <Stat icon="navigate" value={distance != null ? formatDistance(distance) : '—'} label="DISTANCE" />
                  <View style={[styles.divider, { backgroundColor: t.colors.glassBorder }]} />
                  <Stat icon="walk" value={distance != null ? formatWalkTime(distance) : '—'} label="À PIED" />
                  <View style={[styles.divider, { backgroundColor: t.colors.glassBorder }]} />
                  <StatAccuracy accuracy={current.accuracy} />
                </View>

                <PrimaryButton label="Retrouver ma voiture" icon="car" onPress={() => router.push('/find')} style={{ marginTop: 16 }} />
                <GlassButton label="Enregistrer ma position" icon="pin" onPress={save} style={{ marginTop: 10 }} />
                {!current.note ? (
                  <Pressable onPress={() => setNoteOpen(true)} style={styles.addNote} hitSlop={6}>
                    <Icon name="floor" size={14} color={t.colors.textMuted} />
                    <AppText variant="caption" tone="muted" style={{ marginLeft: 6 }}>
                      Ajouter un repère (étage, place…)
                    </AppText>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.cardHeader}>
                  <View style={[styles.carTile, { borderColor: t.colors.glassBorder, backgroundColor: t.colors.glass }]}>
                    <Icon name="pin" size={24} color={t.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <AppText variant="headline" weight="bold">
                      Aucune voiture enregistrée
                    </AppText>
                    <AppText variant="caption" tone="secondary" style={{ marginTop: 3 }}>
                      Garez-vous puis enregistrez sa position.
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
      </View>

      <GpsSearchingOverlay visible={state.searching} bestAccuracy={state.bestAccuracy} sampleCount={state.sampleCount} onCancel={cancel} />
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
    level === 'excellent' ? t.colors.success : level === 'good' ? t.colors.warning : level === 'poor' ? t.colors.danger : t.colors.textMuted;
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
        PRÉCISION
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  brandIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 10 },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#0b1020' },
  overlayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  precisionPill: { paddingHorizontal: 14, paddingVertical: 10 },
  precisionRow: { flexDirection: 'row', alignItems: 'center' },
  accDot: { width: 10, height: 10, borderRadius: 5, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  compass: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 16 },
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
  addNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
