import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type { RawFix } from '@/location/liveFilter';
import {
  fuseSamples,
  stopReason,
  usableSamples,
  STABILIZATION_PROFILES,
  type FusedFix,
  type Sample,
  type StabilizationMode,
  type StopReason,
} from '@/location/stabilizer';

/**
 * Location service — the only module that talks to expo-location.
 *
 *  - permissions (foreground only; no background tracking, ever)
 *  - stabilised acquisition for saving the car (many samples + fusion)
 *  - live position / heading subscriptions with battery-aware profiles
 *  - best-effort reverse geocoding with a timeout (works offline: just null)
 *
 * Honesty principle: accuracies come from the OS; the stabiliser only ever
 * widens them (see location/stabilizer.ts).
 */

export type PermissionResult = 'granted' | 'denied' | 'undetermined';

export class LocationUnavailableError extends Error {
  constructor() {
    super('No usable GPS fix could be obtained');
    this.name = 'LocationUnavailableError';
  }
}

function toSample(loc: Location.LocationObject): Sample {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? NaN,
    altitude: loc.coords.altitude ?? null,
    heading: loc.coords.heading ?? null,
    speed: loc.coords.speed ?? null,
    timestamp: Math.min(loc.timestamp, Date.now()),
  };
}

/** A raw OS fix (before the live filter). */
export function toRawFix(loc: Location.LocationObject): RawFix {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    altitude: loc.coords.altitude ?? null,
    speed: loc.coords.speed != null && loc.coords.speed >= 0 ? loc.coords.speed : null,
    timestamp: Math.min(loc.timestamp, Date.now()),
  };
}

// ── permissions & device state ──────────────────────────────────────────────

export async function getPermissionStatus(): Promise<PermissionResult> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status as PermissionResult;
}

export async function requestPermission(): Promise<PermissionResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status as PermissionResult;
}

export async function isLocationEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/**
 * On Android, ask the system to enable "Google Location Accuracy" (Wi-Fi and
 * cell assistance), which markedly improves fixes near buildings. The user may
 * decline; we carry on with whatever is available.
 */
async function ensureBestProviders(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Location.enableNetworkProviderAsync();
  } catch {
    /* declined or unavailable — continue with GPS only */
  }
}

// ── stabilised acquisition ─────────────────────────────────────────────────

export type StabilizationProgress = {
  usable: number;
  target: number;
  elapsedMs: number;
  maxDurationMs: number;
  /** Current fused estimate (honest accuracy), null until a usable sample. */
  estimate: FusedFix | null;
  /** Latest raw accuracy reported by the OS. */
  lastAccuracy: number | null;
};

export type StabilizationResult = {
  fix: FusedFix;
  stable: boolean;
  reason: StopReason;
  samples: Sample[];
};

export type AcquireOptions = {
  mode: StabilizationMode;
  highAccuracy: boolean;
  onProgress?: (p: StabilizationProgress) => void;
  signal?: AbortSignal;
};

/**
 * Collect GPS samples until the position is stable (or the profile's sample /
 * time budget is exhausted), then fuse them. Cached readings older than the
 * start of the acquisition are ignored so a stale "last known" position can
 * never become the car's location.
 */
export async function acquireStabilizedFix(opts: AcquireOptions): Promise<StabilizationResult> {
  const profile = STABILIZATION_PROFILES[opts.mode];
  if (opts.highAccuracy) await ensureBestProviders();

  const start = Date.now();
  const samples: Sample[] = [];
  let lastAccuracy: number | null = null;

  const emit = () => {
    opts.onProgress?.({
      usable: usableSamples(samples).length,
      target: profile.maxSamples,
      elapsedMs: Date.now() - start,
      maxDurationMs: profile.maxDurationMs,
      estimate: fuseSamples(samples),
      lastAccuracy,
    });
  };

  const sub = await Location.watchPositionAsync(
    {
      accuracy: opts.highAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
      timeInterval: 1000,
      distanceInterval: 0,
      mayShowUserSettingsDialog: true,
    },
    (loc) => {
      // Skip cached fixes produced before we started asking.
      if (loc.timestamp < start - 1000) return;
      const s = toSample(loc);
      lastAccuracy = isFinite(s.accuracy) ? s.accuracy : null;
      samples.push(s);
      emit();
    }
  );

  let reason: StopReason = null;
  try {
    reason = await new Promise<StopReason>((resolve) => {
      const tick = setInterval(() => {
        if (opts.signal?.aborted) {
          clearInterval(tick);
          resolve(null);
          return;
        }
        const r = stopReason(samples, profile, Date.now() - start);
        if (r) {
          clearInterval(tick);
          resolve(r);
        } else {
          emit(); // keeps elapsed time moving even without new samples
        }
      }, 300);
    });
  } finally {
    sub.remove();
  }

  const fix = fuseSamples(samples);
  if (!fix) throw new LocationUnavailableError();
  return { fix, stable: reason === 'stable', reason, samples };
}

// ── live subscriptions ─────────────────────────────────────────────────────

export type LocationSubscription = { remove: () => void };

/** Battery profiles for the live position. */
export type WatchProfile = 'map' | 'guidance';

/** Nominal seconds between fixes per profile (drives "stale" thresholds). */
export const PROFILE_INTERVAL_S: Record<WatchProfile, number> = { guidance: 1, map: 4 };

export async function watchPosition(
  profile: WatchProfile,
  highAccuracy: boolean,
  cb: (fix: RawFix) => void
): Promise<LocationSubscription> {
  const options: Location.LocationOptions =
    profile === 'guidance'
      ? {
          accuracy: highAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 0,
        }
      : {
          accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: 4000,
          // 0 so a stationary user still gets periodic fixes (otherwise the
          // position would look "stale" while standing still).
          distanceInterval: 0,
        };
  return Location.watchPositionAsync(options, (loc) => cb(toRawFix(loc)));
}

/** A recent last-known fix (≤ maxAgeMs) for an instant first paint, or null. */
export async function getRecentFix(maxAgeMs = 15000): Promise<RawFix | null> {
  try {
    const loc = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs, requiredAccuracy: 50 });
    return loc ? toRawFix(loc) : null;
  } catch {
    return null;
  }
}

/** Live compass: heading in degrees (0 = North) + calibration level 0–3. */
export async function watchHeading(
  cb: (headingDeg: number, calibration: number | null) => void
): Promise<LocationSubscription> {
  return Location.watchHeadingAsync((h) => {
    const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
    cb(value, typeof h.accuracy === 'number' ? h.accuracy : null);
  });
}

// ── reverse geocoding ──────────────────────────────────────────────────────

/** Best-effort single-line address. Resolves to null offline or after timeout. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  timeoutMs = 5000
): Promise<string | null> {
  const lookup = (async () => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const p = results[0];
      if (!p) return null;
      const street = [p.streetNumber, p.street].filter(Boolean).join(' ');
      const parts = [street || p.name, p.city ?? p.subregion].filter(Boolean);
      return parts.join(', ') || null;
    } catch {
      return null;
    }
  })();
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
  return Promise.race([lookup, timeout]);
}
