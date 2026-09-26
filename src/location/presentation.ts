/**
 * Guidance presentation model (pure, unit-tested).
 *
 * Turns the raw numbers (distance, accuracies, freshness, compass…) into the
 * exact words and flags the UI shows. Every screen renders THIS, so the same
 * situation is always described the same way, and the honesty rules live in
 * one testable place:
 *
 *  - a distance is always shown as an estimate ("≈ 12 m"), never as exact;
 *  - accuracies are the real values, the tier only qualifies them;
 *  - "probably arrived" comes with the radius the car is probably in;
 *  - no direction is shown when the uncertainty makes it meaningless;
 *  - a travel time only appears when a real route was computed.
 */

import { compassFromBearing, formatDistance, formatDuration } from '@/utils/geo';
import { arrivalRadius, type ArrivalState, type Guidance } from './guidance';
import type { CompassReliability } from './heading';
import { formatAccuracy, gpsQuality, type GpsQuality, type QualityTone } from './quality';

export type Freshness = 'live' | 'stale' | 'lost' | 'none';
export type ArrowMode = 'compass' | 'north' | 'none' | 'arrived';

/** Seconds after which the live fix is considered stale / lost. */
export const STALE_AFTER_S = 5;
export const LOST_AFTER_S = 30;

export type PresentInput = {
  now: number;
  car: { accuracy: number | null; savedAt: number } | null;
  fix: { accuracy: number | null; timestamp: number } | null;
  guidance: Guidance | null;
  arrival: ArrivalState | null;
  compass: CompassReliability;
  relativeBearing: number | null;
  /** A real computed walking route, or null. */
  route: { distance: number; duration: number } | null;
  /** Nominal seconds between GPS updates (1 in guidance, ~4 on the map). */
  expectedIntervalS?: number;
};

export type GuidanceView = {
  freshness: Freshness;
  /** e.g. "Position mise à jour à l'instant" / "Dernière position fiable il y a 8 s". */
  freshnessText: string;
  userAccuracyText: string;
  userTier: GpsQuality;
  carAccuracyText: string;
  carTier: GpsQuality;
  /** "≈ 12 m", or null when unknown. */
  distanceText: string | null;
  distanceKind: 'route' | 'direct' | null;
  /** "2 min à pied" — only from a real route. */
  routeText: string | null;
  headline: string | null;
  detail: string | null;
  headlineTone: 'success' | 'accent' | null;
  /** "Incertitude de position : ±15 m". */
  uncertaintyText: string | null;
  directionText: string | null;
  arrowMode: ArrowMode;
  arrowRotation: number;
  lowConfidence: boolean;
  warning: { text: string; tone: QualityTone; icon: 'warning' | 'compass' | 'accuracy' } | null;
};

function formatAge(s: number): string {
  if (s < 90) return `${s} s`;
  return `${Math.round(s / 60)} min`;
}

/**
 * Freshness of the live fix. Thresholds scale with the GPS cadence (a 4 s
 * update rate is not "stale" after 5 s), but the AGE shown is always the true
 * one.
 */
export function freshnessOf(
  fix: PresentInput['fix'],
  now: number,
  expectedIntervalS = 1
): { freshness: Freshness; age: number | null } {
  if (!fix) return { freshness: 'none', age: null };
  const age = Math.max(0, Math.round((now - fix.timestamp) / 1000));
  const staleAfter = Math.max(STALE_AFTER_S, expectedIntervalS * 2.5);
  const lostAfter = Math.max(LOST_AFTER_S, expectedIntervalS * 10);
  if (age > lostAfter) return { freshness: 'lost', age };
  if (age > staleAfter) return { freshness: 'stale', age };
  return { freshness: 'live', age };
}

