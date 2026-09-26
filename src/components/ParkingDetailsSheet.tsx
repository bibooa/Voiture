import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { GlassCard } from './GlassCard';
import { Icon, type IconName } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { PhotoViewer } from './PhotoViewer';
import { qualityColor } from './GpsBadge';
import { useCarStore } from '@/store/carStore';
import { gpsQuality, QUALITY_META } from '@/location/quality';
import { formatCarAccuracy } from '@/location/presentation';
import { METER_PRESETS, formatMinutes, meterStatus } from '@/location/meter';
import { takePhoto, pickPhoto, type PhotoResult } from '@/services/photos';
import { startMeter, stopMeter } from '@/services/parkingMeter';
import { haptics } from '@/services/haptics';
import { useNow } from '@/hooks/useNow';

type Props = {
  /** Car to edit; the sheet reads it live from the store. */
  carId: string | null;
  /** "saved" right after saving (success header), "edit" when reopened. */
  mode: 'saved' | 'edit';
  onClose: () => void;
};

/** One-tap fragments for the spot note; they append to what is typed. */
const NOTE_CHIPS = ['Niveau -1', 'Niveau -2', 'Rez-de-chaussée', 'Zone ', 'Place n° ', 'Pilier '];

/**
 * Everything about a parked car in one sheet: photo of the spot, text marker
 * (level, zone, spot) and the paid-parking timer with its reminder. All local.
 */
export function ParkingDetailsSheet({ carId, mode, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const car = useCarStore((s) => s.history.find((h) => h.id === carId) ?? null);
  const setNote = useCarStore((s) => s.setNote);
  const setPhoto = useCarStore((s) => s.setPhoto);
  const now = useNow(15_000);

  const [note, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(false);

  useEffect(() => {
    if (car) setNoteText(car.note ?? '');
    // Only when another car is opened, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  if (!car) return null;

  const close = () => {
    if ((car.note ?? '') !== note.trim()) setNote(car.id, note.trim());
    onClose();
  };

  const onPhoto = async (fn: (id: string) => Promise<PhotoResult>) => {
    setBusy(true);
    const res = await fn(car.id);
    setBusy(false);
    if (res.ok) {
      setPhoto(car.id, res.uri);
      haptics.success();
    } else if (res.reason === 'denied') {
      Alert.alert('Appareil photo refusé', 'Autorisez l’appareil photo dans les réglages du téléphone.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réglages', onPress: () => Linking.openSettings() },
      ]);
    } else if (res.reason === 'error') {
      Alert.alert('Photo impossible', 'La photo n’a pas pu être enregistrée. Réessayez.');
    }
  };

  const onMeter = async (min: number | null) => {
    haptics.selection();
    if (min == null) return stopMeter(car.id);
    const reminded = await startMeter(car.id, min);
    if (!reminded) {
      Alert.alert(
        'Minuteur lancé sans rappel',
        'Les notifications sont désactivées : le temps restant s’affichera dans l’appli, mais sans alerte.'
      );
    }
  };

  const addChip = (chip: string) => {
    haptics.selection();
    setNoteText((cur) => {
      const base = cur.trim();
      return base ? `${base}, ${chip}` : chip;
    });
  };

  const q = gpsQuality(car.accuracy);
  const meter = car.meter ? meterStatus(car.meter, now) : null;
  const meterColor =
    meter?.tone === 'expired' ? t.colors.danger : meter?.tone === 'soon' ? t.colors.warning : t.colors.car;

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: t.colors.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110, paddingHorizontal: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.head}>
              {mode === 'saved' ? (
                <View style={[styles.check, { backgroundColor: t.colors.car }]}>
                  <Icon name="checkmark" size={22} color="#fff" />
                </View>
              ) : null}
              <View style={{ flex: 1, marginLeft: mode === 'saved' ? 12 : 0 }}>
                <AppText variant="headline" weight="bold">
                  {mode === 'saved' ? 'Voiture enregistrée' : 'Détails du stationnement'}
                </AppText>
                <AppText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                  Précision{' '}
                  <AppText variant="caption" weight="bold" color={qualityColor(t, q)}>
                    {formatCarAccuracy(car)}
                  </AppText>
                  {car.adjusted ? '' : ` · ${QUALITY_META[q].short.toLowerCase()}`}
                  {car.sampleCount ? ` · ${car.sampleCount} mesures` : ''}
                  {car.address ? ` · ${car.address}` : ''}
                </AppText>
              </View>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Fermer" style={styles.x}>
                <Icon name="close" size={22} color={t.colors.textSecondary} />
              </Pressable>
            </View>

            {/* Photo */}
            <Section icon="camera" title="Photo de la place" hint="Pilier, numéro, panneau : ce qui vous aidera à la retrouver.">
              {car.photoUri ? (
                <>
                  <Pressable onPress={() => setViewer(true)} accessibilityLabel="Agrandir la photo">
                    <Image source={{ uri: car.photoUri }} style={styles.photo} resizeMode="cover" />
                  </Pressable>
                  <View style={styles.btnRow}>
                    <SmallButton icon="camera" label="Reprendre" onPress={() => onPhoto(takePhoto)} disabled={busy} />
                    <SmallButton icon="trash" label="Supprimer" onPress={() => setPhoto(car.id, null)} disabled={busy} />
                  </View>
                </>
              ) : (
                <View style={styles.btnRow}>
                  <SmallButton icon="camera" label="Prendre une photo" onPress={() => onPhoto(takePhoto)} disabled={busy} primary />
                  <SmallButton icon="image" label="Galerie" onPress={() => onPhoto(pickPhoto)} disabled={busy} />
                </View>
              )}
            </Section>

            {/* Note */}
            <Section icon="floor" title="Repère" hint="Étage, zone, numéro de place…">
              <TextInput
                value={note}
                onChangeText={setNoteText}
                placeholder="Ex. Niveau -2, zone B, place 114"
                placeholderTextColor={t.colors.textMuted}
                style={[styles.input, { color: t.colors.text, backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}
                returnKeyType="done"
                maxLength={120}
              />
              <View style={styles.chips}>
                {NOTE_CHIPS.map((c) => (
                  <Chip key={c} label={c.trim()} onPress={() => addChip(c)} />
                ))}
              </View>
            </Section>

            {/* Paid parking */}
            <Section icon="ticket" title="Stationnement payant" hint="Rappel 10 minutes avant la fin du ticket.">
              {meter ? (
                <View style={[styles.meter, { borderColor: meterColor + '66', backgroundColor: meterColor + '14' }]}>
                  <Icon name="clock" size={16} color={meterColor} />
                  <AppText variant="callout" weight="semibold" color={meterColor} style={{ marginLeft: 8, flex: 1 }}>
                    {meter.text}
                  </AppText>
                </View>
              ) : null}
              <View style={styles.chips}>
                <Chip label="Aucun" active={!car.meter} onPress={() => onMeter(null)} />
                {METER_PRESETS.map((m) => (
                  <Chip key={m} label={formatMinutes(m)} active={car.meter?.durationMin === m} onPress={() => onMeter(m)} />
                ))}
              </View>
            </Section>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14, backgroundColor: t.colors.background }]}>
          <PrimaryButton label="Terminé" icon="checkmark" onPress={close} />
        </View>
      </View>

      <PhotoViewer uri={viewer ? car.photoUri ?? null : null} onClose={() => setViewer(false)} />
    </Modal>
  );
}

