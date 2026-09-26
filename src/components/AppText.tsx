import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '@/theme';

type Variant =
  | 'hero'
  | 'display'
  | 'title'
  | 'headline'
  | 'body'
  | 'callout'
  | 'caption'
  | 'label';

type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'onPrimary' | 'inherit';

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
  weight?: keyof ReturnType<typeof useTheme>['fontWeight'];
  center?: boolean;
  color?: string;
};

export function AppText({
  variant = 'body',
  tone = 'primary',
  weight,
  center,
  color,
  style,
  children,
  ...rest
}: Props) {
  const t = useTheme();

  const variantStyle: Record<Variant, TextStyle> = {
    hero: { fontSize: t.fontSize.hero, fontWeight: t.fontWeight.heavy, letterSpacing: -1 },
    display: { fontSize: t.fontSize.display, fontWeight: t.fontWeight.bold, letterSpacing: -0.6 },
    title: { fontSize: t.fontSize.xxl, fontWeight: t.fontWeight.bold, letterSpacing: -0.4 },
    headline: { fontSize: t.fontSize.xl, fontWeight: t.fontWeight.semibold, letterSpacing: -0.2 },
    body: { fontSize: t.fontSize.md, fontWeight: t.fontWeight.regular },
    callout: { fontSize: t.fontSize.lg, fontWeight: t.fontWeight.medium },
    caption: { fontSize: t.fontSize.sm, fontWeight: t.fontWeight.medium },
    label: { fontSize: t.fontSize.xs, fontWeight: t.fontWeight.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  };

  const toneColor: Record<Tone, string> = {
    primary: t.colors.text,
    secondary: t.colors.textSecondary,
    muted: t.colors.textMuted,
    accent: t.colors.primary,
    onPrimary: t.colors.onPrimary,
    inherit: t.colors.text,
  };

  return (
    <Text
      style={[
        variantStyle[variant],
        { color: color ?? toneColor[tone] },
        weight ? { fontWeight: t.fontWeight[weight] } : null,
        center ? styles.center : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
