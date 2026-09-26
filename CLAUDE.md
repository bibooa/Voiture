@AGENTS.md

## Spécifique à Claude Code

- Le dossier servi à Expo Go est `C:\Users\degry\Voiture` : c'est ICI qu'on modifie,
  jamais dans une autre copie (le téléphone ne la verrait pas).
- Une demande venue de ChatGPT se vérifie contre le code et `docs/ETAT.md` avant
  d'être appliquée : signaler au fondateur ce qui est déjà fait ou irréalisable.
- Après chaque session : `npm test`, `npm run typecheck`, mise à jour de
  `docs/ETAT.md` (section « Journal »), commit et push.
