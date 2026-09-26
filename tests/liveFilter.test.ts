import { describe, it, expect } from 'vitest';
import { stepFilter, scatterOf, type FilterState, type RawFix } from '@/location/liveFilter';
import { distanceMeters, offsetMeters } from '@/utils/geo';
import { TRUTH, rng, gaussian } from './helpers';

const fixAt = (east: number, north: number, t: number, accuracy = 10, speed: number | null = 0): RawFix => ({
  ...offsetMeters(TRUTH, east, north),
  accuracy,
  altitude: null,
  speed,
  timestamp: t * 1000,
});

function run(fixes: RawFix[]) {
  let s: FilterState | null = null;
  const out: { state: FilterState; accepted: boolean }[] = [];
  for (const f of fixes) {
    const r = stepFilter(s, f);
    s = r.state;
    out.push(r);
  }
  return out;
}

describe('Live filter — jumpy fixes (10 → 3 → 18 → 4 → 12 m)', () => {
  // Stationary user at TRUTH, raw fixes jumping around in all directions.
  const jumps: [number, number][] = [[10, 0], [0, -3], [-18, 0], [0, 4], [12, 0], [0, -10], [3, 0], [-12, 0]];
  const res = run(jumps.map(([e, n], i) => fixAt(e, n, i + 1, 10)));

  it('warm-up: the first fixes move the marker TOWARD the truth', () => {
    const errs = res.slice(0, 4).map((r) => distanceMeters(r.state, TRUTH));
    for (let i = 1; i < errs.length; i++) expect(errs[i]).toBeLessThan(errs[i - 1]);
  });
  it('steady state: the marker is visually stable', () => {
    // Raw fixes jump up to 30 m apart; once settled the dot barely moves.
    const steps = res.slice(4).map((r, i) => distanceMeters(res[i + 3].state, r.state));
    expect(Math.max(...steps)).toBeLessThan(4);
  });
  it('stays close to the true position', () => {
    const errs = res.slice(2).map((r) => distanceMeters(r.state, TRUTH));
    expect(Math.max(...errs)).toBeLessThan(9);
  });
  it('still displays the real OS accuracy, not a filtered one', () => {
    expect(res[res.length - 1].state.accuracy).toBe(10);
  });
  it('measures the real scatter of the signal', () => {
    expect(scatterOf(res[res.length - 1].state)).toBeGreaterThan(5);
  });
});

describe('Live filter — impossible jumps', () => {
  const stable = [1, 2, 3, 4].map((t) => fixAt(0, 0, t, 6));

  it('rejects a single 200 m jump in 1 s', () => {
    const res = run([...stable, fixAt(200, 0, 5, 8)]);
    expect(res[4].accepted).toBe(false);
    expect(distanceMeters(res[4].state, TRUTH)).toBeLessThan(3);
  });
  it('re-synchronises when several fixes agree on the new place', () => {
    const res = run([...stable, fixAt(200, 0, 5, 8), fixAt(201, 1, 6, 8), fixAt(199, 0, 7, 8)]);
    const last = res[res.length - 1];
    expect(last.accepted).toBe(true);
    expect(distanceMeters(last.state, offsetMeters(TRUTH, 200, 0))).toBeLessThan(10);
  });
});

describe('Live filter — really walking', () => {
  it('follows a user walking 1.3 m/s north for 30 s', () => {
    const r = rng(5);
    const fixes = Array.from({ length: 30 }, (_, i) =>
      fixAt(gaussian(r) * 3, 1.3 * (i + 1) + gaussian(r) * 3, i + 1, 5, 1.3)
    );
    const res = run(fixes);
    const accepted = res.filter((x) => x.accepted).length;
    expect(accepted).toBeGreaterThanOrEqual(28);
    const end = offsetMeters(TRUTH, 0, 1.3 * 30);
    expect(distanceMeters(res[res.length - 1].state, end)).toBeLessThan(6);
  });
});
