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

**Gestionnaire** (accès protégé par mot de passe)
- Vue d'ensemble en temps réel : ouvriers présents / absents / hors zone,
  mis à jour instantanément dès qu'un ouvrier pointe depuis son appareil
- Carte en direct (Leaflet / OpenStreetMap) : position des ouvriers
  actuellement présents, mise à jour automatiquement
- Gestion des ouvriers (ajout, suppression)
- Gestion des zones de chantier (nom, adresse ou coordonnées GPS, rayon)
- Rapports par période et par ouvrier, avec export Excel (.xlsx) mis en forme

## Architecture

Le site (`index.html`, `style.css`, `app.js`) est entièrement statique et
peut être hébergé n'importe où (GitHub Pages actuellement). Les données
partagées (ouvriers, zones, pointages) sont stockées dans **Firebase
Firestore**, avec synchronisation en temps réel : tous les appareils
connectés (gestionnaire et ouvriers) voient les mêmes données se mettre à
jour instantanément, sans recharger la page.

Le mot de passe gestionnaire et la session de connexion restent en local
(`localStorage`), propres à chaque appareil/navigateur.

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
- `.github/workflows/pages.yml` — déploiement automatique sur GitHub Pages

## Notes

- Le GPS du navigateur est requis pour la détection de zone ; sans autorisation,
  l'application reste utilisable en mode démo (position simulée).
- Au tout premier lancement (base Firestore vide), un jeu de données
  d'exemple (ouvriers, zones, pointages) est créé automatiquement.
- Tant qu'un ouvrier est connecté avec son statut « Présent », son
  application envoie sa position toutes les ~20 secondes (collection
  Firestore `positions`) pour alimenter la carte en direct du gestionnaire ;
  cette position est supprimée dès qu'il se déconnecte.
