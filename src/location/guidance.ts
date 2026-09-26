/**
 * Guidance maths (pure): distance WITH its uncertainty, direction confidence
 * and an arrival state that respects GPS uncertainty.
 *
 * Two uncertain positions (the saved car at ±c m, the user at ±u m) give a
 * distance whose uncertainty is roughly √(c² + u²). We always carry that figure
 * alongside the distance so the UI never presents "8 m" as exact.
 */

import { bearingDegrees, distanceMeters, type LatLng } from '@/utils/geo';
import { honestMeters } from './quality';

export type ArrivalState = 'far' | 'near' | 'probably-arrived';
export type DirectionConfidence = 'high' | 'low' | 'none';

/**
 * Combined ±m uncertainty on the user↔car distance, or null if unknown.
 *
 * The two position errors are independent, so they combine as a root sum of
 * squares: √(car² + user²) — larger than either alone, smaller than their sum.
 * The user's term is the WORSE of the OS-reported accuracy and the live
 * scatter actually observed (an unstable signal is less trustworthy than what
 * the OS claims).
 */
export function combinedUncertainty(
  carAccuracy: number | null | undefined,
  userAccuracy: number | null | undefined,
  userScatter = 0
): number | null {
  if (carAccuracy == null || userAccuracy == null) return null;
  if (!isFinite(carAccuracy) || !isFinite(userAccuracy)) return null;
  const u = Math.max(userAccuracy, isFinite(userScatter) ? userScatter : 0);
  return honestMeters(Math.sqrt(carAccuracy * carAccuracy + u * u));
}

/** We never claim arrival closer than this, whatever the GPS says. */
export const MIN_ARRIVAL_RADIUS = 8;
/** Extra margin before leaving the arrival state (avoids flicker). */
export const ARRIVAL_HYSTERESIS = 6;
/** Beyond the arrival radius + this, we are no longer "near". */
export const NEAR_MARGIN = 25;

/**
 * Beyond this combined uncertainty the GPS cannot confirm an arrival at all:
 * at ±43 m, "probably arrived" could be said 40 m from the car. We stay at
 * "near" and state the radius instead.
 */
export const MAX_ARRIVAL_RADIUS = 20;

export function arrivalRadius(uncertainty: number | null): number {
  return Math.max(MIN_ARRIVAL_RADIUS, uncertainty ?? 20);
}

/** Whether the GPS is precise enough to ever declare "probably arrived". */
export function canConfirmArrival(uncertainty: number | null): boolean {
  return uncertainty != null && arrivalRadius(uncertainty) <= MAX_ARRIVAL_RADIUS;
}

/**
 * Arrival with hysteresis. Being within the uncertainty radius means the car is
 * *probably* here — we never state it as certain, and never at all when the
 * uncertainty is too large (or unknown) to mean anything.
 */
export function computeArrival(
  distance: number,
  uncertainty: number | null,
  previous: ArrivalState = 'far'
): ArrivalState {
  const r = arrivalRadius(uncertainty);
  if (!canConfirmArrival(uncertainty)) return distance <= r + NEAR_MARGIN ? 'near' : 'far';
  if (previous === 'probably-arrived' && distance <= r + ARRIVAL_HYSTERESIS) return 'probably-arrived';
  if (distance <= r) return 'probably-arrived';
  if (distance <= r + NEAR_MARGIN) return 'near';
  return 'far';
}

/** The arrival condition must hold this long before we say "probably arrived". */
export const ARRIVAL_DWELL_MS = 3000;

export type ArrivalMemory = { state: ArrivalState; candidateSince: number | null };
export const INITIAL_ARRIVAL: ArrivalMemory = { state: 'far', candidateSince: null };

/**
 * Arrival with hysteresis AND stability: "probably arrived" is only declared
 * once the user has stayed within the uncertainty radius for ARRIVAL_DWELL_MS
 * (a single lucky fix is not enough). Until then the state is "near".
 */
export function stepArrival(
  mem: ArrivalMemory,
  distance: number,
  uncertainty: number | null,
  now: number
): ArrivalMemory {
  const raw = computeArrival(distance, uncertainty, mem.state);
  if (raw !== 'probably-arrived') return { state: raw, candidateSince: null };
  if (mem.state === 'probably-arrived') return mem;
  const since = mem.candidateSince ?? now;
  if (now - since >= ARRIVAL_DWELL_MS) return { state: 'probably-arrived', candidateSince: since };
  return { state: 'near', candidateSince: since };
}

/**
 * How much the bearing can be trusted given positional uncertainty alone.
 * When the distance is not larger than the uncertainty, the car could be in any
 * direction — we must not show a confident arrow.
 */
export function directionConfidence(distance: number, uncertainty: number | null): DirectionConfidence {
  const u = uncertainty ?? 20;
  if (distance <= u) return 'none';
  const angularError = (Math.atan(u / distance) * 180) / Math.PI;
  return angularError > 35 ? 'low' : 'high';
}

export type Guidance = {
  /** Straight-line distance user→car (m). */
  distance: number;
  /** ± uncertainty on that distance (m), null if unknown. */
  uncertainty: number | null;
  /** True bearing user→car (deg, 0 = North). */
  bearing: number;
  confidence: DirectionConfidence;
};

export function computeGuidance(
  user: LatLng & { accuracy: number | null; scatter?: number },
  car: LatLng & { accuracy: number | null }
): Guidance {
  const distance = distanceMeters(user, car);
  const uncertainty = combinedUncertainty(car.accuracy, user.accuracy, user.scatter ?? 0);
  return {
    distance,
    uncertainty,
    bearing: bearingDegrees(user, car),
    confidence: directionConfidence(distance, uncertainty),
  };
}
