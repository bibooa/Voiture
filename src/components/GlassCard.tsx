import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';

type Props = ViewProps & {
  /** Higher-contrast glass for prominent cards. */
  strong?: boolean;
  /** Corner radius token override. */
  radius?: number;
  /** Blur intensity (0–100). */
  intensity?: number;
  /** Inner padding. */
  padded?: boolean;
  /** Tighter padding for panels floating over a map. */
  compact?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
};

/**
 * The signature glassmorphism surface: a blurred, semi-transparent card with a
 * hairline border and a soft top highlight that reads like light catching an
 * edge of glass. Falls back to a solid translucent fill when blur/glass is
 * disabled in Settings, so the layout is identical either way.
 */
export function GlassCard({
  strong,
  radius,
  intensity = 40,
  padded = true,
  compact,
  style,
  children,
  ...rest
}: Props) {
  const t = useTheme();
  const r = radius ?? t.radius.lg;

  const containerStyle: ViewStyle = {
    borderRadius: r,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.glassBorder,
    overflow: 'hidden',
    shadowColor: t.colors.shadow,
    shadowOpacity: t.colors.isDark ? 0.22 : 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  };

  const inner: ViewStyle = { padding: padded ? (compact ? t.spacing.md + 2 : t.spacing.lg) : 0 };

  // A frosted, legible surface: blur + an opaque-ish scrim so text stays
  // readable over any background (dark map OR bright satellite), topped with a
  // subtle white tint that keeps the "glass" character.
  const scrim = strong ? t.colors.cardScrimStrong : t.colors.cardScrim;
  const tint = strong ? t.colors.glassStrong : t.colors.glass;

  return (
    <View style={[containerStyle, style]} {...rest}>
      {t.glass ? (
        <BlurView
          intensity={strong ? intensity + 15 : intensity}
          tint={t.colors.blurTint}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {/* Very subtle top edge highlight */}
      <LinearGradient
        colors={[t.colors.glassHighlight, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.25 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.18 }]}
        pointerEvents="none"
      />
      <View style={inner}>{children}</View>
    </View>
  );
}
