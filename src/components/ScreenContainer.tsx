import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from './AmbientBackground';
import { AppText } from './AppText';
import { useTheme } from '@/theme';

type Props = {
  title?: string;
  subtitle?: string;
  /** Right-aligned header accessory (e.g. an action button). */
  headerRight?: React.ReactNode;
  /** Remove default horizontal padding (for full-bleed content like maps). */
  bleed?: boolean;
  scroll?: boolean;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

/**
 * Standard screen chrome: ambient gradient backdrop, safe-area handling and an
 * optional large title header. Used by every non-map screen for consistency.
 */
export function ScreenContainer({ title, subtitle, headerRight, bleed, children, contentStyle }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <AmbientBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {title ? (
          <View
            style={[
              styles.header,
              { paddingHorizontal: bleed ? 0 : t.spacing.xl, paddingBottom: t.spacing.md },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="display">{title}</AppText>
              {subtitle ? (
                <AppText variant="body" tone="secondary" style={{ marginTop: 2 }}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            {headerRight}
          </View>
        ) : null}
        <View
          style={[
            { flex: 1, paddingHorizontal: bleed ? 0 : t.spacing.xl },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
});
