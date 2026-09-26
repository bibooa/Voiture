import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { GlassCard } from './GlassCard';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { GlassButton } from './GlassButton';
import { qualityColor } from './GpsBadge';
import { QUALITY_META, formatAccuracy } from '@/location/quality';
import type { StabilizationProgress, StabilizationResult } from '@/services/location';

type Props = {
  phase: 'acquiring' | 'review';
  progress: StabilizationProgress | null;
  result: StabilizationResult | null;
  onCancel: () => void;
  onRetry: () => void;
  onSaveAnyway: () => void;
};

/**
 * Full-screen stabilisation flow. While acquiring it shows the honest, live
 * estimate converging; if the final fix is still imprecise it explains why and
 * lets the user wait again or save anyway — never silently saving a bad fix.
 */
export function StabilizationOverlay({ phase, progress, result, onCancel, onRetry, onSaveAnyway }: Props) {
  const t = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: t.colors.background + 'F2' }]}
    >
      <View style={styles.content}>
        {phase === 'acquiring' ? (
          <Acquiring progress={progress} onCancel={onCancel} />
        ) : result ? (
          <Review result={result} onRetry={onRetry} onSaveAnyway={onSaveAnyway} onCancel={onCancel} />
        ) : null}
      </View>
    </Animated.View>
  );
}

function Spinner({ color }: { color: string }) {
  const t = useTheme();
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <View style={styles.spinnerWrap}>
      <View style={[styles.spinnerTrack, { borderColor: t.colors.glassBorder }]} />
      <Animated.View style={[styles.spinnerArc, { borderTopColor: color }, style]} />
      <Icon name="locate" size={26} color={color} />
    </View>
  );
}

function Acquiring({ progress, onCancel }: { progress: StabilizationProgress | null; onCancel: () => void }) {
  const t = useTheme();
  const est = progress?.estimate ?? null;
  const q = est?.quality ?? 'unknown';
  const color = est ? qualityColor(t, q) : t.colors.primary;
  const fraction = progress
    ? Math.min(1, Math.max(progress.usable / progress.target, progress.elapsedMs / progress.maxDurationMs))
    : 0;

  return (
    <>
      <Spinner color={color} />
      <AppText variant="title" center style={{ marginTop: 24 }}>
        Stabilisation de la position
      </AppText>
      <AppText variant="body" tone="secondary" center style={{ marginTop: 6 }}>
        Restez immobile quelques secondes.
      </AppText>

      <GlassCard strong style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <AppText variant="label" tone="muted">
              Précision actuelle
            </AppText>
            <AppText variant="display" weight="bold" color={est ? color : t.colors.textMuted} style={{ marginTop: 2 }}>
              {est ? formatAccuracy(est.accuracy) : '—'}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="label" color={est ? color : t.colors.textMuted}>
              {est ? QUALITY_META[q].short : 'RECHERCHE…'}
            </AppText>
            <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
              {progress?.usable ?? 0} mesure{(progress?.usable ?? 0) > 1 ? 's' : ''}
              {est && est.rejected > 0 ? ` · ${est.rejected} écartée${est.rejected > 1 ? 's' : ''}` : ''}
            </AppText>
          </View>
        </View>

        <View style={[styles.bar, { backgroundColor: t.colors.glass }]}>
          <View style={[styles.barFill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: color }]} />
        </View>

        {est?.moving ? (
          <View style={styles.hint}>
            <Icon name="walk" size={15} color={t.colors.warning} />
            <AppText variant="caption" color={t.colors.warning} style={{ marginLeft: 6, flex: 1 }}>
              Vous semblez en mouvement : arrêtez-vous pour une position fiable.
            </AppText>
          </View>
        ) : !est ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Recherche des satellites… Cela peut prendre plus de temps à l’intérieur.
          </AppText>
        ) : null}
      </GlassCard>

      <Pressable onPress={onCancel} style={styles.textBtn} hitSlop={8}>
        <AppText variant="callout" tone="secondary" weight="semibold">
          Annuler
        </AppText>
      </Pressable>
    </>
  );
}

function Review({
  result,
  onRetry,
  onSaveAnyway,
  onCancel,
}: {
  result: StabilizationResult;
  onRetry: () => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  const { fix } = result;
  const color = qualityColor(t, fix.quality);

  return (
    <>
      <View style={[styles.warnIcon, { backgroundColor: t.colors.warning + '1F', borderColor: t.colors.warning + '55' }]}>
        <Icon name={fix.moving ? 'walk' : 'pin'} size={28} color={t.colors.warning} />
      </View>
      <AppText variant="title" center style={{ marginTop: 18 }}>
        {fix.moving ? 'Vous semblez en mouvement' : 'Position encore imprécise'}
      </AppText>
      <AppText variant="body" tone="secondary" center style={{ marginTop: 6, maxWidth: 320 }}>
        Restez immobile quelques secondes pour améliorer la précision.
      </AppText>

      <GlassCard strong style={styles.card}>
        <View style={styles.rowBetween}>
          <AppText variant="callout" tone="secondary">
            Précision obtenue
          </AppText>
          <AppText variant="headline" weight="bold" color={color}>
            {formatAccuracy(fix.accuracy)}
          </AppText>
        </View>
        <View style={[styles.rowBetween, { marginTop: 6 }]}>
          <AppText variant="caption" tone="muted">
            {fix.used} mesure{fix.used > 1 ? 's' : ''} utilisée{fix.used > 1 ? 's' : ''}
            {fix.rejected ? ` · ${fix.rejected} écartée${fix.rejected > 1 ? 's' : ''}` : ''}
          </AppText>
          <AppText variant="label" color={color}>
            {QUALITY_META[fix.quality].short}
          </AppText>
        </View>
        <View style={[styles.sep, { backgroundColor: t.colors.glassBorder }]} />
        <AppText variant="caption" tone="secondary" style={{ lineHeight: 18 }}>
          Les bâtiments, parkings couverts, arbres ou un ciel masqué réduisent la précision. Si
          possible, rapprochez-vous d’un espace dégagé.
        </AppText>
      </GlassCard>

      <View style={styles.actions}>
        <PrimaryButton label="Réessayer" icon="locate" onPress={onRetry} />
        <GlassButton label="Continuer malgré tout" onPress={onSaveAnyway} style={{ marginTop: 10 }} />
        <Pressable onPress={onCancel} style={styles.textBtn} hitSlop={8}>
          <AppText variant="callout" tone="secondary" weight="semibold">
            Annuler
          </AppText>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 90, justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 24 },
  spinnerWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  spinnerTrack: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 3 },
  spinnerArc: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  card: { marginTop: 24, width: '100%', maxWidth: 420 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { height: 6, borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  hint: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  warnIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  actions: { width: '100%', maxWidth: 420, marginTop: 20 },
  textBtn: { alignSelf: 'center', paddingVertical: 14, marginTop: 6 },
});
