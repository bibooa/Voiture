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

/** Combined ±m uncertainty on the user↔car distance, or null if unknown. */
export function combinedUncertainty(
  carAccuracy: number | null | undefined,
  userAccuracy: number | null | undefined
): number | null {
  if (carAccuracy == null || userAccuracy == null) return null;
  if (!isFinite(carAccuracy) || !isFinite(userAccuracy)) return null;
  return honestMeters(Math.sqrt(carAccuracy * carAccuracy + userAccuracy * userAccuracy));
}

/** We never claim arrival closer than this, whatever the GPS says. */
export const MIN_ARRIVAL_RADIUS = 8;
/** Extra margin before leaving the arrival state (avoids flicker). */
export const ARRIVAL_HYSTERESIS = 6;
/** Beyond the arrival radius + this, we are no longer "near". */
export const NEAR_MARGIN = 25;

export function arrivalRadius(uncertainty: number | null): number {
  return Math.max(MIN_ARRIVAL_RADIUS, uncertainty ?? 20);
}

/**
 * Arrival with hysteresis. Being within the uncertainty radius means the car is
 * *probably* here — we never state it as certain.
 */
export function computeArrival(
  distance: number,
  uncertainty: number | null,
  previous: ArrivalState = 'far'
): ArrivalState {
  const r = arrivalRadius(uncertainty);
  if (previous === 'probably-arrived' && distance <= r + ARRIVAL_HYSTERESIS) return 'probably-arrived';
  if (distance <= r) return 'probably-arrived';
  if (distance <= r + NEAR_MARGIN) return 'near';
  return 'far';
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
  user: LatLng & { accuracy: number | null },
  car: LatLng & { accuracy: number | null }
): Guidance {
  const distance = distanceMeters(user, car);
  const uncertainty = combinedUncertainty(car.accuracy, user.accuracy);
  return {
    distance,
    uncertainty,
    bearing: bearingDegrees(user, car),
    confidence: directionConfidence(distance, uncertainty),
  };
}
