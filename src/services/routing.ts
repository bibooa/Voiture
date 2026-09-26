import type { LatLng } from '@/utils/geo';

/**
 * Walking routes from an OSRM server running the *foot* profile.
 *
 * Default: the public OpenStreetMap routing server (routing.openstreetmap.de).
 * It is free and keyless but has a fair-use policy — for a commercial release,
 * point ROUTING_BASE_URL at your own OSRM instance.
 *
 * Privacy: only the two coordinates of the requested route are sent, only
 * while the user looks at their car's position, and only when "Itinéraires
 * piétons en ligne" is enabled in Settings.
 */
export const ROUTING_BASE_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

export type WalkingRoute = {
  /** Route length in metres. */
  distance: number;
  /** Walking duration in seconds, as computed by the routing engine. */
  duration: number;
  coordinates: LatLng[];
};

export type RouteResult =
  | { ok: true; route: WalkingRoute }
  | { ok: false; reason: 'offline' | 'no-route' | 'error' };

/** Parse an OSRM /route response (geometries=geojson). Exported for tests. */
export function parseOsrmRoute(json: unknown): WalkingRoute | null {
  const j = json as {
    code?: string;
    routes?: { distance?: number; duration?: number; geometry?: { coordinates?: [number, number][] } }[];
  };
  if (!j || j.code !== 'Ok' || !Array.isArray(j.routes) || j.routes.length === 0) return null;
  const r = j.routes[0];
  const coords = r.geometry?.coordinates;
  if (typeof r.distance !== 'number' || typeof r.duration !== 'number' || !Array.isArray(coords) || coords.length < 2) {
    return null;
  }
  return {
    distance: r.distance,
    duration: r.duration,
    coordinates: coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
  };
}

export async function fetchWalkingRoute(
  from: LatLng,
  to: LatLng,
  { timeoutMs = 8000, fetchImpl = fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<RouteResult> {
  const f = (p: LatLng) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`;
  const url = `${ROUTING_BASE_URL}/${f(from)};${f(to)}?overview=full&geometries=geojson&steps=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return { ok: false, reason: 'error' };
    const route = parseOsrmRoute(await res.json());
    return route ? { ok: true, route } : { ok: false, reason: 'no-route' };
  } catch {
    // Network failure, DNS, timeout… — treat as offline.
    return { ok: false, reason: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
