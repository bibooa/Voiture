/**
 * GPS quality tiers and honest accuracy formatting.
 *
 * Single place that decides how an accuracy radius (metres, as reported by the
 * OS) is qualified and displayed. Every screen goes through here, so the same
 * number always gets the same label and colour.
 *
 * Honesty rule: displayed accuracies are rounded UP (ceil). ±4.2 m is shown as
 * ±5 m — never as a tighter figure than the device actually provided.
 */

export type GpsQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

/**
 * Upper bounds (inclusive, metres) of each tier. Above `fair` is `poor`.
 * The tier is only ever shown NEXT TO the real value (e.g. "±9 m · BONNE"),
 * never instead of it.
 */
export const QUALITY_THRESHOLDS = {
  excellent: 5,
  good: 10,
  fair: 20,
} as const;

/** Accuracy (m) worse than this is considered unusable for saving a car. */
export const MAX_USABLE_ACCURACY = 100;

export type QualityTone = 'success' | 'warning' | 'danger' | 'muted';

export const QUALITY_META: Record<GpsQuality, { short: string; label: string; tone: QualityTone }> = {
  excellent: { short: 'EXCELLENTE', label: 'Excellente précision', tone: 'success' },
  good: { short: 'BONNE', label: 'Bonne précision', tone: 'success' },
  fair: { short: 'MOYENNE', label: 'Précision moyenne', tone: 'warning' },
  poor: { short: 'FAIBLE', label: 'Précision faible', tone: 'danger' },
  unknown: { short: 'INCONNUE', label: 'Précision inconnue', tone: 'muted' },
};

export function gpsQuality(accuracy: number | null | undefined): GpsQuality {
  if (accuracy == null || !isFinite(accuracy) || accuracy <= 0) return 'unknown';
  const a = Math.ceil(accuracy);
  if (a <= QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (a <= QUALITY_THRESHOLDS.good) return 'good';
  if (a <= QUALITY_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

/** Round an accuracy up to whole metres (never optimistic). */
export function honestMeters(accuracy: number): number {
  return Math.max(1, Math.ceil(accuracy));
}

/** "±5 m", or "—" when unknown. */
export function formatAccuracy(accuracy: number | null | undefined): string {
  if (accuracy == null || !isFinite(accuracy) || accuracy <= 0) return '—';
  return `±${honestMeters(accuracy)} m`;
}
