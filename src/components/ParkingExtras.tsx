import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PhotoViewer } from './PhotoViewer';
import { meterStatus } from '@/location/meter';
import type { ParkedLocation } from '@/types';

/**
 * Compact line under the distance: photo thumbnail, spot note and paid-parking
 * time left. Tapping opens the details sheet; tapping the photo enlarges it.
 * When nothing is filled in, a single discreet invitation instead.
 */
export function ParkingExtras({ car, now, onEdit }: { car: ParkedLocation; now: number; onEdit: () => void }) {
  const t = useTheme();
  const [viewer, setViewer] = useState(false);
  const meter = car.meter ? meterStatus(car.meter, now) : null;
  const meterColor =
    meter?.tone === 'expired' ? t.colors.danger : meter?.tone === 'soon' ? t.colors.warning : t.colors.textSecondary;

  if (!car.photoUri && !car.note && !meter) {
    return (
      <Pressable onPress={onEdit} style={styles.invite} hitSlop={6} accessibilityRole="button">
        <Icon name="camera" size={15} color={t.colors.primary} />
        <AppText variant="caption" weight="semibold" tone="accent" style={{ marginLeft: 6 }}>
          Ajouter une photo, un repère ou un ticket
        </AppText>
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        onPress={onEdit}
        style={[styles.box, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}
        accessibilityRole="button"
        accessibilityLabel="Détails du stationnement"
      >
        {car.photoUri ? (
          <Pressable onPress={() => setViewer(true)} hitSlop={4} accessibilityLabel="Agrandir la photo">
            <Image source={{ uri: car.photoUri }} style={styles.thumb} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, marginLeft: car.photoUri ? 10 : 2 }}>
          {car.note ? (
            <View style={styles.line}>
              <Icon name="floor" size={13} color={t.colors.primary} />
              <AppText variant="caption" weight="semibold" numberOfLines={1} style={{ marginLeft: 6, flex: 1 }}>
                {car.note}
              </AppText>
            </View>
          ) : null}
          {meter ? (
            <View style={[styles.line, car.note ? { marginTop: 3 } : null]}>
              <Icon name="clock" size={13} color={meterColor} />
              <AppText variant="caption" weight="semibold" color={meterColor} numberOfLines={1} style={{ marginLeft: 6, flex: 1 }}>
                {meter.text}
              </AppText>
            </View>
          ) : null}
          {!car.note && !meter ? (
            <AppText variant="caption" tone="secondary">
              Photo de la place
            </AppText>
          ) : null}
        </View>
        <Icon name="chevron" size={16} color={t.colors.textMuted} />
      </Pressable>
      <PhotoViewer uri={viewer ? car.photoUri ?? null : null} onClose={() => setViewer(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  invite: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 44, height: 44, borderRadius: 9 },
  line: { flexDirection: 'row', alignItems: 'center' },
});
