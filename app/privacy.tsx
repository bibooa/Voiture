import React from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground, GlassCard, AppText, Icon } from '@/components';
import { useTheme } from '@/theme';

const SECTIONS = [
  {
    title: 'Une approche privacy-first',
    body: "VéhiTrack est conçue pour fonctionner sans compte et sans serveur. Vos positions de stationnement, votre historique et vos favoris sont enregistrés uniquement dans le stockage local de votre téléphone.",
  },
  {
    title: 'Utilisation de la localisation',
    body: "Votre position n'est lue qu'au moment où vous enregistrez votre voiture ou lorsque vous consultez la carte pour la retrouver. VéhiTrack ne suit jamais votre position en arrière-plan.",
  },
  {
    title: 'Aucune collecte de données',
    body: "Aucune donnée de localisation n'est envoyée à VéhiTrack. Il n'y a ni compte, ni analytics de localisation, ni publicité, ni revente de données. Les deux services en ligne ci-dessous sont désactivés tant que vous ne les activez pas.",
  },
  {
    title: 'Itinéraires piétons (désactivé par défaut)',
    body: "Uniquement si vous activez « Itinéraires piétons en ligne » dans les Réglages : votre position et celle de votre voiture sont envoyées au service de calcul d'itinéraire OpenStreetMap (routing.openstreetmap.de), lorsque vous consultez la position de votre voiture. Sinon, la distance à vol d'oiseau est calculée sur le téléphone.",
  },
  {
    title: 'Adresses (désactivé par défaut)',
    body: "Uniquement si vous activez « Adresse de la position en ligne » dans les Réglages : les coordonnées d'une position enregistrée sont envoyées au service d'adresses de votre téléphone (Google sur Android, Apple sur iOS) pour afficher le nom de la rue.",
  },
  {
    title: 'Fond de carte',
    body: "La carte est fournie par Google Maps (Android) ou Apple Plans (iOS). Pour afficher la zone que vous regardez, ce fournisseur reçoit les images de carte demandées, comme dans toute application de cartes. Vos positions enregistrées ne lui sont pas transmises par VéhiTrack.",
  },
  {
    title: 'Navigation externe',
    body: "Lorsque vous lancez le guidage, l'application de cartes de votre téléphone (Plans ou Google Maps) s'ouvre avec la destination. Son utilisation est régie par sa propre politique de confidentialité.",
  },
  {
    title: 'Suppression des données',
    body: "Vous gardez le contrôle total : vous pouvez supprimer une position, tout l'historique, ou l'intégralité de vos données à tout moment depuis les Réglages.",
  },
];

export default function PrivacyScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AmbientBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <View style={styles.header}>
          <AppText variant="title">Confidentialité</AppText>
          <Pressable onPress={() => router.back()} accessibilityLabel="Fermer" hitSlop={10}>
            <View style={[styles.close, { backgroundColor: t.colors.glass, borderColor: t.colors.glassBorder }]}>
              <Icon name="close" size={20} color={t.colors.text} />
            </View>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          <GlassCard strong style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="shield" size={20} color={t.colors.success} />
              <AppText variant="headline" style={{ marginLeft: 10, flex: 1 }}>
                Vos données restent sur votre téléphone
              </AppText>
            </View>
            <AppText variant="body" tone="secondary" style={{ marginTop: 8 }}>
              VéhiTrack n’a besoin d’aucun compte et ne dispose d’aucun serveur pour stocker vos
              informations personnelles.
            </AppText>
          </GlassCard>

          {SECTIONS.map((sec) => (
            <GlassCard key={sec.title} style={{ marginBottom: 12 }}>
              <AppText variant="callout" weight="bold">
                {sec.title}
              </AppText>
              <AppText variant="body" tone="secondary" style={{ marginTop: 6, lineHeight: 21 }}>
                {sec.body}
              </AppText>
            </GlassCard>
          ))}
        </ScrollView>
      </View>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
