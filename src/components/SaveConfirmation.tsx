import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Pulse } from './Pulse';
import { formatAccuracy } from '@/utils/geo';
import { haptics } from '@/services/haptics';

type Props = {
  visible: boolean;
  accuracy: number | null;
  address?: string | null;
  onDone: () => void;
};

/**
 * Full-screen success animation shown right after a car is saved: a spring-in
 * checkmark with a radar pulse and the honest accuracy figure, then it hands
 * control back to the map. Kept short (~2s) per the "fast & fluid" brief.
 */
export function SaveConfirmation({ visible, accuracy, address, onDone }: Props) {
  const t = useTheme();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    haptics.success();
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, t.spring.bouncy);

    const finish = () => {
      opacity.value = withTiming(0, { duration: 260 }, (done) => {
        if (done) runOnJS(onDone)();
      });
    };
    // Auto-dismiss after the moment lands.
    scale.value = withDelay(
      1600,
      withTiming(1, { duration: 10, easing: Easing.linear }, (done) => {
        if (done) runOnJS(finish)();
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
      <BlurView intensity={40} tint={t.colors.blurTint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.background + 'AA' }]} />

      <Animated.View style={[styles.center, badgeStyle]}>
        <View style={styles.pulseWrap}>
          <Pulse color={t.colors.car} size={180} rings={2} />
          <LinearGradient
            colors={t.colors.carGradient}
            style={styles.check}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="checkmark" size={56} color="#fff" />
          </LinearGradient>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(250)} style={styles.textBlock}>
        <AppText variant="title" center>
          Voiture enregistrée
        </AppText>
        <AppText variant="callout" tone="secondary" center style={{ marginTop: 8 }}>
          Position enregistrée avec une précision de {formatAccuracy(accuracy)}
        </AppText>
        {address ? (
          <AppText variant="body" tone="muted" center style={{ marginTop: 6 }}>
            {address}
          </AppText>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  center: { alignItems: 'center', justifyContent: 'center' },
  pulseWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  textBlock: { position: 'absolute', bottom: '26%', paddingHorizontal: 32 },
});
