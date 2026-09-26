/** Shared domain types for VéhiTrack. */

import type { StabilizationMode } from '@/location/stabilizer';

export type { GpsQuality } from '@/location/quality';
export type { StabilizationMode } from '@/location/stabilizer';

/**
 * The live position of the user — the single source of truth read by every
 * screen (see store/locationStore).
 */
export type LiveFix = {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy radius in metres as reported by the OS (null = unknown). */
  accuracy: number | null;
  altitude: number | null;
  /** Speed in m/s (null when unknown). */
  speed: number | null;
  /** Epoch millis when the OS produced this fix. */
  timestamp: number;
  /** Recent scatter of raw fixes around the filtered position (m). */
  scatter: number;
};

/** A saved parking location. */
export type ParkedLocation = {
  id: string;
  latitude: number;
  longitude: number;
  /** Honest accuracy radius (m) of the stabilised position, rounded up. */
  accuracy: number | null;
  /** Epoch millis when the user saved this location. */
  savedAt: number;
  /** Optional human-friendly name (editable in history). */
  label?: string;
  /** Reverse-geocoded approximate address, if it was resolvable. */
  address?: string | null;
  /** Optional detail: floor, zone, spot number… */
  note?: string;
  /** Number of GPS samples used to compute the position. */
  sampleCount?: number;
  /** True when the user chose to save despite an imprecise fix. */
  forced?: boolean;
};

/** A user-defined favourite place. */
export type Favorite = {
  id: string;
  name: string;
  /** Semantic icon key used to represent the favourite. */
  icon: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  createdAt: number;
};

export type ThemeMode = 'light' | 'dark' | 'auto';
export type MapType = 'standard' | 'satellite' | 'hybrid';

/** Persisted user preferences. */
export type Settings = {
  themeMode: ThemeMode;
  glassEffects: boolean;
  animations: boolean;
  haptics: boolean;
  mapType: MapType;
  /** Rotate the map with the compass in guidance mode (when reliable). */
  headingUpMap: boolean;
  /** Use every available location source for the best possible fix. */
  highAccuracy: boolean;
  /** How long to stabilise the position when saving the car. */
  stabilization: StabilizationMode;
  /** Fetch real walking routes from an online routing service. */
  onlineRouting: boolean;
  parkingReminders: boolean;
  onboarded: boolean;
};
