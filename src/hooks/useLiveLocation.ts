import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useLocationStore } from '@/store/locationStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Starts the shared location watch while a screen is focused and releases it on
 * blur (ref-counted in the store). Returns the live location slice for the UI.
 */
export function useLiveLocation() {
  const highAccuracy = useSettingsStore((s) => s.highAccuracy);
  const start = useLocationStore((s) => s.startWatching);
  const stop = useLocationStore((s) => s.stopWatching);

  useFocusEffect(
    useCallback(() => {
      start(highAccuracy);
      return () => stop();
    }, [start, stop, highAccuracy])
  );

  const fix = useLocationStore((s) => s.fix);
  const heading = useLocationStore((s) => s.heading);
  const error = useLocationStore((s) => s.error);
  const permission = useLocationStore((s) => s.permission);
  const servicesEnabled = useLocationStore((s) => s.servicesEnabled);

  return { fix, heading, error, permission, servicesEnabled };
}
