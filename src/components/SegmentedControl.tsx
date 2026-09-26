import React from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { haptics } from '@/services/haptics';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** An animated segmented control with a sliding glass thumb. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const t = useTheme();
  const [width, setWidth] = React.useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segWidth = width > 0 ? (width - 6) / options.length : 0;
  const x = useSharedValue(0);

  React.useEffect(() => {
    x.value = t.animations ? withSpring(index * segWidth, t.spring.snappy) : index * segWidth;
  }, [index, segWidth, x, t.animations, t.spring.snappy]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: segWidth,
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={[styles.track, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}
    >
      {segWidth > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: t.colors.glassStrong, borderColor: t.colors.glassBorder },
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={styles.segment}
            onPress={() => {
              haptics.selection();
              onChange(o.value);
            }}
          >
            <AppText
              variant="caption"
              weight={active ? 'bold' : 'medium'}
              tone={active ? 'primary' : 'secondary'}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9 },
});
