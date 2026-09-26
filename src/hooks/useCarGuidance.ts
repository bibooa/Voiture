import { useEffect, useMemo } from 'react';
import { useLocationStore } from '@/store/locationStore';
import { useCarStore } from '@/store/carStore';
import { useRouteStore, MIN_ROUTE_DISTANCE } from '@/store/routeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { computeArrival, computeGuidance, type ArrivalState, type Guidance } from '@/location/guidance';
import { compassReliability, normalizeDeg, type CompassReliability } from '@/location/heading';
import { gpsQuality, type GpsQuality } from '@/location/quality';
import type { LiveFix, ParkedLocation } from '@/types';
import type { WalkingRoute } from '@/services/routing';

/**
 * Everything the UI needs about "me vs. my car", derived from the single live
 * location store + the saved car + the shared route. Home and Find both use
 * this hook, so they always show the same numbers.
 */

export type Freshness = 'live' | 'stale' | 'lost' | 'none';

/** Seconds without an update before we call the fix stale / lost. */
const STALE_AFTER_S = { guidance: 8, map: 20 } as const;
const LOST_AFTER_S = { guidance: 30, map: 60 } as const;

// Arrival memory shared by all hook instances (hysteresis, per car).
let arrivalMemory: { carId: string; state: ArrivalState } | null = null;

export type CarGuidance = {
  car: ParkedLocation | null;
  fix: LiveFix | null;
  /** Age of the live fix in seconds (null when no fix). */
  fixAgeS: number | null;
  freshness: Freshness;
  userQuality: GpsQuality;
  guidance: Guidance | null;
  arrival: ArrivalState | null;
  compass: CompassReliability;
  /** Heading-relative bearing (deg) when a compass is available, else null. */
  relativeBearing: number | null;
  headingValue: number | null;
  route: WalkingRoute | null;
  routeStatus: string;
  /** What to show as "the" distance: route length when available, else direct. */
  primary: { meters: number; kind: 'route' | 'direct'; durationS: number | null } | null;
};

export function useCarGuidance(now: number): CarGuidance {
  const fix = useLocationStore((s) => s.fix);
  const heading = useLocationStore((s) => s.heading);
  const active = useLocationStore((s) => s.active);
  const car = useCarStore((s) => s.current);
  const onlineRouting = useSettingsStore((s) => s.onlineRouting);
  const route = useRouteStore((s) => s.route);
  const routeStatus = useRouteStore((s) => s.status);
  const updateRoute = useRouteStore((s) => s.update);

  const profile = active ?? 'map';
  const fixAgeS = fix ? Math.max(0, Math.round((now - fix.timestamp) / 1000)) : null;
  const freshness: Freshness =
    fixAgeS == null ? 'none' : fixAgeS > LOST_AFTER_S[profile] ? 'lost' : fixAgeS > STALE_AFTER_S[profile] ? 'stale' : 'live';

  const guidance = useMemo(() => {
    if (!fix || !car) return null;
    return computeGuidance(
      { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy },
      { latitude: car.latitude, longitude: car.longitude, accuracy: car.accuracy }
    );
  }, [fix, car]);

  // Arrival only from a fresh fix — never from a position that is outdated.
  let arrival: ArrivalState | null = null;
  if (guidance && car && freshness === 'live') {
    const prev = arrivalMemory && arrivalMemory.carId === car.id ? arrivalMemory.state : 'far';
    arrival = computeArrival(guidance.distance, guidance.uncertainty, prev);
    arrivalMemory = { carId: car.id, state: arrival };
  }

  const compass = compassReliability(heading);
  const relativeBearing =
    guidance && heading && compass !== 'unavailable' ? normalizeDeg(guidance.bearing - heading.value) : null;

  // Keep the shared walking route in sync (deduplicated inside the store).
  useEffect(() => {
    updateRoute({
      user: fix ? { latitude: fix.latitude, longitude: fix.longitude } : null,
      car: car ? { id: car.id, latitude: car.latitude, longitude: car.longitude } : null,
      enabled: onlineRouting,
    });
  }, [fix, car, onlineRouting, updateRoute]);

  const useRoute =
    !!guidance && !!route && routeStatus === 'ok' && guidance.distance >= MIN_ROUTE_DISTANCE && freshness !== 'lost';

  const primary = guidance
    ? useRoute
      ? { meters: route!.distance, kind: 'route' as const, durationS: route!.duration }
      : { meters: guidance.distance, kind: 'direct' as const, durationS: null }
    : null;

  return {
    car,
    fix,
    fixAgeS,
    freshness,
    userQuality: gpsQuality(fix?.accuracy),
    guidance,
    arrival,
    compass,
    relativeBearing,
    headingValue: heading?.value ?? null,
    route: useRoute ? route : null,
    routeStatus,
    primary,
  };
}
