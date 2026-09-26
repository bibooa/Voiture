/**
 * Compass heading helpers (pure).
 *
 * Raw magnetometer headings are jittery and can be badly off when the compass
 * is not calibrated. We smooth them on the unit circle (so 359° → 1° does not
 * swing through 180°) and expose a reliability level so the UI can refuse to
 * show a confident arrow when the compass cannot be trusted.
 */

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function normalizeDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

/** Circular exponential moving average. alpha ∈ (0,1]: higher = snappier. */
export function smoothHeading(prev: number | null, next: number, alpha = 0.25): number {
  if (prev == null || !isFinite(prev)) return normalizeDeg(next);
  const x = (1 - alpha) * Math.cos(toRad(prev)) + alpha * Math.cos(toRad(next));
  const y = (1 - alpha) * Math.sin(toRad(prev)) + alpha * Math.sin(toRad(next));
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

/** Smallest signed angle from a to b, in (-180, 180]. */
export function angleDelta(a: number, b: number): number {
  const d = normalizeDeg(b - a);
  return d > 180 ? d - 360 : d;
}

export type CompassReliability = 'good' | 'needs-calibration' | 'unavailable';

/**
 * expo-location reports compass calibration as 0–3
 * (3 high, 2 medium, 1 low, 0 none — on iOS ≈ <20°, <35°, <50°, >50°).
 */
export function compassReliability(
  heading: { value: number; accuracy: number | null } | null
): CompassReliability {
  if (!heading || !isFinite(heading.value)) return 'unavailable';
  if (heading.accuracy != null && heading.accuracy < 2) return 'needs-calibration';
  return 'good';
}
