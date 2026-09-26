import { create } from 'zustand';
import { distanceMeters, type LatLng } from '@/utils/geo';
import { fetchWalkingRoute, type WalkingRoute } from '@/services/routing';

/**
 * Walking route to the car, shared by every screen (one request, not one per
 * screen). Re-fetched only when the user has actually moved, never on a timer,
 * to respect the routing server and the battery.
 */

/** Below this straight-line distance a route adds nothing (and snapping to
 *  the street network would distort it). */
export const MIN_ROUTE_DISTANCE = 40;
/** Re-route after the user moved this far from the last route origin. */
const REROUTE_AFTER = 20;
/** After a failure, wait this long before trying again. */
const RETRY_AFTER_MS = 30_000;

export type RouteStatus = 'idle' | 'loading' | 'ok' | 'unavailable' | 'disabled';

type RouteState = {
  status: RouteStatus;
  route: WalkingRoute | null;
  /** Where the current route starts / for which car it was computed. */
  origin: LatLng | null;
  carId: string | null;
  failedAt: number | null;
  reason: 'offline' | 'no-route' | 'error' | null;
  update: (args: { user: LatLng | null; car: (LatLng & { id: string }) | null; enabled: boolean }) => void;
};

let inflight = false;

export const useRouteStore = create<RouteState>((set, get) => ({
  status: 'idle',
  route: null,
  origin: null,
  carId: null,
  failedAt: null,
  reason: null,

  update: ({ user, car, enabled }) => {
    if (!enabled) {
      if (get().status !== 'disabled') set({ status: 'disabled', route: null, origin: null });
      return;
    }
    if (!user || !car) return;

    const s = get();
    const carChanged = s.carId !== car.id;
    if (carChanged) set({ route: null, origin: null, carId: car.id, status: 'idle', failedAt: null, reason: null });

    if (distanceMeters(user, car) < MIN_ROUTE_DISTANCE) return;
    if (inflight) return;

    const st = get();
    const moved = st.origin ? distanceMeters(st.origin, user) : Infinity;
    const needs = !st.route || moved > REROUTE_AFTER || st.status === 'disabled' || st.status === 'idle';
    if (!needs) return;
    if (st.failedAt && Date.now() - st.failedAt < RETRY_AFTER_MS && moved < REROUTE_AFTER * 3) return;

    inflight = true;
    set({ status: st.route ? 'ok' : 'loading' });
    fetchWalkingRoute(user, car)
      .then((res) => {
        if (get().carId !== car.id) return; // car changed meanwhile
        if (res.ok) {
          set({ status: 'ok', route: res.route, origin: user, failedAt: null, reason: null });
        } else {
          // Keep no stale route: a route from far away would be misleading.
          set({ status: 'unavailable', route: null, origin: user, failedAt: Date.now(), reason: res.reason });
        }
      })
      .finally(() => {
        inflight = false;
      });
  },
}));
