/**
 * Design tokens shared across both color schemes: spacing, radii, typography
 * and motion. Keeping these centralised avoids "magic numbers" in components
 * and guarantees visual consistency.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 34,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 34,
  hero: 44,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

/** Motion durations (ms) — kept short and snappy per the brief. */
export const duration = {
  fast: 160,
  base: 240,
  slow: 380,
  ambient: 2400,
} as const;

/** Reusable spring config for Reanimated micro-interactions. */
export const spring = {
  gentle: { damping: 18, stiffness: 180, mass: 0.9 },
  bouncy: { damping: 12, stiffness: 220, mass: 0.8 },
  snappy: { damping: 22, stiffness: 320, mass: 0.7 },
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
