import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, FlatList, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeInUp, LinearTransition } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import {
  ScreenContainer,
  GlassCard,
  AppText,
  EmptyState,
  PrimaryButton,
  GlassButton,
  ActionSheet,
  type ActionSheetOption,
} from '@/components';
import { useTheme } from '@/theme';
import { useFavoritesStore, FAVORITE_PRESETS } from '@/store/favoritesStore';
import { useLocationStore } from '@/store/locationStore';
import { reverseGeocode } from '@/services/location';
import { openWalkingDirections } from '@/services/navigation';
import type { Favorite } from '@/types';
import { haptics } from '@/services/haptics';

export default function FavoritesScreen() {
  const t = useTheme();
  const favorites = useFavoritesStore((s) => s.favorites);
  const add = useFavoritesStore((s) => s.add);
  const update = useFavoritesStore((s) => s.update);
  const remove = useFavoritesStore((s) => s.remove);
  const fix = useLocationStore((s) => s.fix);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Favorite | null>(null);
  const [selected, setSelected] = useState<Favorite | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📍');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    if (!fix) {
      Alert.alert(
        'Position indisponible',
        'Nous avons besoin de votre position actuelle pour créer un favori. Ouvrez la carte pour activer la localisation.'
      );
      return;
    }
    setEditing(null);
    setName('');
    setIcon('📍');
    setEditorOpen(true);
  };

  const openEdit = (fav: Favorite) => {
    setEditing(fav);
    setName(fav.name);
    setIcon(fav.icon);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const finalName = name.trim() || 'Favori';
    if (editing) {
      update(editing.id, { name: finalName, icon });
      setEditorOpen(false);
      return;
    }
    if (!fix) return;
    setSaving(true);
    const address = await reverseGeocode(fix.latitude, fix.longitude);
    add({ name: finalName, icon, latitude: fix.latitude, longitude: fix.longitude, address });
    setSaving(false);
    setEditorOpen(false);
    haptics.success();
  };

  const confirmDelete = (fav: Favorite) => {
    Alert.alert('Supprimer ce favori ?', `« ${fav.name} » sera supprimé.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove(fav.id) },
    ]);
  };

  const options: ActionSheetOption[] = selected
    ? [
        {
          label: 'Me guider',
          icon: 'navigate-outline',
          onPress: () => openWalkingDirections(selected.latitude, selected.longitude, selected.name),
        },
        { label: 'Modifier', icon: 'create-outline', onPress: () => openEdit(selected) },
        { label: 'Supprimer', icon: 'trash-outline', destructive: true, onPress: () => confirmDelete(selected) },
      ]
    : [];

  return (
    <ScreenContainer
      title="Favoris"
      subtitle="Vos lieux enregistrés"
      headerRight={
        <Pressable onPress={openCreate} accessibilityLabel="Ajouter un favori" hitSlop={10}>
          <View style={[styles.addBtn, { backgroundColor: t.colors.primary }]}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
        </Pressable>
      }
    >
      {favorites.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="Aucun favori"
          message="Enregistrez vos lieux habituels — maison, travail, supermarché — pour les retrouver en un geste."
          action={<PrimaryButton label="Ajouter un favori" icon="＋" onPress={openCreate} />}
        />
      ) : (
        <FlatList
          data={favorites}
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
                      <AppText variant="title">{item.icon}</AppText>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <AppText variant="callout" weight="bold" numberOfLines={1}>
                        {item.name}
                      </AppText>
                      {item.address ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 3 }}>
                          {item.address}
                        </AppText>
                      ) : null}
                    </View>
                    <Ionicons name="ellipsis-horizontal" size={20} color={t.colors.textMuted} />
                  </View>
                </GlassCard>
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      <ActionSheet
        visible={!!selected}
        title={selected?.name}
        subtitle={selected?.address ?? undefined}
        options={options}
        onClose={() => setSelected(null)}
      />

      {/* Editor modal */}
      <Modal visible={editorOpen} transparent animationType="none" onRequestClose={() => setEditorOpen(false)} statusBarTranslucent>
        <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
          <BlurView intensity={30} tint={t.colors.blurTint} style={StyleSheet.absoluteFill} />
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: '#00000066' }]} onPress={() => setEditorOpen(false)} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center} pointerEvents="box-none">
          <Animated.View entering={FadeInUp.duration(240)}>
            <GlassCard strong>
              <AppText variant="headline">{editing ? 'Modifier le favori' : 'Nouveau favori'}</AppText>
              <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                {editing ? 'Renommez ce lieu.' : 'Enregistré à votre position actuelle.'}
              </AppText>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nom du lieu"
                placeholderTextColor={t.colors.textMuted}
                style={[styles.input, { color: t.colors.text, backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}
              />

              <View style={styles.presetGrid}>
                {FAVORITE_PRESETS.map((p) => {
                  const active = p.icon === icon;
                  return (
                    <Pressable
                      key={p.name}
                      onPress={() => {
                        haptics.selection();
                        setIcon(p.icon);
                        if (!name.trim()) setName(p.name);
                      }}
                      style={[
                        styles.preset,
                        {
                          backgroundColor: active ? t.colors.primary + '22' : t.colors.glass,
                          borderColor: active ? t.colors.primary : t.colors.glassBorder,
                        },
                      ]}
                    >
                      <AppText variant="headline">{p.icon}</AppText>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.editorActions}>
                <Pressable style={styles.cancel} onPress={() => setEditorOpen(false)}>
                  <AppText variant="callout" tone="secondary" weight="semibold">
                    Annuler
                  </AppText>
                </Pressable>
                <PrimaryButton label={editing ? 'Enregistrer' : 'Créer le favori'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </GlassCard>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  input: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  preset: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  editorActions: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12 },
  cancel: { paddingHorizontal: 8, paddingVertical: 12 },
});
