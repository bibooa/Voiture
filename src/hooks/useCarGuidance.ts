import { useEffect, useMemo } from 'react';
import { useLocationStore } from '@/store/locationStore';
import { useCarStore } from '@/store/carStore';
import { useRouteStore, MIN_ROUTE_DISTANCE } from '@/store/routeStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  computeGuidance,
  stepArrival,
  INITIAL_ARRIVAL,
  type ArrivalMemory,
  type Guidance,
} from '@/location/guidance';
import { compassReliability, normalizeDeg, type CompassReliability } from '@/location/heading';
import { freshnessOf, presentGuidance, type GuidanceView } from '@/location/presentation';
import { PROFILE_INTERVAL_S } from '@/services/location';
import type { LiveFix, ParkedLocation } from '@/types';
import type { WalkingRoute } from '@/services/routing';

/**
 * Everything the UI needs about "me vs. my car": the filtered live position
 * (single store), the saved car, the shared walking route, and the ready-made
 * presentation (`view`) that every screen renders. Home and Find both use this
 * hook, so they always show the same numbers and the same words.
 */

// Arrival memory shared by all hook instances (hysteresis + dwell), per car.
let arrivalMemory: { carId: string; mem: ArrivalMemory; fixTs: number } | null = null;

export type CarGuidance = {
  car: ParkedLocation | null;
  fix: LiveFix | null;
  guidance: Guidance | null;
  compass: CompassReliability;
  headingValue: number | null;
  /** Real route geometry to draw (only when used for the distance). */
  route: WalkingRoute | null;
  view: GuidanceView;
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

  const guidance = useMemo(() => {
    if (!fix || !car) return null;
    return computeGuidance(
      { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy, scatter: fix.scatter },
      { latitude: car.latitude, longitude: car.longitude, accuracy: car.accuracy }
    );
  }, [fix, car]);

  // Arrival: advance the (hysteresis + dwell) state machine once per NEW fix.
  const interval = PROFILE_INTERVAL_S[active ?? 'map'];
  let arrival = null as ArrivalMemory['state'] | null;
  if (guidance && car && fix) {
    if (!arrivalMemory || arrivalMemory.carId !== car.id) {
      arrivalMemory = { carId: car.id, mem: INITIAL_ARRIVAL, fixTs: 0 };
    }
    if (fix.timestamp !== arrivalMemory.fixTs) {
      arrivalMemory = {
        carId: car.id,
        mem: stepArrival(arrivalMemory.mem, guidance.distance, guidance.uncertainty, fix.timestamp),
        fixTs: fix.timestamp,
      };
    }
    // Never assert arrival from an outdated position (same freshness rule as the UI).
    arrival = freshnessOf(fix, now, interval).freshness === 'live' ? arrivalMemory.mem.state : null;
  }

  const compass = compassReliability(heading);
  const relativeBearing =
    guidance && heading && compass !== 'unavailable' ? normalizeDeg(guidance.bearing - heading.value) : null;

  useEffect(() => {
    updateRoute({
      user: fix ? { latitude: fix.latitude, longitude: fix.longitude } : null,
      car: car ? { id: car.id, latitude: car.latitude, longitude: car.longitude } : null,
      enabled: onlineRouting,
    });
  }, [fix, car, onlineRouting, updateRoute]);

  const useRoute = !!guidance && !!route && routeStatus === 'ok' && guidance.distance >= MIN_ROUTE_DISTANCE;

  const view = presentGuidance({
    now,
    expectedIntervalS: interval,
    car: car ? { accuracy: car.accuracy, savedAt: car.savedAt, adjusted: car.adjusted } : null,
    fix: fix ? { accuracy: fix.accuracy, timestamp: fix.timestamp } : null,
    guidance,
    arrival,
    compass,
    relativeBearing,
    route: useRoute ? { distance: route!.distance, duration: route!.duration } : null,
  });

  return {
    car,
    fix,
    guidance,
    compass,
    headingValue: heading?.value ?? null,
    route: useRoute ? route : null,
    view,
  };
}
