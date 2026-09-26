import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

/**
 * Custom map markers rendered as children of react-native-maps <Marker>.
 *
 * These are intentionally static (no per-frame animation) so the map can flag
 * `tracksViewChanges={false}` after first paint — the standard technique for
 * keeping custom markers smooth on Android. The premium feel comes from the
 * gradient body, glowing halo and crisp shadow rather than motion here.
 */

export function CarMarker() {
  const t = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.halo, { backgroundColor: t.colors.car + '33' }]} />
      <LinearGradient
        colors={t.colors.carGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.pin, { shadowColor: t.colors.car, borderColor: '#FFFFFFAA' }]}
      >
        <AppText variant="headline">🚗</AppText>
      </LinearGradient>
      <View style={[styles.stem, { backgroundColor: t.colors.car }]} />
    </View>
  );
}

export function UserMarker() {
  const t = useTheme();
  return (
    <View style={styles.dotContainer}>
      <View style={[styles.dotHalo, { backgroundColor: t.colors.primary + '2E' }]} />
      <View
        style={[
          styles.dot,
          { backgroundColor: t.colors.primary, borderColor: '#FFFFFF', shadowColor: t.colors.primary },
        ]}
      />
    </View>
  );
}

export function FavoriteMarker({ icon }: { icon: string }) {
  const t = useTheme();
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.favPin,
          { backgroundColor: t.colors.glassStrong, borderColor: t.colors.glassBorder },
        ]}
      >
        <AppText variant="callout">{icon}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', width: 72, height: 80 },
  halo: { position: 'absolute', top: 6, width: 64, height: 64, borderRadius: 32 },
  pin: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  stem: {
    width: 4,
    height: 10,
    borderRadius: 2,
    marginTop: -2,
    opacity: 0.9,
  },
  dotContainer: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  dotHalo: { position: 'absolute', width: 40, height: 40, borderRadius: 20 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  favPin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
