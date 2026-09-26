import { create } from 'zustand';
import type { Favorite } from '@/types';
import { StorageKeys, readJSON, writeJSON } from '@/services/storage';
import { makeId } from '@/utils/id';

/**
 * Suggested favourite presets. `icon` is a semantic Icon key (see components/Icon),
 * not an emoji, so favourites render as clean vector glyphs everywhere.
 */
export const FAVORITE_PRESETS = [
  { icon: 'home', name: 'Maison' },
  { icon: 'work', name: 'Travail' },
  { icon: 'cart', name: 'Supermarché' },
  { icon: 'stadium', name: 'Stade' },
  { icon: 'airport', name: 'Aéroport' },
  { icon: 'hospital', name: 'Hôpital' },
  { icon: 'school', name: 'École' },
  { icon: 'gym', name: 'Sport' },
  { icon: 'restaurant', name: 'Restaurant' },
  { icon: 'place', name: 'Lieu' },
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
