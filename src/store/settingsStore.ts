import { create } from 'zustand';
import type { Settings, ThemeMode, MapType } from '@/types';
import { StorageKeys, readJSON, writeJSON } from '@/services/storage';
import { setHapticsEnabled } from '@/services/haptics';
import { migrateSettings, PRIVACY_VERSION } from './settingsMigration';

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'auto',
  glassEffects: true,
  animations: true,
  haptics: true,
  mapType: 'standard',
  headingUpMap: true,
  highAccuracy: true,
  stabilization: 'balanced',
  // Privacy: nothing leaves the phone unless the user opts in (see settingsMigration).
  onlineRouting: false,
  onlineAddress: false,
  privacyVersion: PRIVACY_VERSION,
  parkingReminders: false,
  onboarded: false,
};

type SettingsState = Settings & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setMapType: (type: MapType) => void;
  completeOnboarding: () => void;
  reset: () => void;
};

async function persist(state: Settings) {
  await writeJSON(StorageKeys.settings, state);
}

function pickSettings(s: SettingsState): Settings {
  const out = {} as Record<keyof Settings, unknown>;
  (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).forEach((k) => {
    out[k] = s[k];
  });
  return out as Settings;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const stored = await readJSON<Partial<Settings> | null>(StorageKeys.settings, null);
    const { settings: merged, changed } = migrateSettings(stored, DEFAULT_SETTINGS);
    setHapticsEnabled(merged.haptics);
    set({ ...merged, hydrated: true });
    if (changed && stored) persist(merged);
  },

  set: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    if (key === 'haptics') setHapticsEnabled(value as boolean);
    persist(pickSettings(get()));
  },

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    persist(pickSettings(get()));
  },

  setMapType: (type) => {
    set({ mapType: type });
    persist(pickSettings(get()));
  },

  completeOnboarding: () => {
    set({ onboarded: true });
    persist(pickSettings(get()));
  },

  reset: () => {
    set({ ...DEFAULT_SETTINGS });
    setHapticsEnabled(DEFAULT_SETTINGS.haptics);
    persist(DEFAULT_SETTINGS);
  },
}));
