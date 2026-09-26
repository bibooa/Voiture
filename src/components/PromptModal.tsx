import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { GlassCard } from './GlassCard';
import { PrimaryButton } from './PrimaryButton';
import { haptics } from '@/services/haptics';

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

/** Cross-platform single-field prompt on a blurred glass sheet. */
export function PromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  confirmLabel = 'Enregistrer',
  onCancel,
  onConfirm,
}: Props) {
  const t = useTheme();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
        <BlurView intensity={30} tint={t.colors.blurTint} style={StyleSheet.absoluteFill} />
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: '#00000066' }]} onPress={onCancel} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
        pointerEvents="box-none"
      >
        <Animated.View entering={FadeInDown.duration(220)} style={styles.sheet}>
          <GlassCard strong>
            <AppText variant="headline">{title}</AppText>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={t.colors.textMuted}
              autoFocus
              style={[
                styles.input,
                {
                  color: t.colors.text,
                  backgroundColor: t.colors.glass,
                  borderColor: t.colors.glassBorder,
                },
              ]}
            />
            <View style={styles.row}>
              <Pressable style={styles.cancel} onPress={onCancel}>
                <AppText variant="callout" tone="secondary" weight="semibold">
                  Annuler
                </AppText>
              </Pressable>
              <PrimaryButton
                label={confirmLabel}
                onPress={() => {
                  haptics.success();
                  onConfirm(value.trim());
                }}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  sheet: {},
  input: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  cancel: { paddingHorizontal: 8, paddingVertical: 12 },
});
