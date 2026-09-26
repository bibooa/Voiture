import { create } from 'zustand';
import type { Coordinate } from '@/types';
import * as Loc from '@/services/location';

/**
 * Shared live-location state. A single watch subscription feeds every screen,
 * so we don't spin up multiple GPS listeners (battery-friendly). Screens call
 * `startWatching` on focus and `stopWatching` on blur via a ref-count.
 */

export type LocationError =
  | 'permission-denied'
  | 'services-disabled'
  | 'unavailable'
  | null;

type LocationState = {
  permission: Loc.PermissionResult;
  servicesEnabled: boolean;
  fix: Coordinate | null;
  heading: number | null;
  error: LocationError;
  watchers: number;

  refreshStatus: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  startWatching: (highAccuracy?: boolean) => Promise<void>;
  stopWatching: () => void;
};

let posSub: Loc.LocationSubscription | null = null;
let headSub: Loc.LocationSubscription | null = null;

export const useLocationStore = create<LocationState>((set, get) => ({
  permission: 'undetermined',
  servicesEnabled: true,
  fix: null,
  heading: null,
  error: null,
  watchers: 0,

  refreshStatus: async () => {
    const [permission, servicesEnabled] = await Promise.all([
      Loc.getPermissionStatus(),
      Loc.isLocationEnabled(),
    ]);
    let error: LocationError = null;
    if (permission === 'denied') error = 'permission-denied';
    else if (!servicesEnabled) error = 'services-disabled';
    set({ permission, servicesEnabled, error });
  },

  requestPermission: async () => {
    const permission = await Loc.requestPermission();
    set({ permission });
    await get().refreshStatus();
    return permission === 'granted';
  },

  startWatching: async (highAccuracy = true) => {
    set({ watchers: get().watchers + 1 });
    await get().refreshStatus();

    if (get().permission !== 'granted') return;
    if (posSub) return; // already watching

    try {
      // Seed with a quick fix so the map has something immediately.
      const quick = await Loc.getQuickPosition(highAccuracy);
      set({ fix: quick, error: null });
    } catch {
      /* watch will provide fixes shortly */
    }

    try {
      posSub = await Loc.watchPosition((fix) => set({ fix, error: null }), highAccuracy);
      headSub = await Loc.watchHeading((heading) => set({ heading }));
    } catch {
      set({ error: 'unavailable' });
    }
  },

  stopWatching: () => {
    const next = Math.max(0, get().watchers - 1);
    set({ watchers: next });
    if (next === 0) {
      posSub?.remove();
      headSub?.remove();
      posSub = null;
      headSub = null;
    }
  },
}));
