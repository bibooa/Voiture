import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type ColorScheme } from './palette';
import { spacing, radius, fontSize, fontWeight, duration, spring } from './tokens';
import { useSettingsStore } from '@/store/settingsStore';

export type Theme = {
  colors: ColorScheme;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  duration: typeof duration;
  spring: typeof spring;
  /** Whether glass/blur effects are enabled (Settings + capability). */
  glass: boolean;
  /** Whether animations are enabled (Settings). */
  animations: boolean;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const glassEffects = useSettingsStore((s) => s.glassEffects);
  const animations = useSettingsStore((s) => s.animations);

  const isDark =
    themeMode === 'auto' ? system !== 'light' : themeMode === 'dark';

  const value = useMemo<Theme>(
    () => ({
      colors: isDark ? darkPalette : lightPalette,
      spacing,
      radius,
      fontSize,
      fontWeight,
      duration,
      spring,
      glass: glassEffects,
      animations,
    }),
    [isDark, glassEffects, animations]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
