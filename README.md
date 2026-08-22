# PointagePro

Application de pointage GPS pour équipes de chantier (BTP). Interface 100% web,
sans backend : les données sont stockées dans le `localStorage` du navigateur.

## Fonctionnalités

**Ouvrier**
- Pointage entrée / sortie en un clic
- Détection de la zone de chantier la plus proche via géolocalisation
- Radar visuel indiquant la position par rapport au périmètre autorisé
- Historique des pointages du jour

**Gestionnaire**
- Vue d'ensemble : ouvriers présents / absents / hors zone
- Gestion des zones de chantier (nom, coordonnées GPS, rayon)
- Rapports par période et par ouvrier, avec export CSV

## Utilisation

Aucune installation ni build requis : ouvrez `index.html` dans un navigateur,
ou servez le dossier avec un serveur statique, par exemple :

```bash
python3 -m http.server 8080
```

puis rendez-vous sur `http://localhost:8080`.

## Structure

- `index.html` — structure des vues (connexion, ouvrier, gestionnaire)
- `style.css` — thème visuel (clair/sombre automatique)
- `app.js` — logique applicative, stockage local, géolocalisation

## Notes

- Le GPS du navigateur est requis pour la détection de zone ; sans autorisation,
  l'application reste utilisable en mode démo (position simulée).
- Toutes les données (ouvriers, zones, pointages) sont pré-remplies avec un
  jeu d'exemple au premier lancement et peuvent être réinitialisées en vidant
  le `localStorage` du navigateur.
