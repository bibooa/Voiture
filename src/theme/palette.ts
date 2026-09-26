/**
 * Color palettes for VéhiTrack.
 *
 * The dark theme is the flagship experience: deep near-black blues with
 * translucent surfaces and discreet glows — never a mechanical inversion of
 * the light theme. The light theme is a soft, airy counterpart.
 */

export type ColorScheme = {
  /** Base app background (behind everything, including the map). */
  background: string;
  /** Secondary background used for large surfaces. */
  backgroundElevated: string;
  /** Gradient stops used for the ambient backdrop. */
  backdropGradient: [string, string, string];

  /** Glass card fill (semi-transparent). */
  glass: string;
  /** Stronger glass fill for prominent cards. */
  glassStrong: string;
  /** Hairline border on glass surfaces. */
  glassBorder: string;
  /** Top highlight reflection on glass. */
  glassHighlight: string;
  /**
   * Opaque-ish scrim painted behind card content so text stays legible on ANY
   * background (including bright satellite imagery). This is what makes the
   * frosted card readable — the blur alone is not enough over busy photos.
   */
  cardScrim: string;
  cardScrimStrong: string;

  /** Primary brand accent. */
  primary: string;
  primaryDeep: string;
  /** Gradient for the primary call-to-action. */
  primaryGradient: [string, string];
  /** Car marker / accent. */
  car: string;
  carGradient: [string, string];

  /** Text tones. */
  text: string;
  textSecondary: string;
  textMuted: string;
  onPrimary: string;

  /** Accuracy semantic colors. */
  success: string;
  warning: string;
  danger: string;

  /** Shadow color for soft depth. */
  shadow: string;

  /** Tint used by expo-blur ("dark" | "light" | "default"). */
  blurTint: 'dark' | 'light' | 'default';
  /** Whether this is a dark scheme (drives status bar, maps, etc). */
  isDark: boolean;
};

export const darkPalette: ColorScheme = {
  background: '#070A14',
  backgroundElevated: '#0E1424',
  backdropGradient: ['#0B1024', '#070A14', '#05070F'],

  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.11)',
  glassHighlight: 'rgba(255,255,255,0.22)',
  cardScrim: 'rgba(10,14,26,0.62)',
  cardScrimStrong: 'rgba(9,13,24,0.76)',

  primary: '#5B8CFF',
  primaryDeep: '#3E6BFF',
  primaryGradient: ['#6E9BFF', '#3E6BFF'],
  car: '#4ADE80',
  carGradient: ['#5AF0A0', '#22C55E'],

  text: '#F3F6FF',
  textSecondary: 'rgba(233,238,255,0.72)',
  textMuted: 'rgba(233,238,255,0.45)',
  onPrimary: '#FFFFFF',

  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#FB7185',

  shadow: '#000000',

  blurTint: 'dark',
  isDark: true,
};

export const lightPalette: ColorScheme = {
  background: '#EEF2FB',
  backgroundElevated: '#FFFFFF',
  backdropGradient: ['#F5F8FF', '#EAF0FC', '#E2E9F7'],

  glass: 'rgba(255,255,255,0.55)',
  glassStrong: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.85)',
  glassHighlight: 'rgba(255,255,255,0.95)',
  cardScrim: 'rgba(244,247,253,0.80)',
  cardScrimStrong: 'rgba(248,250,255,0.90)',

  primary: '#3E6BFF',
  primaryDeep: '#2A54E8',
  primaryGradient: ['#5B8CFF', '#2A54E8'],
  car: '#16A34A',
  carGradient: ['#34D778', '#16A34A'],

  text: '#0B1024',
  textSecondary: 'rgba(11,16,36,0.66)',
  textMuted: 'rgba(11,16,36,0.42)',
  onPrimary: '#FFFFFF',

  success: '#16A34A',
  warning: '#D97706',
  danger: '#E11D48',

  shadow: '#1B2540',

  blurTint: 'light',
  isDark: false,
};
