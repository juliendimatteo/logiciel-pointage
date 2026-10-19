# PointagePro DMD

Copie de PointagePro destinée à l'équipe **DMD**, avec les mêmes
fonctionnalités que l'application DI MATTEO (voir le `README.md` à la racine)
mais des **données totalement séparées** : elle utilise son propre projet
Firebase, ses propres ouvriers, zones, pointages, absences et comptes
gestionnaire.

Elle est servie depuis le sous-dossier `dmd/` du même site
(ex. `https://<site>/dmd/`) et s'installe comme une application distincte
(nom, icône et cache propres à DMD) : un même téléphone peut avoir les deux
applications installées sans qu'elles se mélangent.

## Mise en service

1. Créer un nouveau projet sur <https://console.firebase.google.com>
   (ex. « pointagepro-dmd »).
2. Dans ce projet :
   - **Firestore Database** → Créer une base de données ;
   - **Authentication → Sign-in method → Anonymous** → Activer ;
   - **Firestore → Règles** : mêmes règles que l'application principale
     (lecture/écriture si `request.auth != null`).
3. **Paramètres du projet → Vos applications → Ajouter une application Web**,
   puis copier l'objet `firebaseConfig` affiché dans `dmd/app.js` (bloc
   « BASE DE DONNÉES PARTAGÉE »). Tant qu'il est vide, la page affiche un
   message « pas encore configuré ».
4. Au premier lancement, la base vide est remplie avec le jeu de données
   d'exemple ; supprimer ensuite ces ouvriers/zones d'exemple et encoder ceux
   de l'équipe DMD depuis l'espace gestionnaire.

## Maintenance

- Les fichiers de `dmd/` sont une copie indépendante : une évolution faite
  sur l'application principale n'est **pas** reprise automatiquement ici.
- Même règle de version que l'application principale : à chaque
  modification de `dmd/app.js` ou `dmd/style.css`, incrémenter `?v=dmd…` dans
  `dmd/index.html` et le nom du cache (`pointagepro-dmd-v…`) dans
  `dmd/service-worker.js`.
