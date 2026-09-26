import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '@/services/haptics';

type Props = {
  icon?: IconName;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
};

/** A single row inside a settings group card. */
export function SettingsRow({ icon, label, description, right, onPress, danger, last }: Props) {
  const t = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: t.spacing.md,
          borderBottomColor: t.colors.glassBorder,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
          <Icon name={icon} size={18} color={danger ? t.colors.danger : t.colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="callout" weight="medium" color={danger ? t.colors.danger : undefined}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {description}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      android_ripple={{ color: t.colors.glassBorder }}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  right: { marginLeft: 12 },
});
