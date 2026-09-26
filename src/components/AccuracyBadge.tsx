import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { accuracyLevel, ACCURACY_META } from '@/utils/accuracy';
import { formatAccuracy } from '@/utils/geo';

type Props = {
  accuracy: number | null | undefined;
  /** Show the "±N m" value alongside the qualitative label. */
  showValue?: boolean;
  compact?: boolean;
  style?: ViewStyle;
};

/**
 * Honest GPS accuracy indicator: a coloured dot (🟢/🟡/🔴), a qualitative
 * label, and optionally the exact "±N m" figure. Never overstates precision.
 */
export function AccuracyBadge({ accuracy, showValue = true, compact, style }: Props) {
  const t = useTheme();
  const level = accuracyLevel(accuracy);
  const meta = ACCURACY_META[level];
  const toneColor =
    meta.tone === 'success'
      ? t.colors.success
      : meta.tone === 'warning'
      ? t.colors.warning
      : meta.tone === 'danger'
      ? t.colors.danger
      : t.colors.textMuted;

  return (
    <View style={[styles.row, { gap: t.spacing.sm }, style]}>
      <View style={[styles.dot, { backgroundColor: toneColor, shadowColor: toneColor }]} />
      <AppText variant={compact ? 'caption' : 'callout'} weight="semibold">
        {meta.label}
      </AppText>
      {showValue ? (
        <AppText variant={compact ? 'caption' : 'body'} tone="secondary">
          {formatAccuracy(accuracy)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
