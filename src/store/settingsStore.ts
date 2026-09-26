import { create } from 'zustand';
import type { Settings, ThemeMode, MapType } from '@/types';
import { StorageKeys, readJSON, writeJSON } from '@/services/storage';
import { setHapticsEnabled } from '@/services/haptics';

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'auto',
  glassEffects: true,
  animations: true,
  haptics: true,
  mapType: 'standard',
  autoRotateMap: false,
  highAccuracy: true,
  stabilization: 'balanced',
  onlineRouting: true,
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
    const stored = await readJSON<Settings>(StorageKeys.settings, DEFAULT_SETTINGS);
    const merged = { ...DEFAULT_SETTINGS, ...stored };
    setHapticsEnabled(merged.haptics);
    set({ ...merged, hydrated: true });
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
