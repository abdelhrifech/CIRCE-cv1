# Dossier d'exploitation de CIRCE V2

Support du run de l'application (EXP-040). **État au 26/11/2026 : CIRCE V2 ne tourne qu'en local** (poste de
développement, base SQLite, identité de développement). Les procédures « local » sont exécutables aujourd'hui ; les
procédures « cible » décrivent le fonctionnement attendu sur la plateforme Cityz Media (AKS, GitOps) et restent à
valider sur Staging (EXP-041, EXP-042). Architecture : [../architecture/README.md](../architecture/README.md).

| Document | Contenu |
|---|---|
| Ce fichier | Procédures courantes, retour au build précédent, runbooks, reprise et rejeu |
| [observabilite.md](observabilite.md) | Sondes, traces, métriques, journaux, diagnostic de l'export OTLP |
| [indicateurs-metier.md](indicateurs-metier.md) | Catalogue des indicateurs métier (EXP-030, EXP-031) |
| [migrations.md](migrations.md) | Migrations de schéma, règles, traitement d'un échec (DON-035) |
| [known-issues.md](known-issues.md) | Anomalies connues non corrigées (FIN-010) |

## 1. Procédures courantes

### 1.1 Démarrage (local)

Prérequis : Node.js 24 LTS ou plus, accès Internet au premier démarrage, dossier accessible en écriture.

```sh
npm install        # lance pnpm 12.14.0 par npx (scripts/installer.mjs)
npm start          # = pnpm start:all (scripts/start.mjs)
```

Étapes exécutées par `scripts/start.mjs` :

1. Crée `.env` depuis `.env.example` s'il est absent. Refuse `NODE_ENV=production` et une `DATABASE_URL` qui ne vise
   pas `dev.db`.
2. Restaure `apps/api/prisma/dev.db` depuis `apps/api/prisma/donnees/dev.sqlite.gz` s'il est absent (sauf `--no-seed`).
3. Applique les migrations (`pnpm db:up`) et génère le client Prisma.
4. Sauf `--no-seed` : référentiels (`seed:ref`), profils de développement, puis données (import d'un export de Circé
   si `CIRCE_EXPORT_DIR` ou `--import=` est renseigné, JDD fictifs `seed:centres`, `seed:news`, et `seed:scenarios`
   avec `--demo`).
5. Lance l'API, le web et le serveur de sondes sur des ports libres (préférés : web 3000, API 3001, sondes 9180) et
   affiche **Application prête** avec l'adresse à ouvrir.

Options : `--user=dev.admin` (profil injecté), `--no-seed`, `--no-demo`, `--demo`, `--sans-jdd`, `--import=<dossier>`,
`--web-port=`, `--api-port=`, `--admin-port=`. Détails : [README.md](../../README.md).

**Cible.** Déploiement par le processus GitOps : Cityz Media construit l'image par son workflow, le maître d'œuvre
renseigne le tag de build dans l'overlay de l'environnement ; le Job de migration (`prisma migrate deploy`) s'exécute
avant le démarrage des pods ([migrations.md](migrations.md)). `[À COMPLÉTER : dépôt GitOps, overlays, namespaces]`.

### 1.2 Arrêt

- Local : `Ctrl+C` dans le terminal du lanceur arrête l'API et le web (arbre de processus terminé, Windows compris).
- Arrêt de l'API (local et cible) sur SIGTERM : les sondes passent « non prêtes » (503), Fastify termine les requêtes,
  l'ordonnanceur interne et le planificateur Broadcast s'arrêtent, la base est fermée, la télémétrie est vidée
  ([observabilite.md](observabilite.md)).
