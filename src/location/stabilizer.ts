/**
 * Position stabilisation — pure, platform-independent logic (unit-tested).
 *
 * A phone GPS fix is noisy: individual readings jump around, some are cached,
 * some suffer from multipath near buildings. Instead of trusting one reading we:
 *
 *   1. collect many samples (10–20 depending on the profile),
 *   2. drop samples whose reported accuracy is far worse than the typical one,
 *   3. drop spatial outliers relative to a robust (median) centre,
 *   4. fuse the survivors with inverse-variance weights (1/accuracy²) so tighter
 *      readings count more,
 *   5. report an HONEST accuracy: never better than what the phone reported for
 *      a representative sample, and widened if the samples themselves scatter.
 *
 * Note: we deliberately do NOT use the statistical "combined error" of N samples
 * (σ/√N). GPS errors are strongly correlated over a few seconds, so that figure
 * would be optimistic — exactly the kind of fake precision we refuse to show.
 */

import { distanceMeters, type LatLng } from '@/utils/geo';
import { gpsQuality, honestMeters, MAX_USABLE_ACCURACY, type GpsQuality } from './quality';

export type Sample = {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy radius in metres as reported by the OS. */
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  /** Speed in m/s (negative / null when unknown). */
  speed: number | null;
  timestamp: number;
};

export type StabilizationMode = 'fast' | 'balanced' | 'precise';

export type StabilizationProfile = {
  /** Never conclude before this many usable samples. */
  minSamples: number;
  /** Stop once this many usable samples were collected. */
  maxSamples: number;
  /** Hard time limit for the acquisition. */
  maxDurationMs: number;
  /** A fix is "stable" when recent samples are at least this good (m)… */
  targetAccuracy: number;
  /** …over this many consecutive samples. */
  stableWindow: number;
};

export const STABILIZATION_PROFILES: Record<StabilizationMode, StabilizationProfile> = {
  fast: { minSamples: 5, maxSamples: 10, maxDurationMs: 8000, targetAccuracy: 10, stableWindow: 4 },
  balanced: { minSamples: 8, maxSamples: 15, maxDurationMs: 14000, targetAccuracy: 8, stableWindow: 5 },
  precise: { minSamples: 12, maxSamples: 20, maxDurationMs: 22000, targetAccuracy: 6, stableWindow: 6 },
};

/** Median walking-ish speed above which we consider the phone is moving. */
export const MOVING_SPEED = 1.2; // m/s

export type FusedFix = LatLng & {
  /** Honest accuracy radius to display (m, integer, rounded up). */
  accuracy: number;
  /** 68th-percentile distance of used samples to the fused point (m). */
  spread: number;
  /** Best accuracy reported by the OS among the used samples (m). */
  bestSampleAccuracy: number;
  altitude: number | null;
  used: number;
  rejected: number;
  total: number;
  /** True when the median reported speed suggests the phone was moving. */
  moving: boolean;
  quality: GpsQuality;
};

// ── small stats helpers ─────────────────────────────────────────────────────

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Nearest-rank percentile (returns an actual element of the array). */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * s.length);
  return s[Math.min(s.length - 1, Math.max(0, rank - 1))];
}

function weightedMean(samples: Sample[]): LatLng {
  let w = 0;
  let lat = 0;
  let lng = 0;
  for (const s of samples) {
    const wi = 1 / Math.max(s.accuracy * s.accuracy, 1);
    w += wi;
    lat += s.latitude * wi;
    lng += s.longitude * wi;
  }
  return { latitude: lat / w, longitude: lng / w };
}

/** Samples that are structurally usable at all. */
export function usableSamples(samples: Sample[]): Sample[] {
  return samples.filter(
    (s) =>
      isFinite(s.latitude) &&
      isFinite(s.longitude) &&
      isFinite(s.accuracy) &&
      s.accuracy > 0 &&
      s.accuracy <= MAX_USABLE_ACCURACY
  );
}

/**
 * Fuse samples into a single stabilised fix, or null when nothing is usable.
 */
