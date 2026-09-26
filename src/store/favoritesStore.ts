import { create } from 'zustand';
import type { Favorite } from '@/types';
import { StorageKeys, readJSON, writeJSON } from '@/services/storage';
import { makeId } from '@/utils/id';

/** Suggested favourite presets shown when creating a new favourite. */
export const FAVORITE_PRESETS = [
  { icon: '🏠', name: 'Maison' },
  { icon: '💼', name: 'Travail' },
  { icon: '🛒', name: 'Supermarché' },
  { icon: '🏟️', name: 'Stade' },
  { icon: '✈️', name: 'Aéroport' },
  { icon: '🏥', name: 'Hôpital' },
  { icon: '🎓', name: 'École' },
  { icon: '📍', name: 'Lieu' },
] as const;

type FavoritesState = {
  hydrated: boolean;
  favorites: Favorite[];
  hydrate: () => Promise<void>;
  add: (fav: Omit<Favorite, 'id' | 'createdAt'>) => Favorite;
  update: (id: string, patch: Partial<Omit<Favorite, 'id'>>) => void;
  remove: (id: string) => void;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  hydrated: false,
  favorites: [],

  hydrate: async () => {
    const favorites = await readJSON<Favorite[]>(StorageKeys.favorites, []);
    set({ favorites, hydrated: true });
  },

  add: (fav) => {
    const record: Favorite = { ...fav, id: makeId('fav_'), createdAt: Date.now() };
    const favorites = [record, ...get().favorites];
    set({ favorites });
    writeJSON(StorageKeys.favorites, favorites);
    return record;
  },

  update: (id, patch) => {
    const favorites = get().favorites.map((f) =>
      f.id === id ? { ...f, ...patch } : f
    );
    set({ favorites });
    writeJSON(StorageKeys.favorites, favorites);
  },

  remove: (id) => {
    const favorites = get().favorites.filter((f) => f.id !== id);
    set({ favorites });
    writeJSON(StorageKeys.favorites, favorites);
  },
}));
