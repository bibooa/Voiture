import type { Settings } from '@/types';

/**
 * Settings migrations (pure, unit-tested).
 *
 * Privacy v2: every online service is OFF unless the user turns it on.
 * Before v2, online walking routes were enabled by default — a default the
 * user never chose — so stored settings from v1 are reset to off. Nothing that
 * sends coordinates may be enabled by a migration or a default.
 */
export const PRIVACY_VERSION = 2;

export function migrateSettings(stored: Partial<Settings> | null, defaults: Settings): { settings: Settings; changed: boolean } {
  const merged: Settings = { ...defaults, ...(stored ?? {}) };
  if ((stored?.privacyVersion ?? 1) >= PRIVACY_VERSION) return { settings: merged, changed: false };
  return {
    settings: { ...merged, onlineRouting: false, onlineAddress: false, privacyVersion: PRIVACY_VERSION },
    changed: true,
  };
}
