# VéhiTrack — consignes pour les IA qui travaillent sur ce dépôt

Deux IA travaillent sur ce projet : **ChatGPT** (architecture, UX/UI, relecture) et
**Claude Code** (implémentation, tests). Le fondateur valide sur son téléphone.

**Avant toute proposition, lire [`docs/ETAT.md`](docs/ETAT.md)** : ce qui est fait,
ce qui reste, et pourquoi les choix ont été faits. Ne pas redemander une
fonctionnalité qui y figure comme livrée ; si elle semble cassée, le dire avec
une capture ou un fichier précis.

## L'appli

Application mobile iOS/Android (Expo SDK 54, React Native 0.81, TypeScript strict)
qui mémorise où l'on s'est garé et guide jusqu'à la voiture. Aucun compte, aucun
serveur : tout est stocké sur le téléphone.

## Règles non négociables

1. **Jamais de fausse précision.** Un GPS de téléphone donne ±3 à ±30 m selon
   l'environnement. Aucune valeur n'est embellie : précisions arrondies au mètre
   SUPÉRIEUR, distances toujours affichées « ≈ ». « 100 % précis » est impossible
   au GPS ; la seule position exacte est l'épingle placée à la main par l'utilisateur.
2. **Une seule source de vérité par sujet** :
   - textes de l'écran Retrouver → `src/location/presentation.ts` uniquement ;
   - incertitude combinée, arrivée → `src/location/guidance.ts` ;
   - paliers de qualité GPS → `src/location/quality.ts` ;
   - position en direct → `src/store/locationStore.ts`.
   Un écran n'écrit jamais son propre texte de précision.
3. **Jamais de durée de trajet inventée** : un temps à pied n'apparaît que si un
   itinéraire réel a été calculé.
4. **Marqueurs de carte = images PNG** (`assets/markers/`, générées par
   `python scripts/make-markers.py`). Android coupe les marqueurs faits en vues React.
5. **Toute logique de localisation est pure et testée** (`tests/`, vitest).
   Une modification de `src/location/` s'accompagne de son test.

## Commandes

```bash
npm install
npx expo start -c      # le fondateur ouvre l'appli dans Expo Go
npm test               # vitest — doit rester vert
npm run typecheck      # tsc --noEmit — doit rester à 0 erreur
```

## Git

- Branche principale : `claude/dazzling-tesla-dgz93g` (nom historique, c'est la seule).
- Petites corrections : directement sur la branche principale.
- Grosse fonctionnalité : branche `feature/<nom>`, fusionnée après validation
  sur le téléphone.
- Toujours `git pull` avant de travailler, et mettre à jour `docs/ETAT.md` après.
