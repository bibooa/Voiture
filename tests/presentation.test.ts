import { describe, it, expect } from 'vitest';
import {
  computeGuidance,
  stepArrival,
  INITIAL_ARRIVAL,
  arrivalRadius,
  canConfirmArrival,
  type ArrivalMemory,
} from '@/location/guidance';
import { presentGuidance, type PresentInput } from '@/location/presentation';
import { gpsQuality } from '@/location/quality';
import { framingHalfSpan } from '@/location/framing';
import { pickScale } from '@/location/scale';
import { offsetMeters } from '@/utils/geo';
import { TRUTH } from './helpers';

/** Simulate `seconds` of identical fixes and return the final view. */
function scenario(acc: number, distance: number, seconds = 4, carAcc = acc) {
  const car = { ...TRUTH, accuracy: carAcc, savedAt: 0 };
  const user = { ...offsetMeters(TRUTH, 0, distance), accuracy: acc };
  const g = computeGuidance(user, car);
  let mem: ArrivalMemory = INITIAL_ARRIVAL;
  for (let t = 0; t <= seconds * 1000; t += 1000) mem = stepArrival(mem, g.distance, g.uncertainty, t);
  const now = seconds * 1000;
  const input: PresentInput = {
    now,
    car,
    fix: { accuracy: acc, timestamp: now },
    guidance: g,
    arrival: mem.state,
    compass: 'good',
    relativeBearing: g.bearing,
    route: null,
  };
  return { g, view: presentGuidance(input) };
}

const ACCURACIES = [3, 5, 8, 10, 12, 15, 20, 30];
const DISTANCES = [1, 3, 8, 15, 50, 100, 500];

describe('Consistency across accuracies ±3…±30 m and distances 1…500 m', () => {
  for (const acc of ACCURACIES) {
    for (const d of DISTANCES) {
      it(`±${acc} m at ${d} m`, () => {
        const { g, view } = scenario(acc, d);
        const U = Math.ceil(Math.sqrt(2) * acc);

        // Distance is always an estimate, under its own label.
        expect(view.distanceText!.startsWith('≈ ')).toBe(true);
        expect(view.distanceLabel).toBe('Distance estimée');
        // Real accuracies are always shown as values.
        expect(view.userAccuracyText).toBe(`±${acc} m`);
        expect(view.carAccuracyText).toBe(`±${acc} m`);
        // Combined uncertainty = √(car² + user²), rounded UP, under its own label.
        expect(g.uncertainty).toBe(U);
        expect(view.precisionLabel).toBe('Précision de localisation');
        expect(view.precisionText).toBe(`±${U} m`);
        // The two figures can never be confused: "≈" for the distance, "±" for the precision.
        expect(view.distanceText).not.toContain('±');
        expect(view.precisionText!.startsWith('±')).toBe(true);
        expect(view.withinMargin).toBe(g.distance <= U);
        // No invented travel time without a route.
        expect(view.routeText).toBeNull();

        const R = arrivalRadius(U);
        if (d <= R && !canConfirmArrival(U)) {
          // GPS too poor to confirm anything: no arrival, radius stated.
          expect(view.headline).toBe('Votre voiture est dans les environs');
          expect(view.detail).toContain(`${U} m`);
          expect(view.arrowMode).toBe('none');
        } else if (d <= R) {
          expect(view.headline).toBe('Vous êtes probablement arrivé');
          expect(view.detail).toContain(`${R} m`);
          expect(view.arrowMode).toBe('arrived');
        } else {
          expect(view.headline).not.toBe('Vous êtes probablement arrivé');
        }
        // Never a direction when the car is inside the uncertainty.
        if (d <= U) expect(view.directionText).toBeNull();
        if (d > U * 3) expect(view.directionText).toMatch(/^Direction : /);
      });
    }
  }

  it('tiers qualify but never replace the value', () => {
    expect(ACCURACIES.map((a) => gpsQuality(a))).toEqual([
      'excellent', 'excellent', 'good', 'good', 'fair', 'fair', 'fair', 'poor',
    ]);
    expect(scenario(30, 150).view.warning?.text).toContain('±30 m');
  });
});

describe('Combined cases', () => {
  it('car ±12 m / user ±8 m, 3 m apart: "≈ 3 m" is never a 3 m precision', () => {
    const { view } = scenario(8, 3, 4, 12);
    expect(view.headline).toBe('Vous êtes probablement arrivé');
    expect(view.distanceLabel).toBe('Distance estimée');
    expect(view.distanceText).toBe('≈ 3 m');
    expect(view.precisionLabel).toBe('Précision de localisation');
    expect(view.precisionText).toBe('±15 m'); // √(144 + 64) = 14.4 → 15
    expect(view.withinMargin).toBe(true);
    expect(view.carAccuracyText).toBe('±12 m');
    expect(view.userAccuracyText).toBe('±8 m');
    expect(view.detail).toBe('Votre voiture se trouve probablement dans un rayon d’environ 15 m.');
    expect(view.directionText).toBeNull();
  });
  it('car ±5 m / user ±5 m → ±8 m, arrival possible', () => {
    const { g, view } = scenario(5, 3, 4, 5);
    expect(g.uncertainty).toBe(8);
    expect(view.precisionText).toBe('±8 m');
    expect(view.headline).toBe('Vous êtes probablement arrivé');
  });
  it('car ±20 m / user ±15 m → ±25 m, too poor to confirm arrival', () => {
    const { g, view } = scenario(15, 3, 10, 20);
    expect(g.uncertainty).toBe(25);
    expect(view.headline).toBe('Votre voiture est dans les environs');
    expect(view.detail).toContain('25 m');
    expect(view.arrowMode).toBe('none');
  });
  it('unstable position: the observed scatter widens the precision', () => {
    const car = { ...TRUTH, accuracy: 5 };
    const user = { ...offsetMeters(TRUTH, 0, 30), accuracy: 5 };
    expect(computeGuidance(user, car).uncertainty).toBe(8);
    expect(computeGuidance({ ...user, scatter: 18 }, car).uncertainty).toBe(19); // √(25 + 324)
  });
});

