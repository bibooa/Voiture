import type { Sample } from '@/location/stabilizer';

/** Deterministic PRNG (mulberry32) so scenarios are reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(r: () => number): number {
  const u = Math.max(r(), 1e-12);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const TRUTH = { latitude: 50.7695, longitude: 3.028 };

/** Move a point by (east, north) metres. */
export function offset(p: { latitude: number; longitude: number }, east: number, north: number) {
  return {
    latitude: p.latitude + north / 111320,
    longitude: p.longitude + east / (111320 * Math.cos((p.latitude * Math.PI) / 180)),
  };
}

type Opts = {
  n: number;
  sigma: number; // true positional noise per axis (m)
  accMin: number; // reported accuracy range (m)
  accMax: number;
  seed?: number;
  speed?: number;
  outliers?: { east: number; north: number; accuracy: number }[];
};

/** Simulate a burst of GPS readings around the true car position. */
export function simulate(o: Opts): Sample[] {
  const r = rng(o.seed ?? 42);
  const out: Sample[] = [];
  for (let i = 0; i < o.n; i++) {
    const p = offset(TRUTH, gaussian(r) * o.sigma, gaussian(r) * o.sigma);
    out.push({
      ...p,
      accuracy: o.accMin + r() * (o.accMax - o.accMin),
      altitude: 30,
      heading: null,
      speed: o.speed ?? 0,
      timestamp: 1_000_000 + i * 1000,
    });
  }
  for (const [k, x] of (o.outliers ?? []).entries()) {
    out.splice(3 + k * 2, 0, {
      ...offset(TRUTH, x.east, x.north),
      accuracy: x.accuracy,
      altitude: 30,
      heading: null,
      speed: 0,
      timestamp: 1_000_000 + 500 + k,
    });
  }
  return out;
}
