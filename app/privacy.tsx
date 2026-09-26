import React from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AmbientBackground, GlassCard, AppText } from '@/components';
import { useTheme } from '@/theme';

const SECTIONS = [
  {
    title: 'Une approche privacy-first',
    body: "Garée est conçue pour fonctionner sans compte et sans serveur. Vos positions de stationnement, votre historique et vos favoris sont enregistrés uniquement dans le stockage local de votre téléphone.",
  },
  {
    title: 'Utilisation de la localisation',
    body: "Votre position n'est lue qu'au moment où vous enregistrez votre voiture ou lorsque vous consultez la carte pour la retrouver. Garée ne suit jamais votre position en arrière-plan.",
  },
  {
    title: 'Aucune collecte de données',
    body: "Aucune donnée de localisation n'est envoyée à Garée ni à un tiers. Il n'y a ni analytics de localisation, ni publicité, ni revente de données.",
  },
  {
    title: 'Adresses approximatives',
    body: "Lorsque c'est possible, une adresse approximative est calculée à partir de vos coordonnées via le service de géocodage du système d'exploitation, afin de rendre l'historique plus lisible.",
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
              <Ionicons name="close" size={20} color={t.colors.text} />
            </View>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          <GlassCard strong style={{ marginBottom: 16 }}>
            <AppText variant="headline">🔒 Vos données restent sur votre téléphone</AppText>
            <AppText variant="body" tone="secondary" style={{ marginTop: 8 }}>
              Garée n'a besoin d'aucun compte et ne dispose d'aucun serveur pour stocker vos
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
