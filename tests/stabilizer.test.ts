import { describe, it, expect } from 'vitest';
import {
  fuseSamples,
  isStable,
  needsUserConfirmation,
  stopReason,
  STABILIZATION_PROFILES,
  percentile,
} from '@/location/stabilizer';
import { distanceMeters } from '@/utils/geo';
import { formatAccuracy, gpsQuality } from '@/location/quality';
import { simulate, TRUTH } from './helpers';

const balanced = STABILIZATION_PROFILES.balanced;

describe('Test 1 — open sky', () => {
  const samples = simulate({ n: 15, sigma: 1.5, accMin: 3, accMax: 5 });
  const fix = fuseSamples(samples)!;

  it('lands close to the true position', () => {
    expect(distanceMeters(fix, TRUTH)).toBeLessThan(3);
  });
  it('reports an honest, good accuracy', () => {
    expect(fix.accuracy).toBeGreaterThanOrEqual(Math.ceil(fix.bestSampleAccuracy));
    expect(fix.accuracy).toBeLessThanOrEqual(5);
    expect(fix.quality).toBe('excellent');
  });
  it('is stable and saved without asking', () => {
    expect(isStable(samples, balanced)).toBe(true);
    expect(needsUserConfirmation(fix, true)).toBe(false);
  });
});

describe('Test 2 — outdoor car park', () => {
  const samples = simulate({ n: 15, sigma: 3, accMin: 5, accMax: 8, seed: 7 });
  const fix = fuseSamples(samples)!;
  it('stays within a few metres and is qualified "good"', () => {
    expect(distanceMeters(fix, TRUTH)).toBeLessThan(5);
    expect(fix.quality).toBe('good');
    expect(fix.accuracy).toBeGreaterThanOrEqual(5);
  });
});

describe('Test 3 — next to a building (multipath outliers)', () => {
  const samples = simulate({
    n: 15,
    sigma: 5,
    accMin: 10,
    accMax: 18,
    seed: 3,
    outliers: [
      { east: 45, north: 10, accuracy: 12 },
      { east: -50, north: 30, accuracy: 14 },
      { east: 20, north: -60, accuracy: 13 },
    ],
  });
  const fix = fuseSamples(samples)!;

  it('rejects the multipath jumps', () => {
    expect(fix.rejected).toBeGreaterThanOrEqual(3);
    expect(distanceMeters(fix, TRUTH)).toBeLessThan(8);
  });
  it('does not pretend to be precise', () => {
    expect(fix.accuracy).toBeGreaterThanOrEqual(10);
    expect(['fair', 'poor']).toContain(fix.quality);
  });
  it('asks the user before saving', () => {
    expect(isStable(samples, balanced)).toBe(false);
    expect(needsUserConfirmation(fix, false)).toBe(true);
  });
});

describe('Test 5 — deliberately poor GPS', () => {
  const samples = simulate({ n: 12, sigma: 15, accMin: 25, accMax: 40, seed: 11 });
  const fix = fuseSamples(samples)!;
  it('reports at least the best accuracy the phone gave', () => {
    expect(fix.accuracy).toBeGreaterThanOrEqual(25);
    expect(fix.quality).toBe('poor');
    expect(needsUserConfirmation(fix, false)).toBe(true);
  });
});

describe('Test 6 — GPS loss', () => {
  it('returns no fix when nothing usable was received', () => {
    expect(fuseSamples([])).toBeNull();
    const garbage = simulate({ n: 5, sigma: 50, accMin: 150, accMax: 400 });
    expect(fuseSamples(garbage)).toBeNull();
  });
  it('gives up on timeout instead of waiting forever', () => {
    expect(stopReason([], balanced, balanced.maxDurationMs + 1)).toBe('timeout');
    expect(stopReason([], balanced, 1000)).toBeNull();
  });
});

describe('Moving phone', () => {
  it('flags movement and asks for confirmation', () => {
    const samples = simulate({ n: 12, sigma: 2, accMin: 3, accMax: 5, speed: 1.6 });
    const fix = fuseSamples(samples)!;
    expect(fix.moving).toBe(true);
    expect(needsUserConfirmation(fix, true)).toBe(true);
  });
});

describe('Honesty invariants (200 random scenarios)', () => {
  it('never displays better accuracy than the best reported sample', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const sigma = 1 + (seed % 20);
      const samples = simulate({ n: 5 + (seed % 16), sigma, accMin: 2 + (seed % 7), accMax: 8 + (seed % 30), seed });
      const fix = fuseSamples(samples)!;
      expect(fix.accuracy).toBeGreaterThanOrEqual(Math.ceil(fix.bestSampleAccuracy));
      expect(Number.isInteger(fix.accuracy)).toBe(true);
    }
  });
  it('rounds up when formatting', () => {
    expect(formatAccuracy(4.2)).toBe('±5 m');
    expect(formatAccuracy(5)).toBe('±5 m');
    expect(formatAccuracy(null)).toBe('—');
  });
  it('uses consistent tiers', () => {
    expect(gpsQuality(3)).toBe('excellent');
    expect(gpsQuality(5)).toBe('excellent');
    expect(gpsQuality(5.1)).toBe('good'); // shown as ±6 m → "bonne"
    expect(gpsQuality(10)).toBe('good');
    expect(gpsQuality(15)).toBe('fair');
    expect(gpsQuality(20)).toBe('fair');
    expect(gpsQuality(21)).toBe('poor');
    expect(gpsQuality(null)).toBe('unknown');
  });
  it('percentile returns an actual element', () => {
    expect(percentile([9, 3, 5, 7], 25)).toBe(3);
  });
});