function Section({ icon, title, hint, children }: { icon: IconName; title: string; hint: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <GlassCard compact style={{ marginTop: 14 }}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={17} color={t.colors.primary} />
        <AppText variant="callout" weight="bold" style={{ marginLeft: 8 }}>
          {title}
        </AppText>
      </View>
      <AppText variant="caption" tone="secondary" style={{ marginTop: 2, marginBottom: 10 }}>
        {hint}
      </AppText>
      {children}
    </GlassCard>
  );
}

function Chip({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        styles.chip,
        { borderColor: active ? t.colors.primary : t.colors.glassBorder, backgroundColor: active ? t.colors.primary + '26' : t.colors.glass },
      ]}
    >
      <AppText variant="caption" weight="semibold" color={active ? t.colors.primary : t.colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SmallButton({
  icon,
  label,
  onPress,
  disabled,
  primary,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.smallBtn,
        {
          opacity: disabled ? 0.5 : 1,
          backgroundColor: primary ? t.colors.primary : t.colors.glass,
          borderColor: primary ? t.colors.primary : t.colors.glassBorder,
        },
      ]}
    >
      <Icon name={icon} size={17} color={primary ? '#fff' : t.colors.text} />
      <AppText variant="callout" weight="semibold" color={primary ? '#fff' : t.colors.text} style={{ marginLeft: 7 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center' },
  check: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  x: { padding: 4, marginLeft: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { height: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 0, paddingTop: 10 },
});
