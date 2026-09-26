import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { pickScale } from '@/location/scale';

/** Minimal map scale bar (Google Maps has none in react-native-maps). */
export function ScaleBar({ metersPerPoint }: { metersPerPoint: number }) {
  const s = pickScale(metersPerPoint);
  if (!s) return null;
  const label = s.meters >= 1000 ? `${s.meters / 1000} km` : `${s.meters} m`;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.bar, { width: s.width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  label: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  bar: {
    height: 4,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
});
