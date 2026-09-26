import { useCallback, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as Loc from '@/services/location';
import { reverseGeocode } from '@/services/location';
import { useCarStore } from '@/store/carStore';
import { useLocationStore } from '@/store/locationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { scheduleParkingReminder } from '@/services/notifications';
import { haptics } from '@/services/haptics';
import type { ParkedLocation } from '@/types';

export type SaveState = {
  searching: boolean;
  bestAccuracy: number | null;
  sampleCount: number;
  confirmation: ParkedLocation | null;
};

/**
 * Full "save my car" flow: permission/services checks with friendly errors,
 * multi-sample acquisition (with live progress), reverse geocoding, persistence
 * and optional reminder — ending in the confirmation animation state.
 */
export function useSaveCar() {
  const saveCar = useCarStore((s) => s.saveCar);
  const requestPermission = useLocationStore((s) => s.requestPermission);
  const refreshStatus = useLocationStore((s) => s.refreshStatus);
  const highAccuracy = useSettingsStore((s) => s.highAccuracy);
  const reminders = useSettingsStore((s) => s.parkingReminders);

  const [state, setState] = useState<SaveState>({
    searching: false,
    bestAccuracy: null,
    sampleCount: 0,
    confirmation: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, searching: false }));
  }, []);

  const dismissConfirmation = useCallback(() => {
    setState((s) => ({ ...s, confirmation: null }));
  }, []);

  const save = useCallback(async () => {
    await refreshStatus();
    const { permission, servicesEnabled } = useLocationStore.getState();

    if (!servicesEnabled) {
      haptics.error();
      Alert.alert(
        'Localisation désactivée',
        'Activez la localisation de votre téléphone pour enregistrer votre voiture.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        haptics.error();
        Alert.alert(
          'Permission refusée',
          'La localisation est nécessaire pour enregistrer votre voiture. Vous pouvez l\'autoriser dans les réglages.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState({ searching: true, bestAccuracy: null, sampleCount: 0, confirmation: null });

    let fix;
    try {
      fix = await Loc.acquireBestFix({
        highAccuracy,
        signal: controller.signal,
        onProgress: ({ best, count }) =>
          setState((s) => ({ ...s, bestAccuracy: best.accuracy ?? null, sampleCount: count })),
      });
    } catch {
      setState((s) => ({ ...s, searching: false }));
      haptics.error();
      Alert.alert(
        'GPS indisponible',
        'Impossible d\'obtenir une position fiable pour le moment. Réessayez dans un endroit plus dégagé.'
      );
      return;
    }

    if (controller.signal.aborted) {
      setState((s) => ({ ...s, searching: false }));
      return;
    }

    // Reverse geocode is best-effort and must never block the save.
    const address = await reverseGeocode(fix.latitude, fix.longitude);
    const record = saveCar(fix, address);

    setState({ searching: false, bestAccuracy: fix.accuracy, sampleCount: 0, confirmation: record });

    if (reminders) {
      scheduleParkingReminder(address).catch(() => {});
    }
  }, [highAccuracy, reminders, requestPermission, refreshStatus, saveCar]);

  return { state, save, cancel, dismissConfirmation };
}
