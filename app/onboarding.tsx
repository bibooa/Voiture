import React, { useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { AmbientBackground, AppText, GlassCard, PrimaryButton, GlassButton, Pulse } from '@/components';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { useLocationStore } from '@/store/locationStore';
import { haptics } from '@/services/haptics';

const SLIDES = [
  {
    icon: '🚗',
    title: 'Ne perdez plus jamais votre voiture.',
    body: 'Garée mémorise l\'endroit exact où vous vous garez, en un seul geste.',
  },
  {
    icon: '📍',
    title: 'Enregistrez votre position en un clic.',
    body: 'Un appui, une position GPS stabilisée et fiable, enregistrée sur votre téléphone.',
  },
  {
    icon: '🧭',
    title: 'Retrouvez-la facilement grâce à votre GPS.',
    body: 'Distance, direction et guidage vous ramènent à votre voiture sans effort.',
  },
];

export default function Onboarding() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const requestPermission = useLocationStore((s) => s.requestPermission);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) {
      setIndex(i);
      haptics.selection();
    }
  };

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    }
  };

  const finish = async () => {
    await requestPermission(); // friendly ask; app still works if declined
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <AmbientBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.skipRow}>
          <GlassButton
            label="Passer"
            compact
            onPress={() => {
              completeOnboarding();
              router.replace('/(tabs)');
            }}
          />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          style={{ flex: 1 }}
        >
          {SLIDES.map((s, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              <View style={styles.illustration}>
                <Pulse color={t.colors.primary} size={230} rings={2} />
                <Animated.View
                  entering={FadeIn.duration(500)}
                  style={[styles.iconBubble, { borderColor: t.colors.glassBorder, backgroundColor: t.colors.glassStrong }]}
                >
                  <AppText style={{ fontSize: 76 }}>{s.icon}</AppText>
                </Animated.View>
              </View>
              <Animated.View entering={FadeInUp.delay(120).duration(500)} style={styles.copy}>
                <AppText variant="display" center>
                  {s.title}
                </AppText>
                <AppText variant="callout" tone="secondary" center style={{ marginTop: 14 }}>
                  {s.body}
                </AppText>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + t.spacing.xl }]}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? t.colors.primary : t.colors.glassBorder,
                    width: i === index ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {isLast ? (
            <Animated.View entering={FadeInUp.duration(400)}>
              <GlassCard padded style={{ marginBottom: t.spacing.lg }}>
                <AppText variant="callout" weight="semibold">
                  🔒 Confidentialité d'abord
                </AppText>
                <AppText variant="body" tone="secondary" style={{ marginTop: 6 }}>
                  Votre position n'est utilisée qu'au moment où vous enregistrez ou retrouvez votre
                  voiture, et reste stockée uniquement sur votre téléphone. Rien n'est envoyé sur un
                  serveur.
                </AppText>
              </GlassCard>
              <PrimaryButton label="Autoriser la localisation" icon="📍" onPress={finish} />
            </Animated.View>
          ) : (
            <PrimaryButton label="Continuer" onPress={goNext} />
          )}
        </View>
      </View>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 20, height: 44, justifyContent: 'center' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  illustration: { height: 260, alignItems: 'center', justifyContent: 'center' },
  iconBubble: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  copy: { marginTop: 12 },
  footer: { paddingHorizontal: 24 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
});
