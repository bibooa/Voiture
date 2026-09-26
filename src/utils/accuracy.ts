import type { AccuracyLevel } from '@/types';

/**
 * Map a raw horizontal-accuracy figure (metres) to a qualitative level.
 * Thresholds reflect realistic phone GNSS behaviour: a good open-sky fix is
 * commonly 4–8 m, while ≥20 m usually means obstructed sky or Wi-Fi/cell only.
 */
export function accuracyLevel(accuracy: number | null | undefined): AccuracyLevel {
  if (accuracy == null || !isFinite(accuracy)) return 'unknown';
  if (accuracy <= 10) return 'excellent';
  if (accuracy <= 25) return 'good';
  return 'poor';
}

type AccuracyMeta = { label: string; emoji: string; tone: 'success' | 'warning' | 'danger' | 'muted' };

export const ACCURACY_META: Record<AccuracyLevel, AccuracyMeta> = {
  excellent: { label: 'Excellente précision', emoji: '🟢', tone: 'success' },
  good: { label: 'Précision moyenne', emoji: '🟡', tone: 'warning' },
  poor: { label: 'Précision faible', emoji: '🔴', tone: 'danger' },
  unknown: { label: 'Précision inconnue', emoji: '⚪️', tone: 'muted' },
};