- Cible : arrêt ou mise à l'échelle par Kubernetes ; ne pas supprimer de pod pendant l'exécution d'une tâche planifiée
  sans vérifier le journal des exécutions (verrou libéré automatiquement s'il est périmé).

### 1.3 Vérification du bon fonctionnement

| Contrôle | Commande ou action | Résultat attendu |
|---|---|---|
| Vie du processus | `curl http://127.0.0.1:9180/healthz/live` (port affiché au démarrage) | 200, `status: alive` |
| Disponibilité | `curl http://127.0.0.1:9180/healthz/ready` | 200, `status: ready` ; 503 `not_ready` si la base échoue ou pendant l'arrêt |
| API et base | `curl http://127.0.0.1:3001/v1/health` (ou `/api/health`) | 200 |
| Interface | Ouvrir l'adresse affichée, bandeau « API ok » | Écrans chargés pour le profil choisi |
| Journaux | Sortie standard de l'API (JSON Pino) | Pas d'erreur `level` ≥ 50 au démarrage |
| Données | Filtres sur une semaine S28 à S41 de 2026 | Listes non vides (la semaine courante est vide) |

Contrôles du code (sans la base de dev) : `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm api:contract:check`.
Tests sur la base de test uniquement : `pnpm test:int`, `pnpm test:e2e`.

### 1.4 Retour au build précédent

- Local : revenir au commit précédent (`git checkout <commit>`), puis `npm install` et `npm start`. Les migrations sont
  en ajout seul : une base migrée par une version plus récente reste lisible par la version précédente tant qu'aucune
  colonne requise n'a été retirée ([migrations.md](migrations.md)). Pour repartir de la base livrée, arrêter
  l'application et déplacer `apps/api/prisma/dev.db` hors du dossier.
- Cible (annexe E du référentiel, section 7) : remettre dans l'overlay de l'environnement le tag du build précédent par
  pull request sur le dépôt GitOps ; même image que celle recettée sur Staging, sans reconstruction. Aucune migration
  descendante : la compatibilité n-1 du schéma est exigée. En cas d'échec de migration : [migrations.md](migrations.md),
  section « Traitement d'un échec de migration ». `[À COMPLÉTER : approbateur, délai, procédure validée sur Staging]`.

## 2. Runbooks

Incidents connus, constatés pendant la recette du 24/11/2026 sur données réelles et les corrections des 23 et
24/11/2026 (`docs/RAPPORT_TESTS.md`, `docs/CORRECTIFS_PAGES_2026_11_23.md`). Les anomalies encore ouvertes sont dans
[known-issues.md](known-issues.md).

### R1 — Une page met plusieurs secondes à s'afficher ou l'API ne répond plus

- **Symptôme** : écrans de suivi lents (6 à 15 s), badge « Alertes » qui retarde la page, ou toutes les requêtes en
  attente.
- **Diagnostic** : dans les journaux de l'API, repérer les requêtes longues (`responseTime`) et leur route ; métrique
  `http.server.request.duration` par modèle de route ([observabilite.md](observabilite.md)). L'API est mono-fil : une
  lecture lourde retarde les suivantes. Vérifier si la requête part sans semaine (`/pilotage/dashboard` sans `semaine`,
  ANO-075) ou s'il s'agit du compteur d'alertes (ANO-080).
- **Résolution** : choisir une semaine dans les filtres ; si une route corrigée par ANO-065 à ANO-074 redevient lente,
  vérifier que les statistiques SQLite sont à jour (R2). Sinon, ouvrir une anomalie avec la route et la durée.

### R2 — Requêtes lentes après un import ou une restauration de base

- **Symptôme** : lectures par dossier anormalement lentes (plan d'exécution sur un index peu sélectif, ANO-072).
- **Diagnostic** : la base SQLite n'a pas de statistiques du planificateur à jour.
- **Résolution** : redémarrer l'API (elle exécute `PRAGMA optimize` au démarrage, `optimiserStatistiques` dans
  `apps/api/src/core/db.ts`) ; l'import (`import:circe`) le fait aussi en fin de traitement.

### R3 — Erreur 500 « Maximum call stack size exceeded »

- **Symptôme** : HTTP 500 sur une lecture volumineuse (constaté sur « Analyse Production », 23/11/2026).
- **Diagnostic** : journal de l'API avec `RangeError: Maximum call stack size exceeded` dans `core/paquets.ts`.
- **Résolution** : corrigé le 23/11/2026 (concaténation par boucle, test de 200 001 lignes dans
  `apps/api/src/core/paquets.test.ts`). Si l'erreur réapparaît ailleurs, rechercher un `push(...tableau)` sur un
  résultat non borné.

### R4 — Erreur 431 (en-têtes trop grands)

- **Symptôme** : « Suivi déroulant » filtré par avancement ne se charge pas ; réponse 431 du relais web ou de l'API.
- **Diagnostic** : URL de plusieurs dizaines de Ko (`visualIds`), ANO-076.
- **Résolution** : contournement par un filtre moins large (semaine, dossier) ; correction non faite
  ([known-issues.md](known-issues.md)).

### R5 — Page en erreur ou listes vides selon le profil

- **Symptôme** : 403 en console et listes d'imprimeurs vides pour `cheq` ou `com` (ANO-079) ; « Déroulant › Liste des
  colis » en erreur (ANO-077).
- **Diagnostic** : consulter les événements `securite.refus` dans les journaux (route, permission manquante,
  utilisateur).
- **Résolution** : arbitrages en attente (Q-449, Q-448) ; utiliser un profil disposant du droit, ou la liste des colis
  sans filtre de type.

### R6 — L'API refuse de démarrer

- **Symptôme** : `Configuration invalide`, ou « Fournisseur d'identité de dev interdit en production ».
- **Diagnostic** : variables lues par `apps/api/src/core/config.ts` (validation Zod) ; message explicite par variable.
- **Résolution** : corriger `.env` (copié de `.env.example`) ; `DATABASE_URL` doit être un fichier SQLite `file:…` ;
  `DEV_IDENTITY_SECRET` d'au moins 16 caractères ; `NODE_ENV` différent de `production` tant que
  [EXC-002](../exceptions/EXC-002-identite-developpement.md) n'est pas levée.

### R7 — Port déjà occupé

- **Symptôme** : le lanceur annonce un port différent de 3000, 3001 ou 9180 ; ou, en lancement direct de l'API, erreur
  de collision de port.
- **Résolution** : utiliser l'adresse affichée, ou libérer le port, ou fixer `--web-port=`, `--api-port=`,
  `--admin-port=`. En cible, les ports sont fixés (service 8080, administration 9180).

### R8 — Sonde `ready` en échec alors que `live` répond

- Voir [observabilite.md](observabilite.md), section « Diagnostic et vérifications » : vérifier la base, sa
  configuration et le délai `ADMIN_READY_TIMEOUT_MS` ; ne pas transformer le test de vie en test de dépendance.

### R9 — Tâche planifiée non exécutée ou bloquée

- **Symptôme** : fin de journée des colis, purge des réceptions attendues ou Instruction OK automatique non faite.
- **Diagnostic** : `ORDONNANCEUR_ACTIF` (défaut `true`), horaires configurés dans l'écran Règles métier (vides = aucune
  exécution), journal des exécutions dans l'administration ; une tâche déjà en cours renvoie 409.
