import { create } from 'zustand';
import type { ParkedLocation } from '@/types';
import { StorageKeys, readJSON, writeJSON } from '@/services/storage';
import { makeId } from '@/utils/id';
import { deletePhoto } from '@/services/photos';
import { cancelReminder } from '@/services/notifications';
import type { ParkingMeter } from '@/location/meter';

const HISTORY_LIMIT = 50;

/** Records leaving the app take their photo file and pending reminder with them. */
function discard(records: ParkedLocation[]) {
  for (const r of records) {
    deletePhoto(r.photoUri);
    if (r.meter?.reminderId) cancelReminder(r.meter.reminderId);
  }
}
/** Placement error (m) of a pin dragged by hand onto the right spot. */
export const MANUAL_ACCURACY = 3;

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
  /** The user dragged the car pin to the exact spot on the map. */
  moveCar: (id: string, latitude: number, longitude: number) => void;
  /** Attach / replace / remove the photo of the spot (old file is deleted). */
  setPhoto: (id: string, uri: string | null) => void;
  /** Set or clear the paid-parking period (see services/parkingMeter). */
  setMeter: (id: string, meter: ParkingMeter | null) => void;
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
    // Parked elsewhere now: the previous ticket's reminder no longer applies.
    const prevReminder = get().current?.meter?.reminderId;
    if (prevReminder) cancelReminder(prevReminder);
    const all = [record, ...get().history];
    discard(all.slice(HISTORY_LIMIT));
    const history = all.slice(0, HISTORY_LIMIT);
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

  moveCar: (id, latitude, longitude) => {
    // A pin placed by hand is as precise as the user's own eye: the GPS radius
    // no longer applies, only a few metres of placement error.
    const patch = { latitude, longitude, accuracy: MANUAL_ACCURACY, adjusted: true };
    const history = get().history.map((h) => (h.id === id ? { ...h, ...patch } : h));
    const current = get().current?.id === id ? { ...get().current!, ...patch } : get().current;
    set({ history, current });
    persist({ current, history });
  },

  setPhoto: (id, uri) => {
    const old = get().history.find((h) => h.id === id)?.photoUri;
    if (old && old !== uri) deletePhoto(old);
    const history = get().history.map((h) => (h.id === id ? { ...h, photoUri: uri } : h));
    const current = get().current?.id === id ? { ...get().current!, photoUri: uri } : get().current;
    set({ history, current });
    persist({ current, history });
  },

  setMeter: (id, meter) => {
    const history = get().history.map((h) => (h.id === id ? { ...h, meter } : h));
    const current = get().current?.id === id ? { ...get().current!, meter } : get().current;
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
    const gone = get().history.find((h) => h.id === id);
    discard(gone ? [gone] : []);
    const history = get().history.filter((h) => h.id !== id);
    const current =
      get().current?.id === id ? history[0] ?? null : get().current;
    set({ history, current });
    persist({ current, history });
  },

  clearHistory: () => {
    discard(get().history);
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
