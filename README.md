# PointagePro

Application de pointage GPS pour équipes de chantier (BTP). Interface web
statique (aucun serveur applicatif), synchronisée en temps réel entre tous
les appareils via Firebase Firestore.

## Fonctionnalités

**Ouvrier**
- Pointage entrée / sortie en un clic
- Détection de la zone de chantier la plus proche via géolocalisation
- Radar visuel indiquant la position par rapport au périmètre autorisé
- Alerte si la position GPS ne correspond plus au statut de pointage
- Historique des pointages du jour

**Gestionnaire** (accès protégé par mot de passe, par compte nommé)
- Vue d'ensemble en temps réel : ouvriers présents / absents / hors zone,
  mis à jour instantanément dès qu'un ouvrier pointe depuis son appareil
- Carte en direct (Leaflet / OpenStreetMap) : position des ouvriers
  actuellement présents, mise à jour automatiquement
- Gestion des ouvriers (ajout, suppression)
- Gestion des zones de chantier (nom, adresse ou coordonnées GPS, rayon)
- Rapports par période et par ouvrier : totaux de temps passé par jour
  et par zone, et détail de chaque pointage (avec durée de session pour
  chaque sortie) ; export Excel (.xlsx) mis en forme sur deux feuilles
- Onglet **Comptes** (réservé à l'administrateur) : autoriser l'accès
  gestionnaire à un tiers (ex. secrétaire) sous un nom dédié, avec son propre
  mot de passe ; désactiver, réinitialiser le mot de passe ou supprimer un
  accès à tout moment

**Installable comme une application (PWA)** — depuis le navigateur mobile,
« Ajouter à l'écran d'accueil » (Android) ou Partager → « Sur l'écran
d'accueil » (iOS) installe PointagePro comme une vraie app : icône dédiée,
plein écran sans barre de navigateur. Le contenu se met à jour automatiquement
à chaque visite quand une connexion est disponible ; l'écran de connexion
reste accessible hors connexion grâce au service worker, mais le pointage
lui-même nécessite Internet (accès à Firestore).

## Architecture

Le site (`index.html`, `style.css`, `app.js`) est entièrement statique et
peut être hébergé n'importe où (GitHub Pages actuellement). Les données
partagées (ouvriers, zones, pointages) sont stockées dans **Firebase
Firestore**, avec synchronisation en temps réel : tous les appareils
connectés (gestionnaire et ouvriers) voient les mêmes données se mettre à
jour instantanément, sans recharger la page.

Les comptes gestionnaire (nom, mot de passe haché SHA-256, statut
administrateur/actif) sont stockés dans Firestore (collection `comptes`),
partagés entre tous les appareils : un accès créé ou révoqué par
l'administrateur prend effet pour tout le monde. Seule la session de
connexion (qui est actuellement connecté sur cet appareil) reste en local
(`localStorage`).

**Limite assumée** : comme pour le reste de l'application (site 100%
statique, sans serveur), les règles Firestore ci-dessous autorisent tout
client authentifié anonymement à lire/écrire la collection `comptes`. La
distinction administrateur/accès simple n'est donc appliquée que côté
interface, pas au niveau des données : elle empêche un usage normal
inapproprié, mais pas un utilisateur déterminé à inspecter le code ou la
base Firestore directement.

### Configuration Firebase requise

Dans la console Firebase du projet :
1. **Firestore Database** activée
2. **Authentication → Sign-in method → Anonymous** activé (l'app se connecte
   anonymement pour respecter les règles de sécurité ci-dessous)
3. **Règles Firestore** (onglet Rules) :
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

La configuration du projet (`firebaseConfig`) est en clair dans `app.js` —
c'est normal pour une app web Firebase, la clé n'est pas un secret : la
protection se fait via les règles ci-dessus, pas via sa confidentialité.

## Utilisation

Aucune installation ni build requis : servez le dossier avec un serveur
statique, par exemple :

```bash
python3 -m http.server 8080
```

puis rendez-vous sur `http://localhost:8080`. Une connexion internet est
nécessaire (accès à Firestore).

## Structure

- `index.html` — structure des vues (connexion, ouvrier, gestionnaire)
- `style.css` — thème visuel (clair/sombre automatique)
- `app.js` — logique applicative, synchronisation Firestore, géolocalisation
- `manifest.json`, `service-worker.js`, `icons/` — installation en PWA
- `.github/workflows/pages.yml` — déploiement automatique sur GitHub Pages

## Notes

- Le GPS du navigateur est requis pour pointer ; sans autorisation de
  localisation (ou en cas d'échec), le pointage est bloqué avec un message
  explicite plutôt que d'utiliser une position simulée.
- Au tout premier lancement (base Firestore vide), un jeu de données
  d'exemple (ouvriers, zones, pointages) est créé automatiquement.
- Tant qu'un ouvrier est connecté avec son statut « Présent », son
  application envoie sa position toutes les ~20 secondes (collection
  Firestore `positions`) pour alimenter la carte en direct du gestionnaire ;
  cette position est supprimée dès qu'il se déconnecte.
