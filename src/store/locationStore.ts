import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';
import type { LiveFix } from '@/types';
import * as Loc from '@/services/location';
import { smoothHeading } from '@/location/heading';
import { stepFilter, scatterOf, type FilterState, type RawFix } from '@/location/liveFilter';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Live location — the SINGLE source of truth for "where is the user".
 *
 * Every screen reads the same `fix` / `heading`, so distance, accuracy and
 * direction are always computed from identical data.
 *
 * Battery: screens *request* a profile while focused (`acquire('map')` or
 * `acquire('guidance')`) and release it on blur. The store runs exactly one
 * subscription matching the most demanding active request:
 *   - guidance: best accuracy, 1 s updates + compass
 *   - map:      high accuracy, ~4 s / 3 m updates, no compass
 *   - none:     GPS off
 * Everything is paused while the app is in the background.
 */

export type LocationError = 'permission-denied' | 'services-disabled' | 'unavailable' | null;
export type HeadingState = { value: number; accuracy: number | null; timestamp: number };
type Profile = Loc.WatchProfile;

type LocationState = {
  permission: Loc.PermissionResult;
  servicesEnabled: boolean;
  fix: LiveFix | null;
  heading: HeadingState | null;
  error: LocationError;
  /** Which subscription is currently running (null = GPS off). */
  active: Profile | null;

  refreshStatus: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  /** Request a profile; returns a release function. */
  acquire: (profile: Profile) => () => void;
};

const counts: Record<Profile, number> = { map: 0, guidance: 0 };
let posSub: Loc.LocationSubscription | null = null;
let headSub: Loc.LocationSubscription | null = null;
let appActive = AppState.currentState === 'active';
let applying: Promise<void> = Promise.resolve();
let lastHeadingEmit = 0;
let filter: FilterState | null = null;

/** Filtered, stable position published to the UI (null = keep previous). */
function ingest(raw: RawFix): LiveFix | null {
  // After a long gap the old estimate is meaningless: start over.
  if (filter && raw.timestamp - filter.timestamp > 30_000) filter = null;
  const { state, accepted } = stepFilter(filter, raw);
  filter = state;
  if (!accepted) return null; // outlier: keep the last reliable position
  return {
    latitude: state.latitude,
    longitude: state.longitude,
    accuracy: state.accuracy, // the OS value, never a filtered one
    altitude: state.altitude,
    speed: state.speed,
    timestamp: state.timestamp,
    scatter: scatterOf(state),
  };
}

function desiredProfile(): Profile | null {
  if (!appActive) return null;
  if (counts.guidance > 0) return 'guidance';
  if (counts.map > 0) return 'map';
  return null;
}

function stopAll() {
  posSub?.remove();
  headSub?.remove();
  posSub = null;
  headSub = null;
}

export const useLocationStore = create<LocationState>((set, get) => {
  /** Reconcile the running subscription with the desired profile. Serialised. */
  const apply = (force = false) => {
    applying = applying.then(async () => {
      try {
        await reconcile(force);
      } catch {
        stopAll();
        set({ error: 'unavailable', active: null });
      }
    });
  };

  const reconcile = async (force: boolean) => {
    const want = desiredProfile();
    const { active } = get();
    if (!force && want === active) return;

    stopAll();
    set({ active: null });
    if (!want) return;

    await get().refreshStatus();
    if (get().permission !== 'granted' || !get().servicesEnabled) return;

    const highAccuracy = useSettingsStore.getState().highAccuracy;

    // Instant paint from a *recent* cached fix only (≤ 15 s old), e.g. when
    // coming back to the app after a while.
    const current = get().fix;
    if (!current || Date.now() - current.timestamp > 15000) {
      const recent = await Loc.getRecentFix();
      const seeded = recent ? ingest(recent) : null;
      if (seeded) set({ fix: seeded });
    }

    try {
      posSub = await Loc.watchPosition(want, highAccuracy, (raw) => {
        const fix = ingest(raw);
        if (fix) set({ fix, error: null });
      });
      if (want === 'guidance') {
        headSub = await Loc.watchHeading((value, accuracy) => {
          const now = Date.now();
          if (now - lastHeadingEmit < 80) return; // ~12 Hz is plenty
          lastHeadingEmit = now;
          const prev = get().heading;
          set({
            heading: {
              value: smoothHeading(prev?.value ?? null, value, 0.3),
              accuracy,
              timestamp: now,
            },
          });
        });
      } else {
        set({ heading: null });
      }
      set({ active: want });
    } catch {
      stopAll();
      set({ error: 'unavailable', active: null });
    }
  };

  AppState.addEventListener('change', (s: AppStateStatus) => {
    const nowActive = s === 'active';
    if (nowActive === appActive) return;
    appActive = nowActive;
    apply();
  });

  // Re-subscribe when the accuracy preference changes.
  useSettingsStore.subscribe((s, prev) => {
    if (s.highAccuracy !== prev.highAccuracy && get().active) apply(true);
  });

  return {
    permission: 'undetermined',
    servicesEnabled: true,
    fix: null,
    heading: null,
    error: null,
    active: null,

    refreshStatus: async () => {
      const [permission, servicesEnabled] = await Promise.all([
        Loc.getPermissionStatus(),
        Loc.isLocationEnabled(),
      ]);
      let error: LocationError = get().error === 'unavailable' ? 'unavailable' : null;
      if (permission === 'denied') error = 'permission-denied';
      else if (!servicesEnabled) error = 'services-disabled';
      set({ permission, servicesEnabled, error });
    },

    requestPermission: async () => {
      const permission = await Loc.requestPermission();
      set({ permission });
      await get().refreshStatus();
      if (permission === 'granted') apply(true);
      return permission === 'granted';
    },

    acquire: (profile) => {
      counts[profile] += 1;
      apply();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        counts[profile] = Math.max(0, counts[profile] - 1);
        apply();
      };
    },
  };
});
