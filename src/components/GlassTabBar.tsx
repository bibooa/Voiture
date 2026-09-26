import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { haptics } from '@/services/haptics';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { on: 'car-sport', off: 'car-sport-outline', label: 'Accueil' },
  find: { on: 'navigate', off: 'navigate-outline', label: 'Retrouver' },
  history: { on: 'time', off: 'time-outline', label: 'Historique' },
  favorites: { on: 'star', off: 'star-outline', label: 'Favoris' },
  settings: { on: 'settings', off: 'settings-outline', label: 'Réglages' },
};

/**
 * Floating glass tab bar. Each tab springs up slightly and lights up when
 * active; the whole bar sits on a blurred, rounded surface above the safe area.
 */
export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || t.spacing.md }]} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          { borderColor: t.colors.glassBorder, borderRadius: t.radius.pill, shadowColor: t.colors.shadow },
        ]}
      >
        {t.glass ? (
          <BlurView intensity={55} tint={t.colors.blurTint} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.cardScrimStrong }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.glassStrong }]} />

        {state.routes.map((route, i) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          const focused = state.index === i;

          const onPress = () => {
            haptics.selection();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return <TabItem key={route.key} focused={focused} meta={meta} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

function TabItem({
  focused,
  meta,
  onPress,
}: {
  focused: boolean;
  meta: { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string };
  onPress: () => void;
}) {
  const t = useTheme();
  const lift = useSharedValue(focused ? 1 : 0);
  // In an effect, never during render (Reanimated strict mode warns otherwise).
  useEffect(() => {
    lift.value = t.animations ? withSpring(focused ? 1 : 0, t.spring.snappy) : focused ? 1 : 0;
  }, [focused, lift, t.animations, t.spring.snappy]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 2 }, { scale: 1 + lift.value * 0.08 }],
  }));

  return (
    <Pressable style={styles.item} onPress={onPress} accessibilityRole="button" accessibilityLabel={meta.label}>
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? meta.on : meta.off}
          size={24}
          color={focused ? t.colors.primary : t.colors.textMuted}
        />
      </Animated.View>
      <AppText
        variant="label"
        style={{ fontSize: 9, marginTop: 3, letterSpacing: 0.2 }}
        color={focused ? t.colors.primary : t.colors.textMuted}
      >
        {meta.label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 460,
    height: 66,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
});
