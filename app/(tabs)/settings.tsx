import React from 'react';
import { Alert, ScrollView, Share, Linking } from 'react-native';
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
import type { ThemeMode, MapType, StabilizationMode } from '@/types';

const STABILIZATION_HELP: Record<StabilizationMode, string> = {
  fast: '≈ 5 à 8 s, 5 à 10 mesures. Pour les cas pressés, un peu moins stable.',
  balanced: '≈ 8 à 14 s, 8 à 15 mesures. Le meilleur compromis au quotidien.',
  precise: '≈ 12 à 22 s, jusqu’à 20 mesures. Position la plus stable possible.',
};

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
      app: 'VéhiTrack',
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
            icon="accuracy"
            label="Haute précision"
            description="Utilise toutes les sources disponibles (GPS/GNSS, Wi-Fi, réseau mobile) pour obtenir la meilleure position possible."
            right={<Toggle value={s.highAccuracy} onValueChange={(v) => s.set('highAccuracy', v)} />}
          />
          <SettingsRow
            icon="clock"
            label="Temps de stabilisation"
            description={STABILIZATION_HELP[s.stabilization]}
            below={
              <SegmentedControl<StabilizationMode>
                value={s.stabilization}
                onChange={(v) => s.set('stabilization', v)}
                options={[
                  { value: 'fast', label: 'Rapide' },
                  { value: 'balanced', label: 'Équilibré' },
                  { value: 'precise', label: 'Précis' },
                ]}
              />
            }
          />
          <SettingsRow
            icon="walk"
            label="Itinéraires piétons en ligne"
            description="Désactivé par défaut. Activé : votre position et celle de la voiture sont envoyées à OpenStreetMap (routing.openstreetmap.de) pour calculer un vrai trajet à pied. Désactivé : distance à vol d’oiseau, rien ne quitte le téléphone."
            right={<Toggle value={s.onlineRouting} onValueChange={(v) => s.set('onlineRouting', v)} />}
          />
          <SettingsRow
            icon="pin"
            label="Adresse de la position en ligne"
            description="Désactivé par défaut. Activé : les coordonnées de chaque position enregistrée sont envoyées au service d’adresses du téléphone (Google sur Android, Apple sur iOS) pour afficher la rue."
            right={<Toggle value={s.onlineAddress} onValueChange={(v) => s.set('onlineAddress', v)} />}
          />
          <SettingsRow
            icon="lock"
            label="Autorisation de localisation"
            description={
              permission === 'granted'
                ? 'Autorisée pendant l’utilisation de l’app'
                : permission === 'denied'
                  ? 'Refusée — appuyez pour ouvrir les réglages'
                  : 'Non déterminée'
            }
            onPress={() => Linking.openSettings()}
          />
          <SettingsRow
            icon="shield"
            label="GPS actif uniquement lorsque nécessaire"
            description="Précision maximale pendant l’enregistrement et le guidage, fréquence réduite sur l’accueil, GPS coupé en arrière-plan. Aucun suivi en arrière-plan."
            last
          />
        </Group>

        {/* Carte */}
        <Group title="Carte" delay={60}>
          <SettingsRow
            icon="map"
            label="Type de carte"
            below={
              <SegmentedControl<MapType>
                value={s.mapType}
                onChange={(v) => s.setMapType(v)}
                options={[
                  { value: 'standard', label: 'Plan' },
                  { value: 'satellite', label: 'Satellite' },
                  { value: 'hybrid', label: 'Hybride' },
                ]}
              />
            }
          />
          <SettingsRow
            icon="compass"
            label="Carte orientée selon le téléphone"
            description="En mode Retrouver, la carte tourne avec la boussole — uniquement si elle est fiable. Sinon, le nord reste en haut."
            right={<Toggle value={s.headingUpMap} onValueChange={(v) => s.set('headingUpMap', v)} />}
            last
          />
        </Group>

        {/* Notifications */}
        <Group title="Notifications" delay={120}>
          <SettingsRow
            icon="bell"
            label="Rappels de stationnement"
            description="Recevez un rappel après avoir enregistré votre voiture."
            right={<Toggle value={s.parkingReminders} onValueChange={onToggleReminders} />}
            last
          />
        </Group>

        {/* Apparence */}
        <Group title="Apparence" delay={180}>
          <SettingsRow
            icon="theme"
            label="Thème"
            below={
              <SegmentedControl<ThemeMode>
                value={s.themeMode}
                onChange={(v) => s.setThemeMode(v)}
                options={[
                  { value: 'light', label: 'Clair' },
                  { value: 'dark', label: 'Sombre' },
                  { value: 'auto', label: 'Auto' },
                ]}
              />
            }
          />
          <SettingsRow
            icon="glass"
            label="Effets Glass"
            description="Flou et transparence des cartes."
            right={<Toggle value={s.glassEffects} onValueChange={(v) => s.set('glassEffects', v)} />}
          />
          <SettingsRow
            icon="sparkles"
            label="Animations"
            description="Micro-interactions et transitions animées."
            right={<Toggle value={s.animations} onValueChange={(v) => s.set('animations', v)} />}
          />
          <SettingsRow
            icon="haptic"
            label="Retour haptique"
            description="Vibrations subtiles au toucher."
            right={<Toggle value={s.haptics} onValueChange={(v) => s.set('haptics', v)} />}
            last
          />
        </Group>

        {/* Données */}
        <Group title="Données" delay={240}>
          <SettingsRow icon="history" label="Historique" description={`${history.length} position${history.length > 1 ? 's' : ''} · ${favorites.length} favori${favorites.length > 1 ? 's' : ''}`} />
          <SettingsRow icon="export" label="Exporter les données" description="Partager un fichier JSON de vos données." onPress={exportData} />
          <SettingsRow icon="trash" label="Supprimer les positions" onPress={deletePositions} danger last />
        </Group>

        {/* Confidentialité */}
        <Group title="Confidentialité" delay={300}>
          <SettingsRow
            icon="shield"
            label="Politique de confidentialité"
            description="Comment vos données de localisation sont traitées."
            onPress={() => router.push('/privacy')}
          />
          <SettingsRow
            icon="device"
            label="Stockage local uniquement"
            description="Vos positions ne quittent jamais votre appareil."
          />
          <SettingsRow icon="warning" label="Supprimer toutes les données" onPress={deleteEverything} danger last />
        </Group>

        <AppText variant="caption" tone="muted" center style={{ marginTop: 8 }}>
          VéhiTrack · v1.0.0 — Conçu avec une approche privacy-first.
        </AppText>
      </ScrollView>
    </ScreenContainer>
  );
}
