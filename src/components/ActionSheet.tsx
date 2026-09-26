import React from 'react';
import { Modal, View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { GlassCard } from './GlassCard';
import { haptics } from '@/services/haptics';

export type ActionSheetOption = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  options: ActionSheetOption[];
  onClose: () => void;
};

/** A premium glass bottom sheet of actions — cross-platform, keyboard-free. */
export function ActionSheet({ visible, title, subtitle, options, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
        <BlurView intensity={25} tint={t.colors.blurTint} style={StyleSheet.absoluteFill} />
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: '#00000055' }]} onPress={onClose} />
      </Animated.View>

      <View style={styles.wrap} pointerEvents="box-none">
        <Animated.View entering={SlideInDown.duration(260)} style={{ paddingBottom: insets.bottom + 12 }}>
          <GlassCard strong padded={false} style={styles.card}>
            {title ? (
              <View style={[styles.head, { borderBottomColor: t.colors.glassBorder }]}>
                <AppText variant="callout" weight="bold" center>
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText variant="caption" tone="secondary" center style={{ marginTop: 2 }}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
            ) : null}
            {options.map((o, i) => (
              <Pressable
                key={i}
                style={[
                  styles.option,
                  { borderBottomColor: t.colors.glassBorder, borderBottomWidth: i === options.length - 1 ? 0 : StyleSheet.hairlineWidth },
                ]}
                onPress={() => {
                  haptics.light();
                  onClose();
                  o.onPress();
                }}
              >
                {o.icon ? (
                  <Ionicons
                    name={o.icon}
                    size={20}
                    color={o.destructive ? t.colors.danger : t.colors.text}
                    style={{ marginRight: 14 }}
                  />
                ) : null}
                <AppText variant="callout" weight="medium" color={o.destructive ? t.colors.danger : undefined}>
                  {o.label}
                </AppText>
              </Pressable>
            ))}
          </GlassCard>

          <Pressable onPress={onClose} style={{ marginTop: 10 }}>
            <GlassCard strong style={styles.cancel}>
              <AppText variant="callout" weight="bold" center>
                Annuler
              </AppText>
            </GlassCard>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
  card: {},
  head: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 17, paddingHorizontal: 20 },
  cancel: { paddingVertical: 16 },
});
