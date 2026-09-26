/**
 * Map framing rule (pure). Half-width (m) of the area to show around the
 * user/car midpoint: large enough that
 *  - both markers are visible with some street context,
 *  - the biggest accuracy circle covers at most a quarter of the view
 *    (so ±12 m never fills the screen when the car is 2 m away),
 *  - streets around stay readable (≥ 120 m across).
 */
export const MIN_HALF_SPAN = 60;
export const ACCURACY_ROOM = 4;

export function framingHalfSpan(distanceBetween: number, maxAccuracy: number): number {
  return Math.max(MIN_HALF_SPAN, maxAccuracy * ACCURACY_ROOM, distanceBetween / 2 + 15);
}
