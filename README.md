# 🚗 Garée

**Retrouvez votre voiture, en un geste.**

Garée est une application mobile **iOS & Android** (React Native + Expo) qui mémorise l'endroit exact où vous vous garez et vous guide pour la retrouver. Design premium (glassmorphism, profondeur, micro-animations), **100 % privacy-first** : vos positions ne quittent jamais votre téléphone.

---

## ✨ Fonctionnalités

- **Enregistrement en un geste** — un gros bouton capture la position la plus fiable possible en fusionnant plusieurs mesures GPS.
- **Retrouver ma voiture** — distance, direction (flèche + cardinal), temps de marche estimé, guidage vers l'app de cartes du téléphone.
- **Carte interactive** — marqueurs personnalisés voiture/utilisateur, cercle de précision, ligne de trajet, recentrage, style sombre sur-mesure.
- **Précision honnête** — indicateur 🟢/🟡/🔴 et valeur `±N m` réelle. L'app **ne surestime jamais** la précision fournie par le téléphone.
- **Historique** — positions passées, renommables, supprimables, réutilisables pour la navigation.
- **Favoris** — lieux personnalisés (Maison, Travail, Supermarché…).
- **Rappels** — notifications locales optionnelles de stationnement.
- **Réglages complets** — localisation, carte, notifications, apparence, données, confidentialité.
- **Dark mode premium** — pensé spécifiquement, pas une simple inversion.
- **Onboarding** — 3 écrans + demande de permission expliquée.
- **Hors ligne** — enregistrement et consultation fonctionnent sans Internet.
- **Gestion d'erreurs claire** — messages en langage humain (localisation désactivée, permission refusée, GPS indisponible…).

---

## 🏗️ Architecture

```
app/                         # Routes (expo-router, file-based)
  _layout.tsx                # Providers, hydratation des stores, splash, thème
  index.tsx                  # Redirection onboarding / app
  onboarding.tsx             # Onboarding premium + permission
  privacy.tsx                # Politique de confidentialité (modal)
  (tabs)/
    _layout.tsx              # Tab bar glass flottante
    index.tsx                # Accueil : carte + enregistrer
    find.tsx                 # Retrouver ma voiture (guidage)
    history.tsx              # Historique
    favorites.tsx            # Favoris
    settings.tsx             # Réglages

src/
  theme/                     # Design system : palettes clair/sombre, tokens, ThemeProvider, style de carte
  components/                # Kit UI glass (GlassCard, boutons, marqueurs, overlays, etc.)
  services/                  # location, storage, notifications, navigation, haptics
  store/                     # État (zustand) : settings, car, favorites, location
  hooks/                     # useLiveLocation, useSaveCar
  utils/                     # geo (distance/cap), time, accuracy, id
  types/                     # Types du domaine
```

**Principes**
- Séparation nette **UI / navigation / GPS / cartographie / stockage / notifications / services / permissions**.
- Une **seule** souscription GPS partagée (économe en batterie), ref-comptée par écran.
- Persistance **locale uniquement** (`AsyncStorage`), aucun serveur.

### Stack

| Domaine | Choix |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, TypeScript strict |
| Navigation | expo-router (typed routes) |
| Carte | react-native-maps |
| Localisation | expo-location (multi-échantillons + fusion) |
| Animations | react-native-reanimated |
| Glass / effets | expo-blur, expo-linear-gradient |
| État | zustand |
| Stockage | @react-native-async-storage/async-storage |
| Notifications | expo-notifications (locales) |
| Haptique | expo-haptics |

---

## 🚀 Démarrage

```bash
npm install
npx expo start
```

Puis scannez le QR code avec **Expo Go** (Android/iOS), ou lancez un build de dev :

```bash
npx expo run:android
npx expo run:ios
```

### Vérifications

```bash
npm run typecheck   # tsc --noEmit
npx expo export --platform android   # bundle complet (build de production JS)
```

### 🗺️ Note carte (build de production Android)

En **Expo Go** la carte fonctionne sans configuration. Pour un **build Android autonome**, Google Maps exige une clé API : ajoutez-la dans `app.json` sous `android.config.googleMaps.apiKey`. iOS utilise Apple Maps (aucune clé requise).

---

## 🔐 Confidentialité

- Aucun compte, aucun serveur, aucune analytics de localisation.
- La position n'est lue **qu'au moment** de l'enregistrement ou de la consultation de la carte.
- **Jamais** de suivi en arrière-plan.
- Suppression totale des données possible à tout moment (Réglages → Confidentialité).

---

## 📁 Notes d'implémentation

- **Précision** : `acquireBestFix` échantillonne plusieurs relevés (`watchPositionAsync`, `BestForNavigation`), garde le meilleur rayon, écarte les valeurs aberrantes et fusionne le cluster par pondération inverse-variance. La précision affichée reste **celle du système** — jamais embellie.
- **Direction** : la flèche pointe vers le cap réel à parcourir quand la boussole est disponible (`bearing − heading`), sinon vers le cap géographique (nord en haut).
- **Accessibilité & responsive** : safe areas, notch / Dynamic Island, petits et grands écrans, rôles d'accessibilité sur les contrôles.
