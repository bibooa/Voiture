import { describe, it, expect } from 'vitest';
import {
  combinedUncertainty,
  computeArrival,
  computeGuidance,
  directionConfidence,
  arrivalRadius,
} from '@/location/guidance';
import { compassReliability, smoothHeading, angleDelta } from '@/location/heading';
import { parseOsrmRoute, fetchWalkingRoute } from '@/services/routing';
import * as geo from '@/utils/geo';
import { offset, TRUTH } from './helpers';

const car = { ...TRUTH, accuracy: 5 };
const userAt = (north: number, acc = 5) => ({ ...offset(TRUTH, 0, north), accuracy: acc });

describe('Distance vs uncertainty', () => {
  it('combines both accuracies (never shows distance as exact)', () => {
    expect(combinedUncertainty(10, 8)).toBe(13); // √164 = 12.8 → 13
    expect(combinedUncertainty(5, 5)).toBe(8); // √50 = 7.07 → 8
    expect(combinedUncertainty(null, 5)).toBeNull();
  });
});

describe('Test 4 — saved, then walking 10 to 50 m away', () => {
  it('distance tracks the real displacement', () => {
    for (const d of [10, 25, 50]) {
      expect(Math.abs(computeGuidance(userAt(d), car).distance - d)).toBeLessThan(0.5);
    }
  });
  it('bearing points back to the car (south when user is north)', () => {
    const g = computeGuidance(userAt(50), car);
    expect(Math.abs(angleDelta(g.bearing, 180))).toBeLessThan(1);
  });
  it('arrival respects uncertainty', () => {
    const u = combinedUncertainty(5, 5); // 8
    expect(computeArrival(50, u)).toBe('far');
    expect(computeArrival(20, u)).toBe('near');
    expect(computeArrival(6, u)).toBe('probably-arrived');
    // Hysteresis: stays "probably arrived" a few metres beyond the radius…
    expect(computeArrival(12, u, 'probably-arrived')).toBe('probably-arrived');
    // …but not further.
    expect(computeArrival(16, u, 'probably-arrived')).toBe('near');
  });
  it('the reported bug: 5 m away with ±6 m car → only "probably" arrived', () => {
    const u = combinedUncertainty(6, 12); // 14
    expect(arrivalRadius(u)).toBe(14);
    expect(computeArrival(5, u)).toBe('probably-arrived');
  });
  it('never claims arrival closer than 8 m even with a perfect GPS', () => {
    expect(computeArrival(9, combinedUncertainty(2, 2))).toBe('near');
  });
});

describe('Direction confidence', () => {
  it('refuses a confident arrow inside the uncertainty', () => {
    expect(directionConfidence(5, 8)).toBe('none');
    expect(directionConfidence(10, 8)).toBe('low');
    expect(directionConfidence(50, 8)).toBe('high');
  });
});

describe('Compass', () => {
  it('smooths across north without spinning', () => {
    const s = smoothHeading(359, 1, 0.5);
    expect(Math.abs(angleDelta(s, 0))).toBeLessThan(1);
  });
  it('flags a poorly calibrated compass', () => {
    expect(compassReliability({ value: 90, accuracy: 1 })).toBe('needs-calibration');
    expect(compassReliability({ value: 90, accuracy: 3 })).toBe('good');
    expect(compassReliability(null)).toBe('unavailable');
  });
});

describe('Test 7 — no Internet', () => {
  it('route fetch fails gracefully offline', async () => {
    const failing = (() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
    const res = await fetchWalkingRoute(TRUTH, offset(TRUTH, 100, 0), { fetchImpl: failing });
    expect(res).toEqual({ ok: false, reason: 'offline' });
  });
  it('there is no helper that invents a walking time from straight distance', () => {
    expect((geo as Record<string, unknown>).formatWalkTime).toBeUndefined();
  });
  it('durations only come from a real route', () => {
    const r = parseOsrmRoute({
      code: 'Ok',
      routes: [{ distance: 127.4, duration: 95.2, geometry: { coordinates: [[3.028, 50.7695], [3.0295, 50.7703]] } }],
    })!;
    expect(r.distance).toBeCloseTo(127.4);
    expect(geo.formatDuration(r.duration)).toBe('2 min');
    expect(r.coordinates[0]).toEqual({ latitude: 50.7695, longitude: 3.028 });
  });
  it('rejects malformed / no-route answers', () => {
    expect(parseOsrmRoute({ code: 'NoRoute', routes: [] })).toBeNull();
    expect(parseOsrmRoute(null)).toBeNull();
  });
});

describe('Distance formatting', () => {
  it('does not show more resolution than GPS supports', () => {
    expect(geo.formatDistance(8.4)).toBe('8 m');
    expect(geo.formatDistance(127)).toBe('125 m');
    expect(geo.formatDistance(1234)).toBe('1,2 km');
  });
});
