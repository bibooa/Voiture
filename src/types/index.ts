/** Shared domain types for VéhiTrack. */

/** A single GPS fix with the metadata we care about. */
export type Coordinate = {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres (radius, 68% confidence). Null if unknown. */
  accuracy: number | null;
  /** Altitude in metres, if available. */
  altitude?: number | null;
  /** Device heading at capture time (degrees, 0 = North), if available. */
  heading?: number | null;
  /** Epoch millis when the fix was produced by the OS. */
  timestamp: number;
};

/** A saved parking location. */
export type ParkedLocation = {
  id: string;
  latitude: number;
  longitude: number;
  /** Best horizontal accuracy achieved during capture, in metres. */
  accuracy: number | null;
  /** Epoch millis when the user saved this location. */
  savedAt: number;
  /** Optional human-friendly name (editable in history). */
  label?: string;
  /** Reverse-geocoded approximate address, if it was resolvable. */
  address?: string | null;
  /** Optional note. */
  note?: string;
};

/** A user-defined favourite place. */
export type Favorite = {
  id: string;
  name: string;
  /** Emoji or icon key used to represent the favourite. */
  icon: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  createdAt: number;
};

/** Qualitative accuracy buckets surfaced to the user. */
export type AccuracyLevel = 'excellent' | 'good' | 'poor' | 'unknown';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type MapType = 'standard' | 'satellite' | 'hybrid';

/** Persisted user preferences. */
export type Settings = {
  themeMode: ThemeMode;
  glassEffects: boolean;
  animations: boolean;
  haptics: boolean;
  mapType: MapType;
  autoRotateMap: boolean;
  highAccuracy: boolean;
  parkingReminders: boolean;
  onboarded: boolean;
};
