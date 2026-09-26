import { create } from 'zustand';
import type { ParkedLocation } from '@/types';
import { StorageKeys, readJSON, writeJSON } from '@/services/storage';
import { makeId } from '@/utils/id';

const HISTORY_LIMIT = 50;

export type SavedFix = {
  latitude: number;
  longitude: number;
  /** Honest accuracy (m) from the stabiliser. */
  accuracy: number;
  sampleCount: number;
  forced: boolean;
};

type CarState = {
  hydrated: boolean;
  /** The currently active parked location (most recent save), or null. */
  current: ParkedLocation | null;
  /** Past parked locations, newest first (includes the current one). */
  history: ParkedLocation[];

  hydrate: () => Promise<void>;
  /** Save a new parked location from a stabilised fix. Returns the record. */
  saveCar: (fix: SavedFix) => ParkedLocation;
  /** Attach the (asynchronously resolved) address to a record. */
  setAddress: (id: string, address: string | null) => void;
  rename: (id: string, label: string) => void;
  /** Set an optional detail note (parking floor, zone, spot number…). */
  setNote: (id: string, note: string) => void;
  remove: (id: string) => void;
  clearHistory: () => void;
  /** Make an existing history entry the active car again. */
  setCurrent: (id: string) => void;
};

async function persist(state: Pick<CarState, 'current' | 'history'>) {
  await Promise.all([
    writeJSON(StorageKeys.currentCar, state.current),
    writeJSON(StorageKeys.history, state.history),
  ]);
}

export const useCarStore = create<CarState>((set, get) => ({
  hydrated: false,
  current: null,
  history: [],

  hydrate: async () => {
    const [current, history] = await Promise.all([
      readJSON<ParkedLocation | null>(StorageKeys.currentCar, null),
      readJSON<ParkedLocation[]>(StorageKeys.history, []),
    ]);
    set({ current, history, hydrated: true });
  },

  saveCar: (fix) => {
    const record: ParkedLocation = {
      id: makeId('car_'),
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracy: fix.accuracy,
      sampleCount: fix.sampleCount,
      forced: fix.forced,
      savedAt: Date.now(),
      address: null,
    };
    const history = [record, ...get().history].slice(0, HISTORY_LIMIT);
    set({ current: record, history });
    persist({ current: record, history });
    return record;
  },

  setAddress: (id, address) => {
    if (!address) return;
    const history = get().history.map((h) => (h.id === id ? { ...h, address } : h));
    const current = get().current?.id === id ? { ...get().current!, address } : get().current;
    set({ history, current });
    persist({ current, history });
  },

  rename: (id, label) => {
    const history = get().history.map((h) =>
      h.id === id ? { ...h, label } : h
    );
    const current =
      get().current?.id === id ? { ...get().current!, label } : get().current;
    set({ history, current });
    persist({ current, history });
  },

  setNote: (id, note) => {
    const history = get().history.map((h) => (h.id === id ? { ...h, note } : h));
    const current =
      get().current?.id === id ? { ...get().current!, note } : get().current;
    set({ history, current });
    persist({ current, history });
  },

  remove: (id) => {
    const history = get().history.filter((h) => h.id !== id);
    const current =
      get().current?.id === id ? history[0] ?? null : get().current;
    set({ history, current });
    persist({ current, history });
  },

  clearHistory: () => {
    set({ history: [], current: null });
    persist({ current: null, history: [] });
  },

  setCurrent: (id) => {
    const found = get().history.find((h) => h.id === id) ?? null;
    if (!found) return;
    set({ current: found });
    persist({ current: found, history: get().history });
  },
}));
