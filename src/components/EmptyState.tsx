import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  title: string;
  message: string;
  action?: React.ReactNode;
};

/** Friendly, non-technical empty state used across list screens. */
export function EmptyState({ icon, title, message, action }: Props) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
        <Icon name={icon} size={40} color={t.colors.primary} />
      </View>
      <AppText variant="headline" center style={{ marginTop: t.spacing.xl }}>
        {title}
      </AppText>
      <AppText variant="body" tone="secondary" center style={{ marginTop: t.spacing.sm, maxWidth: 300 }}>
        {message}
      </AppText>
      {action ? <View style={{ marginTop: t.spacing.xl }}>{action}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
