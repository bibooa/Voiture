import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';

/**
 * Background for non-map screens: a quiet vertical gradient. No floating orbs
 * or decorative glow — the content carries the screen.
 */
export function AmbientBackground({ children }: { children?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      <LinearGradient
        colors={t.colors.backdropGradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