export function presentGuidance(i: PresentInput): GuidanceView {
  const { freshness, age } = freshnessOf(i.fix, i.now, i.expectedIntervalS);
  const freshnessText =
    freshness === 'none'
      ? 'Recherche du signal GPS…'
      : freshness === 'lost'
        ? `Signal GPS perdu · dernière position il y a ${formatAge(age!)}`
        : freshness === 'stale'
          ? `Dernière position fiable il y a ${formatAge(age!)}`
          : age! <= 2
            ? 'Position mise à jour à l’instant'
            : `GPS mis à jour il y a ${age} s`;

  const g = i.guidance;
  const u = g?.uncertainty ?? null;
  const arrived = i.arrival === 'probably-arrived';
  const near = i.arrival === 'near';
  const noDirection = !g || g.confidence === 'none';

  // Distance: route length when a real route exists, else straight line.
  const distanceKind: GuidanceView['distanceKind'] = g ? (i.route ? 'route' : 'direct') : null;
  const meters = i.route ? i.route.distance : g?.distance;
  const distanceText = meters != null ? `≈ ${formatDistance(meters)}` : null;
  const routeText = i.route ? `${formatDuration(i.route.duration)} à pied` : null;

  let headline: string | null = null;
  let detail: string | null = null;
  let headlineTone: GuidanceView['headlineTone'] = null;
  if (g && arrived) {
    headline = 'Vous êtes probablement arrivé';
    detail = `Votre voiture se trouve probablement dans un rayon d’environ ${arrivalRadius(u)} m.`;
    headlineTone = 'success';
  } else if (g && near) {
    headline = 'Votre voiture est tout près';
    headlineTone = 'accent';
    if (noDirection) {
      detail = `Elle est à moins de ${u ?? '?'} m environ : le GPS ne permet pas encore d’indiquer une direction fiable.`;
    }
  } else if (g && noDirection) {
    detail = `Votre voiture est dans la marge d’incertitude du GPS (±${u ?? '?'} m).`;
  }

  let arrowMode: ArrowMode = 'north';
  let arrowRotation = g?.bearing ?? 0;
  if (arrived) arrowMode = 'arrived';
  else if (noDirection) arrowMode = 'none';
  else if (i.relativeBearing != null) {
    arrowMode = 'compass';
    arrowRotation = i.relativeBearing;
  }
  const lowConfidence = g?.confidence === 'low' || i.compass === 'needs-calibration' || freshness !== 'live';

  const directionText =
    g && !arrived && !noDirection
      ? `Direction : ${compassFromBearing(g.bearing).label}${lowConfidence ? ' (approximative)' : ''}`
      : null;

  const userTier = gpsQuality(i.fix?.accuracy);
  let warning: GuidanceView['warning'] = null;
  if (freshness === 'lost') {
    warning = { icon: 'warning', tone: 'danger', text: 'Signal GPS perdu. Éloignez-vous des bâtiments ou sortez du parking couvert.' };
  } else if (i.compass === 'needs-calibration' && !arrived && !noDirection) {
    warning = { icon: 'compass', tone: 'warning', text: 'Boussole imprécise : calibrez-la en déplaçant le téléphone en forme de 8.' };
  } else if (userTier === 'poor') {
    warning = {
      icon: 'warning',
      tone: 'warning',
      text: `GPS faible ici (${formatAccuracy(i.fix?.accuracy)}) : bâtiments, arbres ou ciel masqué réduisent la précision.`,
    };
  } else if (i.compass === 'unavailable' && arrowMode === 'north') {
    warning = { icon: 'compass', tone: 'muted', text: 'Boussole indisponible : la direction est indiquée par rapport au nord.' };
  }

  return {
    freshness,
    freshnessText,
    userAccuracyText: formatAccuracy(i.fix?.accuracy),
    userTier,
    carAccuracyText: formatAccuracy(i.car?.accuracy),
    carTier: gpsQuality(i.car?.accuracy),
    distanceText,
    distanceKind,
    routeText,
    headline,
    detail,
    headlineTone,
    uncertaintyText: u != null ? `Incertitude de position : ±${u} m` : null,
    directionText,
    arrowMode,
    arrowRotation,
    lowConfidence,
    warning,
  };
}
