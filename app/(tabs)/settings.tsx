import React from 'react';
import { View, StyleSheet, Alert, ScrollView, Share, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  ScreenContainer,
  GlassCard,
  AppText,
  SettingsRow,
  Toggle,
  SegmentedControl,
} from '@/components';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { useCarStore } from '@/store/carStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useLocationStore } from '@/store/locationStore';
import { clearAllData } from '@/services/storage';
import { requestNotificationPermission, cancelAllReminders } from '@/services/notifications';
import { haptics } from '@/services/haptics';
import type { ThemeMode, MapType } from '@/types';

function Group({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(360)} style={{ marginBottom: t.spacing.xl }}>
      <AppText variant="label" tone="muted" style={{ marginBottom: 10, marginLeft: 6 }}>
        {title}
      </AppText>
      <GlassCard padded={false} style={{ paddingHorizontal: t.spacing.lg }}>
        {children}
      </GlassCard>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const s = useSettingsStore();
  const history = useCarStore((st) => st.history);
  const favorites = useFavoritesStore((st) => st.favorites);
  const clearHistory = useCarStore((st) => st.clearHistory);
  const permission = useLocationStore((st) => st.permission);

  const onToggleReminders = async (value: boolean) => {
    if (value) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert(
          'Notifications désactivées',
          "Autorisez les notifications dans les réglages de votre téléphone pour recevoir des rappels."
        );
        return;
      }
    } else {
      cancelAllReminders();
    }
    s.set('parkingReminders', value);
  };

  const exportData = async () => {
    const payload = {
      app: 'Garée',
      exportedAt: new Date().toISOString(),
      history,
      favorites,
    };
    try {
      await Share.share({ message: JSON.stringify(payload, null, 2) });
    } catch {
      /* user dismissed */
    }
  };

  const deletePositions = () => {
    haptics.warning();
    Alert.alert('Supprimer les positions', 'Tout votre historique de stationnement sera effacé.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => clearHistory() },
    ]);
  };

  const deleteEverything = () => {
    haptics.warning();
    Alert.alert(
      'Supprimer toutes les données',
      'Positions, favoris et préférences seront définitivement supprimés de cet appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            useCarStore.getState().clearHistory();
            useFavoritesStore.setState({ favorites: [] });
            s.reset();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer title="Réglages">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130, paddingTop: 4 }}>
        {/* Localisation */}
        <Group title="Localisation" delay={0}>
          <SettingsRow
            icon="🎯"
            label="Haute précision"
            description="Utilise le GPS/GNSS au maximum pour une position plus fiable."
            right={<Toggle value={s.highAccuracy} onValueChange={(v) => s.set('highAccuracy', v)} />}
          />
          <SettingsRow
            icon="🔐"
            label="Autorisation de localisation"
            description={
              permission === 'granted'
                ? 'Autorisée (pendant l\'utilisation)'
                : permission === 'denied'
                ? 'Refusée — appuyez pour ouvrir les réglages'
                : 'Non déterminée'
            }
            onPress={() => Linking.openSettings()}
            last
          />
        </Group>

        {/* Carte */}
        <Group title="Carte" delay={60}>
          <SettingsRow
            icon="🗺️"
            label="Type de carte"
            right={
              <View style={{ width: 200 }}>
                <SegmentedControl<MapType>
                  value={s.mapType}
                  onChange={(v) => s.setMapType(v)}
                  options={[
                    { value: 'standard', label: 'Plan' },
                    { value: 'satellite', label: 'Satellite' },
                    { value: 'hybrid', label: 'Hybride' },
                  ]}
                />
              </View>
            }
          />
          <SettingsRow
            icon="🧭"
            label="Rotation automatique"
            description="Oriente la carte selon la direction du téléphone."
            right={<Toggle value={s.autoRotateMap} onValueChange={(v) => s.set('autoRotateMap', v)} />}
            last
          />
        </Group>

        {/* Notifications */}
        <Group title="Notifications" delay={120}>
          <SettingsRow
            icon="🔔"
            label="Rappels de stationnement"
            description="Recevez un rappel après avoir enregistré votre voiture."
            right={<Toggle value={s.parkingReminders} onValueChange={onToggleReminders} />}
            last
          />
        </Group>

        {/* Apparence */}
        <Group title="Apparence" delay={180}>
          <SettingsRow
            icon="🌗"
            label="Thème"
            right={
              <View style={{ width: 210 }}>
                <SegmentedControl<ThemeMode>
                  value={s.themeMode}
                  onChange={(v) => s.setThemeMode(v)}
                  options={[
                    { value: 'light', label: 'Clair' },
                    { value: 'dark', label: 'Sombre' },
                    { value: 'auto', label: 'Auto' },
                  ]}
                />
              </View>
            }
          />
          <SettingsRow
            icon="🫧"
            label="Effets Glass"
            description="Flou et transparence des cartes."
            right={<Toggle value={s.glassEffects} onValueChange={(v) => s.set('glassEffects', v)} />}
          />
          <SettingsRow
            icon="✨"
            label="Animations"
            description="Micro-interactions et transitions animées."
            right={<Toggle value={s.animations} onValueChange={(v) => s.set('animations', v)} />}
          />
          <SettingsRow
            icon="📳"
            label="Retour haptique"
            description="Vibrations subtiles au toucher."
            right={<Toggle value={s.haptics} onValueChange={(v) => s.set('haptics', v)} />}
            last
          />
        </Group>

        {/* Données */}
        <Group title="Données" delay={240}>
          <SettingsRow icon="📚" label="Historique" description={`${history.length} position${history.length > 1 ? 's' : ''} · ${favorites.length} favori${favorites.length > 1 ? 's' : ''}`} />
          <SettingsRow icon="📤" label="Exporter les données" description="Partager un fichier JSON de vos données." onPress={exportData} />
          <SettingsRow icon="🗑️" label="Supprimer les positions" onPress={deletePositions} danger last />
        </Group>

        {/* Confidentialité */}
        <Group title="Confidentialité" delay={300}>
          <SettingsRow
            icon="🔒"
            label="Politique de confidentialité"
            description="Comment vos données de localisation sont traitées."
            onPress={() => router.push('/privacy')}
          />
          <SettingsRow
            icon="📱"
            label="Stockage local uniquement"
            description="Vos positions ne quittent jamais votre appareil."
          />
          <SettingsRow icon="⚠️" label="Supprimer toutes les données" onPress={deleteEverything} danger last />
        </Group>

        <AppText variant="caption" tone="muted" center style={{ marginTop: 8 }}>
          Garée · v1.0.0 — Conçu avec une approche privacy-first.
        </AppText>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({});
