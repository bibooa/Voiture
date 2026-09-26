import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin, typed wrapper around AsyncStorage. Every value is JSON-serialised.
 *
 * Privacy note: this is the ONLY persistence layer in the app. Parking
 * positions, history and favourites never leave the device.
 */

export const StorageKeys = {
  currentCar: 'garee.currentCar',
  history: 'garee.history',
  favorites: 'garee.favorites',
  settings: 'garee.settings',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export async function readJSON<T>(key: StorageKey, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[storage] failed to read "${key}"`, err);
    return fallback;
  }
}

export async function writeJSON<T>(key: StorageKey, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] failed to write "${key}"`, err);
  }
}

export async function removeKey(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storage] failed to remove "${key}"`, err);
  }
}

/** Wipe every piece of Garée data from the device (used by "delete all data"). */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(StorageKeys));
  } catch (err) {
    console.warn('[storage] failed to clear all data', err);
  }
}
