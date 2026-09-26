/**
 * Geospatial helpers: great-circle distance, initial bearing and the
 * human-readable formatting used across the UI.
 *
 * All calculations use the haversine formula on a spherical Earth, which is
 * more than accurate enough at the walking distances this app deals with.
 */

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export type LatLng = { latitude: number; longitude: number };

/** Great-circle distance between two points, in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, in degrees (0 = North, clockwise). */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS_FR = [
  { label: 'Nord', arrow: '↑' },
  { label: 'Nord-Est', arrow: '↗' },
  { label: 'Est', arrow: '→' },
  { label: 'Sud-Est', arrow: '↘' },
  { label: 'Sud', arrow: '↓' },
  { label: 'Sud-Ouest', arrow: '↙' },
  { label: 'Ouest', arrow: '←' },
  { label: 'Nord-Ouest', arrow: '↖' },
] as const;

/** Turn a bearing into a French cardinal label + arrow glyph. */
export function compassFromBearing(bearing: number): {
  label: string;
  arrow: string;
} {
  const index = Math.round(bearing / 45) % 8;
  return COMPASS_FR[index];
}

/**
 * Format a distance in a compact, French way. Precision is adapted to the
 * magnitude so we never display more resolution than GPS can support
 * (1 m steps below 100 m, 5 m steps up to 1 km).
 */
export function formatDistance(meters: number): string {
  if (!isFinite(meters)) return '—';
  if (meters < 100) return `${Math.round(meters)} m`;
  if (meters < 1000) return `${Math.round(meters / 5) * 5} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km)} km`;
}

/**
 * Format a real route duration (seconds, as returned by a routing service).
 * There is intentionally no helper that derives a time from a straight-line
 * distance: we never display an invented travel time.
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}
