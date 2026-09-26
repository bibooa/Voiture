# État du projet VéhiTrack

> À lire avant toute relecture ou proposition. Mis à jour après chaque session.
> Dernière mise à jour : 2026-09-26 (passe qualité n° 1).

## Livré et testé

### Confidentialité
- **Tout service en ligne est désactivé par défaut**, chacun activable et
  expliqué dans Réglages :
  - « Itinéraires piétons en ligne » → départ + arrivée envoyés à
    `routing.openstreetmap.de` ;
  - « Adresse de la position en ligne » → coordonnées envoyées au géocodeur du
    système (Google sur Android, Apple sur iOS). Point d'entrée unique :
    `reverseGeocode()` dans `src/services/location.ts`, qui ne fait rien si l'option
    est coupée.
- Les anciens réglages (itinéraire actif par défaut, jamais choisi par
  l'utilisateur) sont remis à « désactivé » une fois : `src/store/settingsMigration.ts`
  (`privacyVersion` = 2).
- Exception inhérente, documentée dans la page Confidentialité : le fond de carte
  (Google Maps / Apple Plans) charge les images de la zone affichée.
- Autres sorties réseau vérifiées : aucune. `Linking.openURL` (ME GUIDER,
  partager) ne part que sur action de l'utilisateur.

### Enregistrer sa voiture (Accueil)
- Gros bouton d'enregistrement : 5 à 20 mesures GPS selon le mode (Rapide /
  Équilibré / Précis), aberrations écartées, fusion pondérée 1/précision²
  (`src/location/stabilizer.ts`).
- Si la position reste imprécise : écran « Position encore imprécise »,
  Réessayer / Continuer malgré tout.
- Repère facultatif (niveau, zone, n° de place), historique, favoris, rappels.
- En-tête compact (logo + nom, bouton réglages discret, sans slogan).
- Panneau : « ✓ Vous êtes probablement arrivé », puis deux colonnes
  « Distance estimée ≈ 3 m » | « Précision de localisation ±15 m », puis
  « Voiture ±12 m · Vous ±8 m ».

### Retrouver ma voiture
- **En haut** : badge « GPS · ±8 m » (couleur = palier, valeur réelle toujours
  affichée) + âge de la position. Pas d'en-tête de marque sur cet écran.
- **Carte** (Google Maps sur Android, Apple Plans sur iOS) : fond sombre lisible,
  **inclinée à 55° avec bâtiments en 3D**, cadrage d'au moins 120 m, contrôles
  compacts (boussole 30 pt, zoom et recentrer 34 pt, zone tactile élargie),
  échelle, légende. Tourne avec le téléphone seulement si la boussole est fiable.
- **Marqueurs PNG** (`assets/markers/`, `python scripts/make-markers.py`) :
  voiture = disque vert + étiquette « VOITURE » au-dessus ; moi = point bleu +
  étiquette « VOUS » en dessous (pas de collision quand ils sont proches). Images
  symétriques : le centre du disque reste exactement sur la position.
- **Voiture déplaçable** : appui long puis glisser → « placée à la main »
  (même libellé partout, `formatCarAccuracy`).
- **Panneau du bas** (verre plus fin : bordure hairline, ombre et teinte réduites) :
  message d'état avec coche, « Distance estimée » | « Précision de
  localisation » côte à côte, heure / précision voiture / précision actuelle,
  ME GUIDER + partager.

### Logique de précision (le cœur)
- Incertitude combinée = √(précision voiture² + précision actuelle²), arrondie au
  mètre supérieur ; la précision actuelle est la pire entre la valeur du
  téléphone et la dispersion observée en direct. Ex. : ±12 et ±8 → ±15 m.
- Sources de vérité respectées (vérifié : aucun composant ne recalcule une
  précision) : `presentation.ts` (textes), `guidance.ts` (incertitude, arrivée),
  `quality.ts` (paliers, format), `locationStore.ts` (position en direct).
- « Vous êtes probablement arrivé » seulement si : distance ≤ incertitude
  (8 m minimum), condition tenue 3 s, position fraîche (même règle que l'affichage,
  `freshnessOf`), incertitude ≤ ±20 m. Au-delà : « Votre voiture est dans les
  environs » + le rayon.
- Aucune flèche « certaine » quand la voiture est dans la marge d'erreur.
- Filtre temps réel (Kalman + rejet des sauts impossibles).
- Paliers : EXCELLENTE ≤ 5 m, BONNE ≤ 10 m, MOYENNE ≤ 20 m, FAIBLE au-delà —
  toujours à côté de la valeur. États : excellente, bonne, moyenne, faible,
  position ancienne (« Dernière position fiable il y a 8 s »), signal perdu.
- Durée de trajet uniquement avec un itinéraire réellement calculé.

### Qualité
- **180 tests** (vitest, dont ticket de stationnement) : précisions ±3/5/8/10/12/15/20/30 m × distances
  1/3/8/15/50/100/500 m, cas combinés (12/8, 5/5, 20/15), position instable,
  ancienne, perdue, routing désactivé/actif/hors ligne/sans itinéraire,
  migration de confidentialité, cadrage.
- TypeScript strict : 0 erreur. **ESLint 9** : `eslint.config.js` (config plate
  Expo), `npm run lint` → 0 erreur, 0 avertissement.

## Limites connues (ne pas « corriger » en trichant)

