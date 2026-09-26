# État du projet VéhiTrack

> À lire avant toute relecture ou proposition. Mis à jour après chaque session.
> Dernière mise à jour : 2026-09-26.

## Livré et testé

### Enregistrer sa voiture (Accueil)
- Gros bouton d'enregistrement : 5 à 20 mesures GPS selon le mode (Rapide /
  Équilibré / Précis), aberrations écartées, fusion pondérée 1/précision²
  (`src/location/stabilizer.ts`).
- Si la position reste imprécise : écran « Position encore imprécise »,
  Réessayer / Continuer malgré tout.
- Repère facultatif (niveau, zone, n° de place), historique, favoris, rappels.

### Retrouver ma voiture
- **En haut** : badge « GPS · ±8 m » (couleur = palier, valeur réelle toujours
  affichée) + âge de la position (« à l'instant », « il y a 4 s », « Dernière
  position fiable il y a 8 s », « Signal GPS perdu »).
- **Carte** (Google Maps sur Android, Apple Plans sur iOS) : fond sombre lisible,
  **inclinée à 55° avec bâtiments en 3D**, cadrage d'au moins 120 m, zoom,
  recentrer, petite boussole, échelle, légende. Tourne avec le téléphone
  seulement si la boussole est fiable.
- **Marqueurs** : voiture = disque vert avec voiture blanche ; moi = point bleu
  cerclé de blanc + cône de direction. Zones de précision à l'échelle réelle,
  très transparentes.
- **Voiture déplaçable** : appui long sur la voiture puis glisser → la position
  devient exacte, affichée « placée à la main ».
- **Panneau du bas** : « ≈ 7 m » (+ temps à pied seulement si itinéraire réel),
  message d'état, heure / précision voiture / précision actuelle sur une ligne,
  bouton ME GUIDER (Google Maps, Apple Plans, autre application) + bouton partager.

### Logique de précision (le cœur)
- Incertitude combinée = √(précision voiture² + précision actuelle²), la
  précision actuelle étant la pire entre la valeur du téléphone et la dispersion
  observée en direct. Ex. : ±12 et ±9 → ±15 m.
- « Vous êtes probablement arrivé » seulement si : distance ≤ incertitude
  (8 m minimum), condition tenue 3 s d'affilée, position fraîche, et incertitude
  ≤ ±20 m. Au-delà de ±20 m : « Votre voiture est dans les environs » + le rayon.
- Aucune flèche « certaine » quand la voiture est dans la marge d'erreur.
- Filtre temps réel (Kalman + rejet des sauts impossibles) : le point ne saute
  plus de 10 → 3 → 18 m.
- Paliers : EXCELLENTE ≤ 5 m, BONNE ≤ 10 m, MOYENNE ≤ 20 m, FAIBLE au-delà —
  toujours à côté de la valeur, jamais à sa place.

### Qualité
- 87 tests (vitest) : ±3 / ±5 / ±10 / ±15 / ±30 m, parking, multitrajet, perte
  du signal, hors ligne, sauts GPS, fraîcheur, cadrage.
- TypeScript strict : 0 erreur.

## Limites connues (ne pas « corriger » en trichant)

- La précision de TA position dépend de la puce GPS du téléphone et de
  l'environnement : aucun code ne descend sous ±3–5 m en ville.
- Parking souterrain : pas de GPS. Le repère texte (niveau, place) est la vraie aide.

## Reste à faire

| Priorité | Sujet |
|---|---|
| Haute | Choisir UN nom : « Garée » (README), « VéhiTrack » (appli), `com.garee.app` (identifiant, figé après publication) |
| Haute | `onlineRouting: true` par défaut envoie départ + arrivée à routing.openstreetmap.de : contredit « rien ne quitte le téléphone » du README → désactiver par défaut ou corriger le README |
| Haute | Clé Google Maps Android dans `app.json` pour une version installable hors Expo Go |
| Moyenne | Serveur d'itinéraires à soi : le serveur OSM public est limité à un usage raisonnable |
| Moyenne | Enregistrement automatique à la déconnexion du Bluetooth de la voiture (demande un accès en arrière-plan) |
| Moyenne | Photo de la place en plus du repère texte |
| Moyenne | Minuteur de stationnement payant avec rappel |
| Basse | Config ESLint cassée (`.eslintrc.js` ignoré par ESLint 9) |
| Basse | Marqueurs et vue 3D non vérifiés sur iOS |

## Journal

- **2026-09-26** — Arrivée plafonnée à ±20 m ; marqueurs en PNG (la voiture
  apparaissait coupée en « V » sur Android) ; cadrage corrigé (restait au zoom
  max) ; panneau compact ; carte 3D inclinée ; voiture déplaçable à la main.
