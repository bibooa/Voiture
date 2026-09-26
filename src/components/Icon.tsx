import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

/**
 * Single semantic icon layer for the whole app. Components reference icons by
 * meaning ("car", "navigate", "trash") instead of emoji or raw glyph names, so
 * the icon set stays consistent and can be swapped in one place. Backed by
 * Ionicons + MaterialCommunityIcons (both bundled with @expo/vector-icons).
 */

type IoniconName = keyof typeof Ionicons.glyphMap;
type MciName = keyof typeof MaterialCommunityIcons.glyphMap;

type IconDef = { family: 'ion'; name: IoniconName } | { family: 'mci'; name: MciName };

export type IconName =
  | 'car'
  | 'carMarker'
  | 'pin'
  | 'navigate'
  | 'compass'
  | 'history'
  | 'favorite'
  | 'favoriteOutline'
  | 'settings'
  | 'add'
  | 'close'
  | 'trash'
  | 'edit'
  | 'map'
  | 'mapOutline'
  | 'walk'
  | 'target'
  | 'locate'
  | 'radar'
  | 'checkmark'
  | 'warning'
  | 'lock'
  | 'device'
  | 'bell'
  | 'theme'
  | 'glass'
  | 'sparkles'
  | 'haptic'
  | 'export'
  | 'chevron'
  | 'more'
  | 'clock'
  | 'floor'
  | 'note'
  | 'share'
  | 'shield'
  | 'database'
  | 'accuracy'
  // Favourite presets
  | 'home'
  | 'work'
  | 'cart'
  | 'stadium'
  | 'airport'
  | 'hospital'
  | 'school'
  | 'gym'
  | 'restaurant'
  | 'place'
  | 'camera'
  | 'image'
  | 'ticket';

const MAP: Record<IconName, IconDef> = {
  car: { family: 'mci', name: 'car-sports' },
  carMarker: { family: 'mci', name: 'car-sports' },
  pin: { family: 'ion', name: 'location' },
  navigate: { family: 'ion', name: 'navigate' },
  compass: { family: 'mci', name: 'compass' },
  history: { family: 'ion', name: 'time' },
  favorite: { family: 'ion', name: 'star' },
  favoriteOutline: { family: 'ion', name: 'star-outline' },
  settings: { family: 'ion', name: 'settings' },
  add: { family: 'ion', name: 'add' },
  close: { family: 'ion', name: 'close' },
  trash: { family: 'ion', name: 'trash-outline' },
  edit: { family: 'ion', name: 'create-outline' },
  map: { family: 'ion', name: 'map' },
  mapOutline: { family: 'ion', name: 'map-outline' },
  walk: { family: 'ion', name: 'walk' },
  target: { family: 'mci', name: 'target' },
  locate: { family: 'ion', name: 'locate' },
  radar: { family: 'mci', name: 'radar' },
  checkmark: { family: 'ion', name: 'checkmark' },
  warning: { family: 'ion', name: 'warning' },
  lock: { family: 'ion', name: 'lock-closed' },
  device: { family: 'ion', name: 'phone-portrait-outline' },
  bell: { family: 'ion', name: 'notifications' },
  theme: { family: 'ion', name: 'contrast' },
  glass: { family: 'mci', name: 'blur' },
  sparkles: { family: 'ion', name: 'sparkles' },
  haptic: { family: 'mci', name: 'vibrate' },
  export: { family: 'ion', name: 'share-outline' },
  chevron: { family: 'ion', name: 'chevron-forward' },
  more: { family: 'ion', name: 'ellipsis-horizontal' },
  clock: { family: 'ion', name: 'time-outline' },
  floor: { family: 'mci', name: 'stairs' },
  note: { family: 'ion', name: 'document-text-outline' },
  share: { family: 'ion', name: 'share-social-outline' },
  shield: { family: 'ion', name: 'shield-checkmark-outline' },
  database: { family: 'ion', name: 'server-outline' },
  accuracy: { family: 'mci', name: 'crosshairs-gps' },
  home: { family: 'mci', name: 'home-variant' },
  work: { family: 'mci', name: 'briefcase-variant' },
  cart: { family: 'mci', name: 'cart' },
  stadium: { family: 'mci', name: 'stadium-variant' },
  airport: { family: 'mci', name: 'airplane' },
  hospital: { family: 'mci', name: 'hospital-box' },
  school: { family: 'mci', name: 'school' },
  gym: { family: 'mci', name: 'dumbbell' },
  restaurant: { family: 'mci', name: 'silverware-fork-knife' },
  place: { family: 'mci', name: 'map-marker' },
  camera: { family: 'ion', name: 'camera-outline' },
  image: { family: 'ion', name: 'image-outline' },
  ticket: { family: 'mci', name: 'ticket-outline' },
};

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
};

export function Icon({ name, size = 22, color, style }: Props) {
  const t = useTheme();
  const def = MAP[name] ?? MAP.place;
  const c = color ?? t.colors.text;
  if (def.family === 'ion') {
    return <Ionicons name={def.name} size={size} color={c} style={style} />;
  }
  return <MaterialCommunityIcons name={def.name} size={size} color={c} style={style} />;
}

/** Resolve an arbitrary stored key to a safe IconName (fallback to 'place'). */
export function safeIconName(key: string | undefined | null): IconName {
  if (key && key in MAP) return key as IconName;
  return 'place';
}
