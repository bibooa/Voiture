import * as Location from 'expo-location';
import type { Coordinate } from '@/types';

/**
 * Location service — the heart of Garée.
 *
 * Responsibilities:
 *  - permission handling (foreground only; we never track in the background)
 *  - acquiring the *most reliable* fix by sampling several readings and
 *    fusing them, rather than trusting a single noisy GPS point
 *  - live position / heading subscriptions for the map & guidance
 *  - best-effort reverse geocoding
 *
 * Honesty principle: the accuracy we report is always the accuracy the OS
 * gives us. We never fabricate a tighter figure than the device provides.
 */

export type PermissionResult = 'granted' | 'denied' | 'undetermined';

function normalizeFix(loc: Location.LocationObject): Coordinate {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    altitude: loc.coords.altitude ?? null,
    heading: loc.coords.heading ?? null,
    timestamp: loc.timestamp,
  };
}

export async function getPermissionStatus(): Promise<PermissionResult> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status as PermissionResult;
}

export async function requestPermission(): Promise<PermissionResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status as PermissionResult;
}

/** Whether the device's location services (GPS radio) are switched on. */
export async function isLocationEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/** A single, quick fix — good enough for centring the map on open. */
export async function getQuickPosition(highAccuracy = true): Promise<Coordinate> {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: highAccuracy
      ? Location.Accuracy.High
      : Location.Accuracy.Balanced,
  });
  return normalizeFix(loc);
}

export type AcquireProgress = {
  /** Latest raw sample received. */
  sample: Coordinate;
  /** Best fix so far (lowest accuracy radius). */
  best: Coordinate;
  /** How many samples collected. */
  count: number;
};

export type AcquireOptions = {
  highAccuracy?: boolean;
  /** Give up after this many samples. */
  maxSamples?: number;
  /** Give up after this long, even without enough samples. */
  maxDurationMs?: number;
  /** Stop early once a fix at least this good (metres) arrives. */
  targetAccuracy?: number;
  onProgress?: (p: AcquireProgress) => void;
  /** Abort signal to cancel acquisition (e.g. user leaves the screen). */
  signal?: AbortSignal;
};

/**
 * Acquire the best possible fix by watching the position for a short window,
 * keeping the tightest reading, and fusing the cluster of good samples into a
 * stabilised centroid. The *reported* accuracy is the best (smallest) radius
 * the OS produced — we never claim better than that.
 */
export async function acquireBestFix(opts: AcquireOptions = {}): Promise<Coordinate> {
  const {
    highAccuracy = true,
    maxSamples = 6,
    maxDurationMs = 8000,
    targetAccuracy = 8,
    onProgress,
    signal,
  } = opts;

  const samples: Coordinate[] = [];
  let best: Coordinate | null = null;

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: highAccuracy
        ? Location.Accuracy.BestForNavigation
        : Location.Accuracy.Balanced,
      timeInterval: 800,
      distanceInterval: 0,
    },
    (loc) => {
      const fix = normalizeFix(loc);
      samples.push(fix);
      if (
        !best ||
        (fix.accuracy != null &&
          (best.accuracy == null || fix.accuracy < best.accuracy))
      ) {
        best = fix;
      }
      onProgress?.({ sample: fix, best: best!, count: samples.length });
    }
  );

  try {
    await new Promise<void>((resolve) => {
      const start = Date.now();
      const onAbort = () => resolve();
      signal?.addEventListener('abort', onAbort);

      const tick = setInterval(() => {
        const elapsed = Date.now() - start;
        const reachedTarget =
          best?.accuracy != null && best.accuracy <= targetAccuracy;
        if (
          signal?.aborted ||
          reachedTarget ||
          samples.length >= maxSamples ||
          elapsed >= maxDurationMs
        ) {
          clearInterval(tick);
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }
      }, 250);
    });
  } finally {
    subscription.remove();
  }

  if (!best) {
    // Never got a watch callback — fall back to a one-shot read.
    return getQuickPosition(highAccuracy);
  }

  return fuseSamples(samples, best);
}

/**
 * Fuse a cluster of samples into a stabilised position. We keep only the
 * samples close to the best accuracy (to drop outliers), weight them by
 * inverse-variance (1/accuracy²) so tighter fixes dominate, and average the
 * coordinates. Reported accuracy stays the best observed radius — honest, not
 * optimistic.
 */
function fuseSamples(samples: Coordinate[], best: Coordinate): Coordinate {
  const bestAcc = best.accuracy ?? Infinity;
  const cluster = samples.filter(
    (s) => s.accuracy != null && s.accuracy <= Math.max(bestAcc * 1.6, bestAcc + 5)
  );
  const pool = cluster.length > 0 ? cluster : [best];

  let wSum = 0;
  let latSum = 0;
  let lngSum = 0;
  for (const s of pool) {
    const acc = s.accuracy ?? bestAcc;
    const w = 1 / Math.max(acc * acc, 1);
    wSum += w;
    latSum += s.latitude * w;
    lngSum += s.longitude * w;
  }

  return {
    latitude: latSum / wSum,
    longitude: lngSum / wSum,
    accuracy: best.accuracy, // honest: the OS's own best estimate
    altitude: best.altitude ?? null,
    heading: best.heading ?? null,
    timestamp: Date.now(),
  };
}

export type LocationSubscription = { remove: () => void };

/** Live position updates (used on the map and in guidance mode). */
export async function watchPosition(
  cb: (fix: Coordinate) => void,
  highAccuracy = true
): Promise<LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
      timeInterval: 1500,
      distanceInterval: 1,
    },
    (loc) => cb(normalizeFix(loc))
  );
}

/** Live compass heading (degrees, 0 = North). */
export async function watchHeading(
  cb: (headingDeg: number) => void
): Promise<LocationSubscription> {
  return Location.watchHeadingAsync((h) => {
    // Prefer true heading when available, fall back to magnetic.
    const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
    cb(value);
  });
}

/** Best-effort reverse geocode → single-line address, or null. */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const p = results[0];
    if (!p) return null;
    const parts = [
      [p.streetNumber, p.street].filter(Boolean).join(' '),
      p.city ?? p.subregion,
      p.postalCode,
    ].filter(Boolean);
    return parts.join(', ') || null;
  } catch {
    return null;
  }
}
