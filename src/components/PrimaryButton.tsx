import React from 'react';
import { Pressable, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '@/services/haptics';

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** 'car' uses the green car gradient, 'primary' the blue brand gradient. */
  variant?: 'primary' | 'car';
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The large call-to-action. Scales & dims slightly on press, with a soft glow
 * that intensifies on touch, and fires a medium haptic. This is the button the
 * whole app revolves around, so its feedback is deliberately tactile.
 */
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  loading,
  variant = 'primary',
  style,
}: Props) {
  const t = useTheme();
  const pressed = useSharedValue(0);

  const gradient = variant === 'car' ? t.colors.carGradient : t.colors.primaryGradient;
  const glow = variant === 'car' ? t.colors.car : t.colors.primary;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: t.animations ? withSpring(1 - pressed.value * 0.04, t.spring.snappy) : 1 }],
    shadowOpacity: withTiming(0.22 + pressed.value * 0.12),
    shadowRadius: withTiming(10 + pressed.value * 4),
  }));

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      style={[
        styles.wrap,
        { borderRadius: t.radius.pill, shadowColor: glow, opacity: isDisabled ? 0.55 : 1 },
        animStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: t.radius.pill }]}
      >
        {loading ? (
          <ActivityIndicator color={t.colors.onPrimary} />
        ) : (
          <View style={styles.row}>
            {icon ? (
              <Icon name={icon} size={20} color={t.colors.onPrimary} style={{ marginRight: 10 }} />
            ) : null}
            <AppText variant="callout" weight="bold" color={t.colors.onPrimary}>
              {label}
            </AppText>
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  gradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
