/**
 * Live position filter (pure, unit-tested).
 *
 * Raw fixes jump around (10 m → 3 m → 18 m → 4 m…). Moving the user's marker
 * with every raw reading makes the map look broken and the arrow nervous.
 * This filter:
 *
 *  1. rejects physically impossible jumps (farther than a pedestrian could move
 *     since the last fix, beyond what the combined uncertainty explains),
 *     re-synchronising if several consecutive fixes agree on a new place;
 *  2. smooths accepted fixes with a Kalman update: each fix pulls the estimate
 *     in proportion to its reported accuracy, and the uncertainty grows with
 *     time to allow real movement;
 *  3. tracks the recent scatter of raw fixes around the estimate — a measure of
 *     how stable the signal really is, used in the combined uncertainty.
 *
 * Honesty: the accuracy we DISPLAY stays the OS-reported value of the latest
 * accepted fix. The filter only stabilises where the dot is drawn.
 */

import { distanceMeters, offsetMeters, type LatLng } from '@/utils/geo';
import { percentile } from './stabilizer';

export type RawFix = LatLng & {
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  timestamp: number;
};

export type FilterState = LatLng & {
  /** Estimate variance (m²). */
  variance: number;
  /** Timestamp of the last ACCEPTED fix. */
  timestamp: number;
  /** OS accuracy of the last accepted fix (m). */
  accuracy: number;
  speed: number | null;
  altitude: number | null;
  /** Recent accepted raw positions (for scatter). */
  recent: LatLng[];
  /** Consecutive rejected fixes and where they point (to detect a real relocation). */
  rejected: RawFix[];
};

/** Walking-speed process noise (m/s): how fast the true position may drift. */
export const PROCESS_SPEED = 1.5;
/** Plausible max speed for someone looking for their car (m/s). */
export const MAX_PLAUSIBLE_SPEED = 7;
/** After this many consistent "impossible" fixes, accept the new place. */
export const RESYNC_AFTER = 3;
const RECENT_WINDOW = 6;
/** Fixes worse than this are too vague to move anything. */
const UNUSABLE_ACCURACY = 150;

function init(fix: RawFix): FilterState {
  const acc = fix.accuracy ?? 30;
  return {
    latitude: fix.latitude,
    longitude: fix.longitude,
    variance: acc * acc,
    timestamp: fix.timestamp,
    accuracy: acc,
    speed: fix.speed,
    altitude: fix.altitude,
    recent: [{ latitude: fix.latitude, longitude: fix.longitude }],
    rejected: [],
  };
}

export type StepResult = { state: FilterState; accepted: boolean };

export function stepFilter(prev: FilterState | null, fix: RawFix): StepResult {
  if (fix.accuracy == null || !isFinite(fix.accuracy) || fix.accuracy <= 0 || fix.accuracy > UNUSABLE_ACCURACY) {
    return prev ? { state: prev, accepted: false } : { state: init({ ...fix, accuracy: fix.accuracy ?? 30 }), accepted: true };
  }
  if (!prev) return { state: init(fix), accepted: true };
  if (fix.timestamp <= prev.timestamp) return { state: prev, accepted: false };

  const dt = Math.max(0.2, (fix.timestamp - prev.timestamp) / 1000);
  const R = fix.accuracy * fix.accuracy;
  // Allow faster motion when the OS itself reports speed (e.g. jogging).
  const speed = Math.max(PROCESS_SPEED, fix.speed ?? 0);
  const P = prev.variance + (speed * dt) ** 2;

  // Gate: can the user plausibly have moved this far?
  const d = distanceMeters(prev, fix);
  const maxMove = Math.max(MAX_PLAUSIBLE_SPEED, (fix.speed ?? 0) * 1.5) * dt;
  const gate = maxMove + 3 * Math.sqrt(prev.variance + R);
  if (d > gate) {
    const rejected = [...prev.rejected, fix];
    // Several recent fixes agreeing on a new place → the user really moved
    // (or the first fixes were wrong): re-synchronise there.
    if (rejected.length >= RESYNC_AFTER) {
      const last = rejected.slice(-RESYNC_AFTER);
      const agree = last.every((r) => distanceMeters(r, fix) <= 2 * Math.max(r.accuracy ?? 30, fix.accuracy!));
      if (agree) return { state: init(fix), accepted: true };
    }
    return { state: { ...prev, rejected: rejected.slice(-RESYNC_AFTER) }, accepted: false };
  }

  // Kalman update (same gain for both axes; local metres).
  const K = P / (P + R);
  const northErr = (fix.latitude - prev.latitude) * 111320;
  const eastErr =
    (fix.longitude - prev.longitude) * 111320 * Math.cos((prev.latitude * Math.PI) / 180);
  const moved = offsetMeters(prev, eastErr * K, northErr * K);

  const recent = [...prev.recent, { latitude: fix.latitude, longitude: fix.longitude }].slice(-RECENT_WINDOW);
  return {
    accepted: true,
    state: {
      ...moved,
      variance: (1 - K) * P,
      timestamp: fix.timestamp,
      accuracy: fix.accuracy,
      speed: fix.speed,
      altitude: fix.altitude,
      recent,
      rejected: [],
    },
  };
}

/** 68th-percentile distance of recent raw fixes to the estimate (m). */
export function scatterOf(state: FilterState): number {
  if (state.recent.length < 3) return 0;
  return percentile(
    state.recent.map((p) => distanceMeters(state, p)),
    68
  );
}