- **Résolution** : déclencher la tâche depuis l'administration (droit `parametrage.gerer`) ou par
  `pnpm --filter @circe/api taches:executer` ; un verrou périmé (arrêt pendant une tâche) est libéré automatiquement.

### R10 — Photo introuvable (404)

- **Symptôme** : `GET /photos/:id` répond 404 sur des photos reprises de Circé.
- **Diagnostic** : 2 816 photos reprises n'ont pas de contenu (ECART-128, Q-311, Q-332).
- **Résolution** : aucune côté exploitation ; voir [known-issues.md](known-issues.md).

## 3. Reprise et rejeu

### 3.1 Reprise des données de Circé (base de dev)

Décisions Q-437, Q-438, Q-445 ; écart [EXC-007](../exceptions/EXC-007-donnees-production-dans-le-depot.md).

1. Export, lecture seule (`SELECT` uniquement) depuis le conteneur `circe-sql`, CSV hors dépôt :
   `CIRCE_SQL_PASSWORD=… pnpm --filter @circe/api export:circe [dossier]` (défaut `~/circe-export`).
2. Base de dev propre : arrêter l'application, déplacer `apps/api/prisma/dev.db`, puis `pnpm db:up && pnpm seed:ref`.
3. Import : `pnpm --filter @circe/api import:circe [dossier]` ; avec `--si-base-vide`, une base déjà alimentée est
   laissée telle quelle (utilisé par `scripts/start.mjs`).
4. Contrôle : rapport `rapport-import-<date>.json` dans le dossier d'export (volumes, rejets par motif et par règle,
   transformations, invariants : 0 attendu sauf « info »).

Conditions de cohérence : import sur base vide uniquement ; toute ligne qui viole une règle est rejetée avec ses
dépendances (rejet en cascade) et comptée ; aucune règle de service n'est modifiée pour faire passer l'import (seule
exception tracée : instructions à 0 % acceptées à l'import, Q-445, ECART-127).

### 3.2 Jeux de données fictifs

| Commande | Base | Contenu |
|---|---|---|
| `pnpm seed:ref` | dev | Référentiels issus des règles (rôles, paramètres, types) ; idempotent |
| `pnpm seed:centres` | dev | JDD des centres (Wissous, Nîmes, Nanterre, ou plateformes « … (JDD) » avec données reprises) |
| `pnpm seed:news` | dev | Bus, J-3, non-conformités |
| `pnpm seed:scenarios` | dev | JDD+ : réception, pilotage, non-conformités, formats 2 m² |
| `pnpm jdd:demo --seed=7` | dev | JDD de démonstration régénérable |
| `pnpm jdd --seed=<n> --volume=<n>` | **test** uniquement | Générateurs reproductibles et invariants (refuse toute autre base) |

### 3.3 Rejeu de traitements

- Requêtes : les POST de création et de transition acceptent `Idempotency-Key` ; rejouer une requête avec la même clé
  renvoie la réponse initiale sans nouvelle écriture (sauf ECART-105 sur deux routes d'administration).
- Tâches planifiées : idempotentes, rejouables par l'administration ou `taches:executer` (R9).
- Envoi de mails : file d'envoi persistée, traitée hors transaction métier (Q-409) ; en mode `dev`, aucun mail réel.
- Cible : procédures à exécuter avec succès sur Staging avant la mise en production (EXP-042) : `[À COMPLÉTER]`.

## 4. Indicateurs

Catalogue : [indicateurs-metier.md](indicateurs-metier.md). Métriques techniques et journaux :
[observabilite.md](observabilite.md).
