import React from 'react';
import { Pressable, StyleSheet, ViewStyle, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '@/services/haptics';

type Props = {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  compact?: boolean;
  style?: ViewStyle;
  tint?: string;
  accessibilityLabel?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Secondary glass action — a translucent pill button used across the app. */
export function GlassButton({ label, icon, onPress, compact, style, tint, accessibilityLabel }: Props) {
  const t = useTheme();
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: t.animations ? withSpring(1 - pressed.value * 0.06, t.spring.snappy) : 1 }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? icon}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={[
        styles.wrap,
        {
          borderRadius: t.radius.pill,
          borderColor: t.colors.glassBorder,
          paddingHorizontal: compact ? t.spacing.md : t.spacing.xl,
          height: compact ? 44 : 52,
        },
        animStyle,
        style,
      ]}
    >
      {t.glass ? (
        <BlurView intensity={30} tint={t.colors.blurTint} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.glass }]} />
      <View style={styles.row}>
        {icon ? (
          <Icon
            name={icon}
            size={18}
            color={tint ?? t.colors.text}
            style={{ marginRight: label ? 8 : 0 }}
          />
        ) : null}
        {label ? (
          <AppText variant="callout" weight="semibold" color={tint ?? t.colors.text}>
            {label}
          </AppText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
