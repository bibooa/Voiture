import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useLocationStore } from '@/store/locationStore';
import type { WatchProfile } from '@/services/location';

/**
 * Keep the GPS running with the given profile only while the screen is
 * focused. Leaving the screen (or backgrounding the app) releases it.
 */
export function useLocationProfile(profile: WatchProfile) {
  const acquire = useLocationStore((s) => s.acquire);
  useFocusEffect(
    useCallback(() => {
      const release = acquire(profile);
      return release;
    }, [acquire, profile])
  );
}
