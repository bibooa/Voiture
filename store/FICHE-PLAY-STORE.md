# Fiche Google Play — VéhiTrack

Tout ce qu'il faut copier-coller dans la Play Console. Les visuels sont dans ce
dossier (`icon-512.png`, `feature-graphic.png`) ; les captures d'écran sont à
faire sur le téléphone (voir en bas).

## Identité

| Champ | Valeur |
|---|---|
| Nom de l'application (30 car. max) | `VéhiTrack : où est ma voiture` |
| Nom du paquet | `com.vehitrack.app` (définitif) |
| Langue par défaut | Français (France) – fr-FR |
| Application ou jeu | Application |
| Gratuite ou payante | Gratuite |
| Catégorie | Cartes et navigation |
| Tags | Navigation, Voiture, Stationnement |
| Politique de confidentialité | https://bibooa.github.io/Voiture/privacy/ |

## Description courte (80 car. max)

```
Garez-vous, touchez un bouton : VéhiTrack vous ramène à votre voiture.
```

## Description complète

```
Vous ne savez plus où vous êtes garé ? VéhiTrack mémorise l'endroit exact en un geste et vous y ramène à pied.

ENREGISTRER EN UN GESTE
• Un seul bouton : l'application prend plusieurs mesures GPS et garde la plus fiable.
• Ajoutez une photo de la place (pilier, numéro, panneau).
• Notez un repère en deux touches : niveau, zone, numéro de place.

RETROUVER SA VOITURE
• Carte en 3D avec votre position et celle de la voiture.
• Distance estimée et direction, mises à jour en temps réel.
• « Vous êtes probablement arrivé » : l'application vous le dit quand vous y êtes.
• Un bouton pour lancer le guidage dans Google Maps ou l'application de votre choix.
• Partagez la position de la voiture en un message.

UNE PRÉCISION HONNÊTE
VéhiTrack affiche toujours la précision réelle de votre GPS (par exemple ±8 m) et ne prétend jamais être plus précis que votre téléphone. Besoin d'une position exacte ? Déplacez la voiture sur la carte d'un appui long.

STATIONNEMENT PAYANT
Indiquez la durée de votre ticket : un rappel vous prévient 10 minutes avant la fin.

VOS DONNÉES RESTENT CHEZ VOUS
• Aucun compte, aucune publicité, aucune revente de données.
• Positions, photos et historique sont stockés uniquement sur votre téléphone.
• Aucun suivi en arrière-plan : la position n'est lue que lorsque l'application est ouverte.
• Les options en ligne (itinéraire à pied, adresse) sont désactivées tant que vous ne les activez pas.

AUSSI
• Historique de vos stationnements.
• Lieux favoris (maison, travail…).
• Mode sombre soigné.
```

## Sécurité des données (formulaire « Data safety »)

| Question | Réponse |
|---|---|
| Votre application collecte-t-elle ou partage-t-elle des données utilisateur requises ? | **Oui** (à cause des options en ligne facultatives) |
| Toutes les données sont-elles chiffrées en transit ? | **Oui** (HTTPS) |
| Les utilisateurs peuvent-ils demander la suppression ? | **Oui** — suppression dans l'application (Réglages → Confidentialité) ou désinstallation |

Types de données déclarés :

| Type | Collectée | Partagée | Facultative | Finalité |
|---|---|---|---|---|
| Position → Position exacte | Oui | Oui (OpenStreetMap / Google, seulement si l'option est activée) | **Oui** | Fonctionnalités de l'application |
| Photos et vidéos → Photos | **Non** (restent sur l'appareil, jamais transmises) | Non | — | — |

Notes pour les réponses :
- « Collectée » au sens de Google = transmise hors de l'appareil. Les données traitées
  uniquement sur le téléphone ne sont PAS à déclarer. Seule la position peut partir, et
  uniquement si l'utilisateur active « Itinéraires piétons en ligne » ou « Adresse en ligne ».
- Traitement éphémère : **Oui** (le service d'itinéraire ne conserve rien pour nous).
- Aucune donnée pour publicité, analyse, profilage : **Non**.

## Classification du contenu (questionnaire IARC)

- Catégorie : **Utilitaire, productivité, communication ou autre**.
- Violence, sexe, langage grossier, drogues, jeux d'argent : **Non** partout.
- Les utilisateurs peuvent-ils interagir ou échanger du contenu ? **Non** (le partage
  passe par les applications du téléphone, pas par VéhiTrack).
- Partage de la position avec d'autres utilisateurs : **Non** (seulement sur action de
  l'utilisateur via le partage du système).
- Achats numériques : **Non**.
- Résultat attendu : **Tout public / PEGI 3**.

## Public cible et contenu

- Tranches d'âge : **18 ans et plus** (conducteurs ; évite les exigences « Familles »).
- Publicités : **Non**.
- Accès à l'application : **toutes les fonctionnalités sont accessibles sans identifiants**.
- Application d'actualité : Non. Application de santé : Non. Applications gouvernementales : Non.
- Autorisation de localisation en arrière-plan : **non demandée** (bloquée dans la config).

## Captures d'écran (à faire sur ton téléphone)

Minimum 2, idéalement 6, format portrait, sans barre de notifications personnelle :
1. Accueil avec la voiture enregistrée (panneau distance + précision).
2. Retrouver : carte 3D avec « VOITURE » et « VOUS ».
3. Écran « Voiture enregistrée » avec une photo de la place.
4. Stationnement payant : « Payé jusqu'à … · reste … ».
5. « Vous êtes probablement arrivé ».
6. Historique.

## Test fermé (obligatoire pour un nouveau compte personnel)

12 testeurs minimum, inscrits **en continu pendant 14 jours**, avant de pouvoir
demander l'accès à la production.

Message à envoyer aux testeurs :

```
Salut ! Je lance VéhiTrack, une appli Android pour retrouver sa voiture garée (photo de la place, rappel de ticket, rien n'est envoyé sur internet).
Google m'oblige à la faire tester 14 jours avant de la publier. Tu peux m'aider ?
1) Envoie-moi l'adresse Gmail de ton téléphone Android.
2) Je t'envoie un lien : clique « Devenir testeur » puis installe l'appli.
3) Garde-la installée 14 jours et ouvre-la de temps en temps (tes retours sont les bienvenus !).
Merci 🙏
```
