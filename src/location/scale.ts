/** Map scale bar maths (pure). */

const STEPS = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

/** Pick a round distance whose bar length is comfortable (≈ 40–100 pt). */
export function pickScale(metersPerPoint: number): { meters: number; width: number } | null {
  if (!isFinite(metersPerPoint) || metersPerPoint <= 0) return null;
  for (const m of STEPS) {
    const w = m / metersPerPoint;
    // Consecutive steps differ by ≤ 2.5×, so w stays ≤ 100 pt; never cap it,
    // or the bar would no longer match its label.
    if (w >= 40) return { meters: m, width: w };
  }
  return null;
}