export function fuseSamples(samples: Sample[]): FusedFix | null {
  const valid = usableSamples(samples);
  if (valid.length === 0) return null;

  // 1) Accuracy gate: drop readings far worse than the typical one.
  const medAcc = median(valid.map((s) => s.accuracy));
  const accGate = Math.max(medAcc * 2, medAcc + 5);
  let pool = valid.filter((s) => s.accuracy <= accGate);
  if (pool.length === 0) pool = valid;

  // 2) Spatial outliers relative to a robust median centre.
  const centre0: LatLng = {
    latitude: median(pool.map((s) => s.latitude)),
    longitude: median(pool.map((s) => s.longitude)),
  };
  const poolMedAcc = median(pool.map((s) => s.accuracy));
  const limitFor = (centre: LatLng, set: Sample[]) => {
    const d = set.map((s) => distanceMeters(centre, s));
    return Math.max(3 * median(d), 1.5 * poolMedAcc, 4);
  };

  const rejectFar = (centre: LatLng, set: Sample[]) => {
    const limit = limitFor(centre, set);
    const kept = set.filter((s) => distanceMeters(centre, s) <= limit);
    // Never let rejection wipe out most of the data: if the cloud is
    // multimodal, keep the half closest to the centre instead.
    if (kept.length < Math.max(3, Math.ceil(set.length * 0.4))) {
      return [...set]
        .sort((a, b) => distanceMeters(centre, a) - distanceMeters(centre, b))
        .slice(0, Math.max(1, Math.ceil(set.length / 2)));
    }
    return kept;
  };

  let kept = rejectFar(centre0, pool);

  // 3) Inverse-variance weighted mean, then one refinement pass.
  let fused = weightedMean(kept);
  kept = rejectFar(fused, kept);
  fused = weightedMean(kept);

  // 4) Honest accuracy.
  const distances = kept.map((s) => distanceMeters(fused, s));
  const spread = kept.length > 1 ? percentile(distances, 68) : 0;
  const accs = kept.map((s) => s.accuracy);
  const bestSampleAccuracy = Math.min(...accs);
  // A representative *reported* value (25th percentile = an actual sample),
  // widened by the observed scatter. Always ≥ the best reported sample.
  const representative = percentile(accs, 25);
  const accuracy = honestMeters(Math.max(representative, spread, bestSampleAccuracy));

  const speeds = valid.map((s) => s.speed).filter((v): v is number => v != null && v >= 0);
  const moving = speeds.length >= 3 && median(speeds) > MOVING_SPEED;

  const altitudes = kept.map((s) => s.altitude).filter((a): a is number => a != null && isFinite(a));

  return {
    latitude: fused.latitude,
    longitude: fused.longitude,
    accuracy,
    spread,
    bestSampleAccuracy,
    altitude: altitudes.length ? median(altitudes) : null,
    used: kept.length,
    rejected: valid.length - kept.length,
    total: samples.length,
    moving,
    quality: gpsQuality(accuracy),
  };
}

/**
 * True when the most recent `stableWindow` usable samples are all within the
 * target accuracy AND agree with each other (low scatter).
 */
export function isStable(samples: Sample[], profile: StabilizationProfile): boolean {
  const valid = usableSamples(samples);
  if (valid.length < profile.minSamples) return false;
  const recent = valid.slice(-profile.stableWindow);
  if (recent.some((s) => s.accuracy > profile.targetAccuracy)) return false;
  const centre = weightedMean(recent);
  const maxDist = Math.max(...recent.map((s) => distanceMeters(centre, s)));
  return maxDist <= profile.targetAccuracy;
}

export type StopReason = 'stable' | 'max-samples' | 'timeout' | null;

export function stopReason(samples: Sample[], profile: StabilizationProfile, elapsedMs: number): StopReason {
  if (isStable(samples, profile)) return 'stable';
  if (usableSamples(samples).length >= profile.maxSamples) return 'max-samples';
  if (elapsedMs >= profile.maxDurationMs) return 'timeout';
  return null;
}

/**
 * Whether a finished acquisition is good enough to save without asking the
 * user. Otherwise the UI shows "Position encore imprécise" with the choice to
 * keep waiting or save anyway.
 */
export function needsUserConfirmation(fix: FusedFix, stable: boolean): boolean {
  if (fix.moving) return true;
  if (fix.quality === 'poor' || fix.quality === 'unknown') return true;
  if (!stable && fix.quality === 'fair') return true;
  return false;
}
