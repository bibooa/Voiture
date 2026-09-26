import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import {
  ScreenContainer,
  GlassCard,
  AppText,
  AccuracyBadge,
  EmptyState,
  GlassButton,
  ActionSheet,
  type ActionSheetOption,
  PromptModal,
} from '@/components';
import { useTheme } from '@/theme';
import { useCarStore } from '@/store/carStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { formatHistoryDate } from '@/utils/time';
import { formatAccuracy } from '@/utils/geo';
import { openWalkingDirections } from '@/services/navigation';
import type { ParkedLocation } from '@/types';
import { haptics } from '@/services/haptics';

export default function HistoryScreen() {
  const t = useTheme();
  const router = useRouter();

  const history = useCarStore((s) => s.history);
  const currentId = useCarStore((s) => s.current?.id);
  const setCurrent = useCarStore((s) => s.setCurrent);
  const rename = useCarStore((s) => s.rename);
  const remove = useCarStore((s) => s.remove);
  const clearHistory = useCarStore((s) => s.clearHistory);
  const addFavorite = useFavoritesStore((s) => s.add);

  const [selected, setSelected] = useState<ParkedLocation | null>(null);
  const [renaming, setRenaming] = useState<ParkedLocation | null>(null);

  const confirmDelete = (item: ParkedLocation) => {
    Alert.alert('Supprimer cette position ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove(item.id) },
    ]);
  };

  const confirmClearAll = () => {
    haptics.warning();
    Alert.alert(
      'Supprimer toutes les positions',
      'Tout votre historique sera définitivement effacé. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Tout supprimer', style: 'destructive', onPress: () => clearHistory() },
      ]
    );
  };

  const options: ActionSheetOption[] = selected
    ? [
        {
          label: 'Voir sur la carte',
          icon: 'map-outline',
          onPress: () => {
            setCurrent(selected.id);
            router.push('/');
          },
        },
        {
          label: 'Me guider',
          icon: 'navigate-outline',
          onPress: () => openWalkingDirections(selected.latitude, selected.longitude, selected.label ?? 'Ma voiture'),
        },
        {
          label: 'Ajouter aux favoris',
          icon: 'star-outline',
          onPress: () =>
            addFavorite({
              name: selected.label ?? 'Lieu enregistré',
              icon: '📍',
              latitude: selected.latitude,
              longitude: selected.longitude,
              address: selected.address ?? null,
            }),
        },
        { label: 'Renommer', icon: 'create-outline', onPress: () => setRenaming(selected) },
        { label: 'Supprimer', icon: 'trash-outline', destructive: true, onPress: () => confirmDelete(selected) },
      ]
    : [];

  return (
    <ScreenContainer
      title="Historique"
      subtitle={history.length > 0 ? `${history.length} position${history.length > 1 ? 's' : ''} enregistrée${history.length > 1 ? 's' : ''}` : undefined}
      headerRight={
        history.length > 0 ? (
          <Pressable onPress={confirmClearAll} accessibilityLabel="Tout supprimer" hitSlop={10}>
            <Ionicons name="trash-outline" size={22} color={t.colors.danger} />
          </Pressable>
        ) : undefined
      }
    >
      {history.length === 0 ? (
        <EmptyState
          icon="🅿️"
          title="Aucun historique"
          message="Les emplacements que vous enregistrez apparaîtront ici, du plus récent au plus ancien."
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130, paddingTop: 4 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(360)} layout={LinearTransition}>
              <Pressable
                onPress={() => {
                  haptics.light();
                  setSelected(item);
                }}
              >
                <GlassCard style={{ marginBottom: 12 }}>
                  <View style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
                      <AppText variant="title">🚗</AppText>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={styles.titleRow}>
                        <AppText variant="callout" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                          {item.label ?? item.address ?? 'Position enregistrée'}
                        </AppText>
                        {item.id === currentId ? (
                          <View style={[styles.badge, { backgroundColor: t.colors.primary + '22', borderColor: t.colors.primary + '55' }]}>
                            <AppText variant="label" color={t.colors.primary} style={{ fontSize: 9 }}>
                              Actuelle
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                      <AppText variant="caption" tone="secondary" style={{ marginTop: 3 }}>
                        {formatHistoryDate(item.savedAt)}
                      </AppText>
                      <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        Précision : {formatAccuracy(item.accuracy)}
                      </AppText>
                    </View>
                    <Ionicons name="ellipsis-horizontal" size={20} color={t.colors.textMuted} />
                  </View>
                </GlassCard>
              </Pressable>
            </Animated.View>
          )}
          ListFooterComponent={
            history.length > 1 ? (
              <GlassButton
                label="Supprimer toutes les positions"
                icon="🗑️"
                onPress={confirmClearAll}
                style={{ marginTop: 8 }}
                tint={t.colors.danger}
              />
            ) : null
          }
        />
      )}

      <ActionSheet
        visible={!!selected}
        title={selected?.label ?? selected?.address ?? 'Position enregistrée'}
        subtitle={selected ? formatHistoryDate(selected.savedAt) : undefined}
        options={options}
        onClose={() => setSelected(null)}
      />

      <PromptModal
        visible={!!renaming}
        title="Renommer la position"
        placeholder="Ex. Parking Centre-ville"
        initialValue={renaming?.label ?? ''}
        onCancel={() => setRenaming(null)}
        onConfirm={(value) => {
          if (renaming && value) rename(renaming.id, value);
          setRenaming(null);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
