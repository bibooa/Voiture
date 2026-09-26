import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useColorScheme } from 'react-native';

import { ThemeProvider } from '@/theme';
import { darkPalette, lightPalette } from '@/theme/palette';
import { useSettingsStore } from '@/store/settingsStore';
import { useCarStore } from '@/store/carStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useLocationStore } from '@/store/locationStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateCar = useCarStore((s) => s.hydrate);
  const hydrateFavorites = useFavoritesStore((s) => s.hydrate);
  const refreshStatus = useLocationStore((s) => s.refreshStatus);

  useEffect(() => {
    (async () => {
      await Promise.all([hydrateSettings(), hydrateCar(), hydrateFavorites()]);
      refreshStatus().catch(() => {});
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    })();
  }, [hydrateSettings, hydrateCar, hydrateFavorites, refreshStatus]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedChrome />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="privacy" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Keeps the OS status bar and root background in sync with the resolved theme. */
function ThemedChrome() {
  const system = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const isDark = themeMode === 'auto' ? system !== 'light' : themeMode === 'dark';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? darkPalette.background : lightPalette.background).catch(
      () => {}
    );
  }, [isDark]);

  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