- La précision de TA position dépend de la puce GPS du téléphone et de
  l'environnement : aucun code ne descend sous ±3–5 m en ville.
- Parking souterrain : pas de GPS. Le repère texte (niveau, place) est la vraie aide.

## Non vérifié sur appareil (à tester)

| Point | Plateforme | Pourquoi non validé |
|---|---|---|
| Rendu des marqueurs PNG + étiquettes | iOS | Aucun appareil iOS disponible. Le code utilise la prop `image` (supportée par Apple Plans) et les variantes @2x/@3x. |
| Cône de direction | iOS | Rendu par une vue `Image` tournée (Apple Plans ne tourne pas les marqueurs). |
| Inclinaison 3D après cadrage | iOS | `fitToCoordinates` puis `animateCamera({ pitch })` après 650 ms. |
| Glisser la voiture | iOS | `draggable` est supporté par Apple Plans, non essayé. |
| Tout le lot de cette passe | Android | Vérifié par tests et typecheck, pas encore revu sur le téléphone du fondateur. |

## Détails du stationnement (livré)

- Après chaque enregistrement, un écran plein « Voiture enregistrée » remplace
  l'ancienne confirmation : **photo de la place** (appareil photo ou galerie),
  **repère** (texte + raccourcis Niveau -1/-2, Zone, Place n°, Pilier) et
  **stationnement payant** (Aucun / 30 min / 1 h / 2 h / 3 h). Rouvrable depuis
  l'Accueil et Retrouver (ParkingExtras → ParkingDetailsSheet).
- Photo : copiée dans le dossier privé de l'appli (src/services/photos.ts),
  jamais envoyée, sans métadonnées EXIF (pas de GPS dans le fichier). Supprimée
  avec la position (suppression, historique vidé, dépassement des 50 entrées).
- Ticket : logique pure src/location/meter.ts (fin, temps restant arrondi au
  supérieur, « bientôt » à 10 min, expiré) ; rappel local 10 min avant la fin
  (scheduleMeterReminder), annulé si le ticket change, si la position est
  supprimée ou si une nouvelle voiture est enregistrée. Sans notifications
  autorisées : minuteur affiché, sans alerte (l'utilisateur est prévenu).
- Panneaux Accueil / Retrouver : miniature de la photo (appui = plein écran),
  repère et « Payé jusqu'à 14:30 · reste 32 min ».

## Logo

- Source : ssets/brand/logo-source.png. python scripts/make-icons.py retire
  le faux damier et génère ssets/brand/logo.png (en-tête Accueil),
  icon.png, daptive-icon.png (zone sûre Android), splash.png, avicon.png.

## Publication Play Store (préparée)

- Nom **VéhiTrack**, identifiant **com.vehitrack.app** (définitif), versionCode géré
  par EAS (utoIncrement).
- Permissions bloquées : localisation en arrière-plan, micro, stockage externe,
  superposition. Demandées : localisation pendant l'utilisation, appareil photo,
  notifications.
- Clé Google Maps Android : jamais dans le dépôt, injectée par pp.config.js
  depuis la variable EAS GOOGLE_MAPS_ANDROID_KEY.
- eas.json : preview (APK à installer pour tester), production (AAB pour le Store).
- Politique de confidentialité : https://bibooa.github.io/Voiture/privacy/
  (GitHub Pages, dossier docs/).
- Fiche complète, formulaire « Sécurité des données », classification, message aux
  testeurs : store/FICHE-PLAY-STORE.md. Visuels : store/icon-512.png,
  store/feature-graphic.png (python scripts/make-store-assets.py).
- Reste au fondateur : compte Play Console, compte Expo, clé Maps, captures,
  12 testeurs × 14 jours.
## Reste à faire

| Priorité | Sujet |
|---|---|
| Haute | Créer la clé Google Maps Android et la déclarer dans EAS (voir « Publication »)
| Moyenne | Serveur d'itinéraires à soi : le serveur OSM public est limité à un usage raisonnable |
| Moyenne | Enregistrement automatique à la déconnexion du Bluetooth de la voiture (demande un accès en arrière-plan) |
| Basse | Vérifications iOS (tableau « Non vérifié ») |

## Journal

- **2026-09-26 (détails du stationnement)** — Photo de la place, repère avec raccourcis, ticket de stationnement payant avec rappel local, logo officiel et icônes de l'appli ; 175 → 180 tests.
- **2026-09-26 (passe qualité n° 1)** — Services en ligne désactivés par défaut
  (+ migration, + géocodage d'adresse mis derrière un réglage : il envoyait les
  coordonnées sans le dire) ; « Distance estimée » et « Précision de
  localisation » séparées sur Accueil et Retrouver ; en-tête Accueil compact ;
  verre, bouton et contrôles de carte affinés ; étiquettes VOITURE / VOUS dans les
  PNG ; libellé « placée à la main » unifié (Historique) ; règle de fraîcheur de
  l'arrivée alignée sur l'affichage ; ESLint 9 réparé (13 erreurs d'apostrophes
  corrigées) ; 87 → 175 tests.
- **2026-09-26** — Arrivée plafonnée à ±20 m ; marqueurs en PNG (la voiture
  apparaissait coupée en « V » sur Android) ; cadrage corrigé (restait au zoom
  max) ; panneau compact ; carte 3D inclinée ; voiture déplaçable à la main.
