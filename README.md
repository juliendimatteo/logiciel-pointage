# PointagePro DI MATTEO

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

**Gestionnaire** (connexion par adresse e-mail et mot de passe, compte
Firebase Authentication nominatif)
- Vue d'ensemble en temps réel : ouvriers présents / absents / hors zone,
  mis à jour instantanément dès qu'un ouvrier pointe depuis son appareil
- Carte en direct (Leaflet / OpenStreetMap) : position des ouvriers
  actuellement présents, mise à jour automatiquement
- Gestion des ouvriers (ajout, suppression)
- Gestion des zones de chantier (nom, adresse ou coordonnées GPS, rayon)
- Onglet **Absences** : encoder pour un ouvrier, sur un jour ou une période,
  une absence motivée — maladie, congé, récupération, formation, accident de
  travail, chômage économique, chômage intempéries ou absence à
  justifier (requalifiable ensuite via « Modifier ») —
  avec commentaire facultatif ; les chevauchements sont refusés. L'absence
  apparaît sur la carte de l'ouvrier dans la vue d'ensemble (compteur dédié,
  distinct des absents « non pointés »)
- **Saisie manuelle d'un pointage** (entrée ou sortie, à l'heure choisie,
  avec zone et motif : oubli, pas de réseau, GPS indisponible…) depuis la
  carte de l'ouvrier ou l'onglet Rapports ; le pointage est marqué « Saisie
  manuelle » (avec l'auteur) dans les rapports et l'export Excel
- Rapports par période et par ouvrier : totaux de temps passé par jour
  et par zone, et détail de chaque pointage (avec durée de session pour
  chaque sortie), et absences de la période avec le nombre de jours
  ouvrables (lun.–ven.) ; export Excel (.xlsx) mis en forme sur trois
  feuilles (totaux, pointages, absences)
- Onglet **Comptes** (réservé à l'administrateur) : autoriser l'accès
  gestionnaire à un tiers (ex. secrétaire) avec son nom et son adresse
  e-mail — la personne reçoit un e-mail pour choisir elle-même son mot de
  passe ; désactiver (effet immédiat, y compris sur une session ouverte),
  lui renvoyer un lien de mot de passe ou supprimer un accès à tout moment

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

Les absences sont stockées dans la collection `absences` (un document par
absence : `idOuvrier`, `type`, `du`, `au` au format `AAAA-MM-JJ` bornes
incluses, `commentaire`, `creePar`/`creeLe`, `modifiePar`/`modifieLe`).

Les gestionnaires se connectent avec un compte **Firebase Authentication**
(e-mail + mot de passe ; Firebase gère le stockage du mot de passe, les
e-mails de réinitialisation et la limitation des tentatives). Chaque compte
est rattaché à un document `comptes/{uid}` (`nom`, `email`, `admin`,
`actif`) qui donne le droit d'accès : sans document actif, la connexion
est refusée. Les ouvriers, eux, n'ont pas de mot de passe : l'app ouvre une
session Firebase **anonyme** et ils choisissent leur nom dans la liste.

Les règles de [`firestore.rules`](firestore.rules) s'appuient sur cette
distinction :
- **ouvrier (anonyme)** : lire les ouvriers, les zones et les pointages,
  pointer (pas de pointage manuel ni de sortie forcée), envoyer et
  supprimer sa position. Pas d'accès aux absences, aux positions des
  autres ni aux comptes ;
- **gestionnaire (compte actif)** : tout le reste (ouvriers, zones,
  absences, correction/suppression de pointages, carte en direct) ;
- **administrateur** : en plus, gestion des accès gestionnaire.

Les documents doivent en outre avoir exactement la forme écrite par l'app
(champs, types, valeurs autorisées), et seules les modifications qu'elle
effectue réellement sont acceptées (un pointage existant ne peut changer
que d'heure, un compte ne peut pas devenir administrateur, etc.).

**Limites restantes** : un ouvrier n'étant pas authentifié individuellement,
n'importe quelle session anonyme peut lire les pointages (y compris leurs
coordonnées GPS) et pointer au nom de n'importe quel ouvrier. Comme seules
les sessions gestionnaire peuvent lire les positions, l'auto-dépointage par
surveillance passive ne s'exécute plus que dans ces sessions.

### Configuration Firebase requise

Dans la console Firebase du projet :
1. **Firestore Database** activée
2. **Authentication → Sign-in method** : activer **Anonymous** (ouvriers)
   et **Email/Password** (gestionnaires)
3. **Règles Firestore** (onglet Rules) : copier le contenu du fichier
   [`firestore.rules`](firestore.rules) puis **Publier**. À republier à
   chaque modification de ce fichier (nouveau champ, nouveau type
   d'absence…), sinon les écritures correspondantes seront refusées.
4. **Premier administrateur** : sur une base sans administrateur, l'écran
   de connexion « Gestionnaire » propose de le créer — l'adresse e-mail et
   le mot de passe saisis deviennent ceux de l'administrateur. Cette
   création n'est possible qu'une seule fois (document
   `meta/administration`) : la faire immédiatement après la mise en ligne.
5. *(facultatif)* **Authentication → Templates** : personnaliser l'e-mail
   de réinitialisation du mot de passe (envoyé en français).

**Migration depuis les anciens comptes (mot de passe haché)** : après la
mise en ligne de cette version, ouvrir l'app, choisir « Gestionnaire » et
créer le compte administrateur (étape 4), puis dans l'onglet Comptes
supprimer les anciens accès (marqués « Ancien accès ») et les recréer avec
une adresse e-mail. Un accès supprimé garde son utilisateur dans
Authentication (sans aucun droit) : pour recréer un accès avec la même
adresse, supprimer d'abord cet utilisateur dans la console.

La configuration du projet (`firebaseConfig`) est en clair dans `app.js` —
c'est normal pour une app web Firebase, la clé n'est pas un secret : la
protection se fait via les règles Firestore, pas via sa confidentialité.

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
- `firestore.rules` — règles de sécurité Firestore (à publier dans la console Firebase)
- `.github/workflows/pages.yml` — déploiement automatique sur GitHub Pages
- `dmd/` — copie indépendante de l'application pour l'équipe DMD (propre
  projet Firebase, voir `dmd/README.md`)

## Notes

- **À chaque modification de `app.js` ou `style.css`**, incrémenter le
  paramètre de version (`?v=…`) dans `index.html` et le nom du cache dans
  `service-worker.js` : la page et son script sont ainsi toujours rechargés
  ensemble (sinon le cache du navigateur peut associer une page à jour à un
  script périmé).

- Le GPS du navigateur est requis pour pointer ; sans autorisation de
  localisation (ou en cas d'échec), le pointage est bloqué avec un message
  explicite plutôt que d'utiliser une position simulée.
- À la première connexion d'un gestionnaire sur une base Firestore vide, un
  jeu de données d'exemple (ouvriers, zones, pointages) est créé
  automatiquement.
- Tant qu'un ouvrier est connecté avec son statut « Présent », son
  application envoie sa position toutes les minutes environ (collection
  Firestore `positions`) pour alimenter la carte en direct du gestionnaire ;
  cette position est supprimée dès qu'il se déconnecte.
- **Quota Firestore** (plan gratuit : 50 000 lectures/jour, chaque document
  reçu compte) : l'app n'écoute en direct que les pointages depuis la veille ;
  les rapports chargent leur période à la demande, et seule la session
  gestionnaire écoute les positions en continu. Ne pas réintroduire d'écoute
  de toute la collection `pointages`, qui grossit chaque jour.
