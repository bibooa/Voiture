# 🚗 Garée

**Retrouvez votre voiture, en un geste.**

Garée est une application mobile **iOS & Android** (React Native + Expo) qui mémorise l'endroit exact où vous vous garez et vous guide pour la retrouver. Design premium (glassmorphism, profondeur, micro-animations), **privacy-first** : par défaut, vos positions ne quittent pas votre téléphone (les services en ligne sont facultatifs et désactivés par défaut).

---

## ✨ Fonctionnalités

- **Enregistrement en un geste** — un gros bouton capture la position la plus fiable possible en fusionnant plusieurs mesures GPS.
- **Repère de stationnement** — ajoutez un détail utile (niveau, zone, n° de place) affiché à l'enregistrement et au guidage.
- **Retrouver ma voiture** — distance, direction (grande flèche + cardinal), temps de marche estimé, **état d'arrivée** (retour haptique quand vous y êtes), guidage vers l'app de cartes du téléphone, **partage** de la position.
- **Iconographie vectorielle** — jeu d'icônes cohérent (SVG), aucun emoji dans l'interface.
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
| Tests | Vitest (logique GPS / guidage pure, sans React Native) |
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
- **Services en ligne désactivés par défaut** (activables dans Réglages, chacun expliqué) :
  - *Itinéraires piétons en ligne* → départ + arrivée envoyés à `routing.openstreetmap.de` ;
  - *Adresse de la position en ligne* → coordonnées envoyées au géocodeur du système (Google / Apple).
  Les anciens réglages où l'itinéraire était actif par défaut sont remis à « désactivé » (`src/store/settingsMigration.ts`).
- Seule exception inhérente : le fond de carte (Google Maps / Apple Plans) charge les images de la zone affichée.

---

## 📍 Localisation : comment VéhiTrack reste honnête

**Enregistrement (stabilisation)** — `src/location/stabilizer.ts`
1. Demande haute précision (GNSS + Wi-Fi + réseau ; sur Android, proposition d'activer la « précision Google »).
2. Collecte 5 à 20 mesures selon le mode (Rapide / Équilibré / Précis) ; les positions en cache antérieures au début sont ignorées.
3. Écarte les mesures dont la précision annoncée est très inférieure à la médiane, puis les points aberrants (multitrajet) autour d'un centre médian robuste.
4. Fusionne les mesures retenues avec une pondération 1/précision².
5. Précision affichée = max(précision réelle d'un échantillon représentatif, dispersion observée), **arrondie au mètre supérieur**. Jamais le σ/√N statistique (les erreurs GPS sont corrélées, ce serait optimiste).
6. Si la position reste imprécise ou si le téléphone bouge : écran « Position encore imprécise » → Réessayer / Continuer malgré tout.

**Distance & incertitude** — `src/location/guidance.ts`
- Incertitude sur la distance = √(précision voiture² + précision utilisateur²), toujours affichée à côté de la distance.
- « Vous êtes probablement arrivé » seulement dans le rayon d'incertitude (min. 8 m), avec hystérésis, et uniquement avec une position fraîche.
- Pas de flèche « certaine » quand la voiture est dans la marge d'erreur ; flèche atténuée si la direction est approximative ou la boussole mal calibrée.

**Filtre temps réel** — `src/location/liveFilter.ts`
- Rejette les sauts physiquement impossibles (re-synchronise si plusieurs mesures concordent), lisse par filtre de Kalman : le point « Vous » ne saute plus de 10 → 3 → 18 m.
- Mesure la dispersion réelle du signal, intégrée à l'incertitude combinée. La précision affichée reste la valeur du téléphone.

**Présentation** — `src/location/presentation.ts`
- Une seule fonction décide des textes : distance toujours « ≈ », précisions réelles (« ±9 m », palier en complément), « Vous êtes probablement arrivé » + rayon, fraîcheur (« Position mise à jour à l'instant », « Dernière position fiable il y a 8 s »). Testée pour ±3, ±5, ±10, ±15 et ±30 m.
- « Arrivé » exige que la condition tienne 3 s d'affilée (une mesure chanceuse ne suffit pas).

**Temps réel** — `src/store/locationStore.ts` (source de vérité unique)
- Profils GPS : `guidance` (1 s + boussole) sur Retrouver, `map` (~4 s) sur l'accueil, coupé ailleurs et en arrière-plan.
- Fraîcheur affichée (« il y a 3 s »), états « GPS en attente » / « Signal perdu ».

**Itinéraire piéton** — `src/services/routing.ts`
- **Désactivé par défaut** (Réglages → « Itinéraires piétons en ligne »). Aucune requête tant que l'utilisateur ne l'active pas.
- Serveur OSRM profil *foot* (OpenStreetMap par défaut, `ROUTING_BASE_URL` pour votre propre instance).
- Hors ligne ou sans itinéraire : « distance directe », **sans temps de trajet inventé**.

### Tests

```bash
npm test          # 84 tests : ciel dégagé, parking, bâtiment (multitrajet), déplacement
                  # 10–50 m, GPS faible, perte du signal, hors ligne, sauts GPS,
                  # cohérence de l'affichage pour ±3 / ±5 / ±10 / ±15 / ±30 m
npm run typecheck
```

## 📁 Notes d'implémentation

- **Précision** : `acquireBestFix` échantillonne plusieurs relevés (`watchPositionAsync`, `BestForNavigation`), garde le meilleur rayon, écarte les valeurs aberrantes et fusionne le cluster par pondération inverse-variance. La précision affichée reste **celle du système** — jamais embellie.
- **Direction** : la flèche pointe vers le cap réel à parcourir quand la boussole est disponible (`bearing − heading`), sinon vers le cap géographique (nord en haut).
- **Accessibilité & responsive** : safe areas, notch / Dynamic Island, petits et grands écrans, rôles d'accessibilité sur les contrôles.