describe('Pin placed by hand', () => {
  it('shows "placée à la main" instead of a GPS radius', () => {
    const { g } = scenario(8, 5, 4, 3);
    const v = presentGuidance({
      now: 0,
      car: { accuracy: 3, savedAt: 0, adjusted: true },
      fix: { accuracy: 8, timestamp: 0 },
      guidance: g,
      arrival: 'near',
      compass: 'good',
      relativeBearing: 0,
      route: null,
    });
    expect(v.carAccuracyText).toBe('placée à la main');
    expect(v.userAccuracyText).toBe('±8 m');
  });
});

describe('Arrival needs a usable uncertainty', () => {
  it('±30 m: never "probably arrived", even 2 m away', () => {
    for (const s of [0, 3, 10]) expect(scenario(30, 2, s).view.headline).toBe('Votre voiture est dans les environs');
  });
  it('unknown uncertainty never confirms arrival', () => {
    expect(stepArrival(stepArrival(INITIAL_ARRIVAL, 1, null, 0), 1, null, 5000).state).toBe('near');
  });
});

describe('Arrival needs a stable position', () => {
  it('one close fix is not enough — "tout près" first, arrival after 3 s', () => {
    expect(scenario(5, 3, 0).view.headline).toBe('Votre voiture est tout près');
    expect(scenario(5, 3, 1).view.headline).toBe('Votre voiture est tout près');
    expect(scenario(5, 3, 3).view.headline).toBe('Vous êtes probablement arrivé');
  });
  it('leaving the radius cancels the pending arrival', () => {
    let mem = stepArrival(INITIAL_ARRIVAL, 3, 8, 0);
    mem = stepArrival(mem, 40, 8, 1000); // jumped away
    mem = stepArrival(mem, 3, 8, 2000);
    mem = stepArrival(mem, 3, 8, 3000);
    expect(mem.state).toBe('near'); // timer restarted at 2 s
    expect(stepArrival(mem, 3, 8, 5000).state).toBe('probably-arrived');
  });
});

describe('Freshness wording', () => {
  const base = scenario(5, 40).g;
  const at = (ageS: number | null) =>
    presentGuidance({
      now: 100_000,
      car: { accuracy: 5, savedAt: 0 },
      fix: ageS == null ? null : { accuracy: 5, timestamp: 100_000 - ageS * 1000 },
      guidance: base,
      arrival: 'far',
      compass: 'good',
      relativeBearing: 0,
      route: null,
    });
  it('describes the age of the position', () => {
    expect(at(0).freshnessText).toBe('Position mise à jour à l’instant');
    expect(at(4).freshnessText).toBe('GPS mis à jour il y a 4 s');
    expect(at(8).freshnessText).toBe('Dernière position fiable il y a 8 s');
    expect(at(45).freshness).toBe('lost');
    expect(at(null).freshnessText).toBe('Recherche du signal GPS…');
  });
  it('shows a travel time only with a real route', () => {
    const v = presentGuidance({
      now: 0,
      car: { accuracy: 5, savedAt: 0 },
      fix: { accuracy: 5, timestamp: 0 },
      guidance: base,
      arrival: 'far',
      compass: 'good',
      relativeBearing: 0,
      route: { distance: 127, duration: 100 },
    });
    expect(v.distanceText).toBe('≈ 125 m');
    expect(v.distanceLabel).toBe('Distance à pied');
    expect(v.routeText).toBe('2 min à pied');
  });
  it('old position: stale, direction flagged approximate', () => {
    const v = at(8);
    expect(v.freshness).toBe('stale');
    expect(v.lowConfidence).toBe(true);
  });
  it('lost signal: explicit warning, badge never shows a fresh value', () => {
    const v = at(45);
    expect(v.freshnessText).toMatch(/^Signal GPS perdu · dernière position il y a /);
    expect(v.warning?.tone).toBe('danger');
  });
  it('no route (disabled, unavailable or offline) → no travel time, never "< 1 min"', () => {
    const v = at(0);
    expect(v.routeText).toBeNull();
    expect(v.distanceLabel).toBe('Distance estimée');
    expect(JSON.stringify(v)).not.toMatch(/min à pied|< ?1 min/);
  });
});

describe('Map framing keeps accuracy circles proportionate', () => {
  for (const acc of ACCURACIES) {
    for (const d of DISTANCES) {
      it(`±${acc} m at ${d} m: circle covers ≤ 25 % of the view, both markers visible`, () => {
        const half = framingHalfSpan(d, acc);
        expect((2 * acc) / (2 * half)).toBeLessThanOrEqual(0.25);
        expect(half).toBeGreaterThanOrEqual(d / 2);
      });
    }
  }
});

describe('Scale bar', () => {
  it('picks a round distance of comfortable length', () => {
    expect(pickScale(0.2)).toEqual({ meters: 10, width: 50 });
    expect(pickScale(1)?.meters).toBe(50);
    expect(pickScale(0)).toBeNull();
  });
});
