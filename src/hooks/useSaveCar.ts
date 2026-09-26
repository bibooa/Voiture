import { useCallback, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import {
  acquireStabilizedFix,
  reverseGeocode,
  LocationUnavailableError,
  type StabilizationProgress,
  type StabilizationResult,
} from '@/services/location';
import { needsUserConfirmation } from '@/location/stabilizer';
import { useCarStore } from '@/store/carStore';
import { useLocationStore } from '@/store/locationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { scheduleParkingReminder } from '@/services/notifications';
import { haptics } from '@/services/haptics';
import type { ParkedLocation } from '@/types';

/**
 * "Save my car" flow.
 *
 *   idle → acquiring ──(stable & precise enough)──→ saved
 *                    └─(imprecise / moving)──→ review ─┬─ retry → acquiring
 *                                                       ├─ save anyway → saved
 *                                                       └─ cancel → idle
 *
 * Saving is instant and works offline; the address is resolved afterwards.
 */

export type SavePhase = 'idle' | 'acquiring' | 'review' | 'saved';

export function useSaveCar() {
  const saveCar = useCarStore((s) => s.saveCar);
  const setAddress = useCarStore((s) => s.setAddress);
  const requestPermission = useLocationStore((s) => s.requestPermission);
  const refreshStatus = useLocationStore((s) => s.refreshStatus);

  const [phase, setPhase] = useState<SavePhase>('idle');
  const [progress, setProgress] = useState<StabilizationProgress | null>(null);
  const [result, setResult] = useState<StabilizationResult | null>(null);
  const [saved, setSaved] = useState<ParkedLocation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const commit = useCallback(
    (r: StabilizationResult, forced: boolean) => {
      const record = saveCar({
        latitude: r.fix.latitude,
        longitude: r.fix.longitude,
        accuracy: r.fix.accuracy,
        sampleCount: r.fix.used,
        forced,
      });
      haptics.success();
      setSaved(record);
      setPhase('saved');

      reverseGeocode(record.latitude, record.longitude).then((addr) => {
        setAddress(record.id, addr);
        setSaved((s) => (s && s.id === record.id ? { ...s, address: addr } : s));
      });
      if (useSettingsStore.getState().parkingReminders) {
        scheduleParkingReminder(null).catch(() => {});
      }
    },
    [saveCar, setAddress]
  );

  const acquire = useCallback(async () => {
    const { highAccuracy, stabilization } = useSettingsStore.getState();
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(null);
    setResult(null);
    setPhase('acquiring');

    try {
      const r = await acquireStabilizedFix({
        mode: stabilization,
        highAccuracy,
        signal: controller.signal,
        onProgress: (p) => {
          if (!controller.signal.aborted) setProgress(p);
        },
      });
      if (controller.signal.aborted) return;
      if (needsUserConfirmation(r.fix, r.stable)) {
        haptics.warning();
        setResult(r);
        setPhase('review');
      } else {
        commit(r, false);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setPhase('idle');
      haptics.error();
      Alert.alert(
        'GPS indisponible',
        e instanceof LocationUnavailableError
          ? "Impossible d'obtenir une position fiable pour le moment. Rapprochez-vous d'un espace dégagé puis réessayez."
          : "La localisation n'a pas pu démarrer. Réessayez dans un instant."
      );
    }
  }, [commit]);

  const start = useCallback(async () => {
    await refreshStatus();
    const { permission, servicesEnabled } = useLocationStore.getState();

    if (!servicesEnabled) {
      haptics.error();
      Alert.alert('Localisation désactivée', 'Activez la localisation de votre téléphone pour enregistrer votre voiture.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    if (permission !== 'granted' && !(await requestPermission())) {
      haptics.error();
      Alert.alert(
        'Permission refusée',
        "La localisation est nécessaire pour enregistrer votre voiture. Vous pouvez l'autoriser dans les réglages.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    acquire();
  }, [acquire, refreshStatus, requestPermission]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase('idle');
    setProgress(null);
    setResult(null);
  }, []);

  const saveAnyway = useCallback(() => {
    if (result) commit(result, true);
  }, [result, commit]);

  const dismiss = useCallback(() => {
    setPhase('idle');
    setSaved(null);
  }, []);

  return { phase, progress, result, saved, start, cancel, retry: acquire, saveAnyway, dismiss };
}
