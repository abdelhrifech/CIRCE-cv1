# TC-COO-P10 — Export des trains et préparation du déroulant (suivi par thème, rouleur)

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P10 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : export des trains, export préparation, Au roulage, rouleur, suivi par thème, préparation, générateur de fichiers SIMULÉ ; restes : Bagues COO-P11, fichiers réels D-15, Paris Q-255, atelier 5 et 6 du référentiel) |
| RG rattachées dans la matrice | 7 FAIT · 7 PARTIEL |
| Exigences EX rattachées (matrice) | EX-REC-524 (PARTIEL), EX-COO-509 (PARTIEL), EX-SCR-508 (PARTIEL), EX-SCR-518 (FAIT), EX-COO-024 (FAIT), EX-EXI-033 (PARTIEL), EX-EXI-034 (PARTIEL), EX-EXI-035 (PARTIEL), EX-EXI-037 (PARTIEL) |
| Écrans | ECR-COO-05, ECR-COO-06, ECR-COO-07, ECR-GEN-01 |
| Profils | dev.coord (export) ; dev.cheq ; dev.admin |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P10-01 — « Exporter les trains… » : simulation, export réel, historique

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-211 (FAIT), RG-COO-213 (PARTIEL), RG-COO-210 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P10 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Lancer la simulation d'export, puis l'export réel ; ouvrir l'historique.
- **Résultat attendu** :
  - Simulation sans changement de statut ; export réel : faces « Instruction ok » passées « Prêt à produire » ; dossier « En cours » signalé ; historique alimenté.
- **Tests automatisés correspondants** : [`e2e/coordination-export-trains.spec.ts`](../../../e2e/coordination-export-trains.spec.ts) ; [`apps/api/test/coordination/export-trains.int.test.ts`](../../../apps/api/test/coordination/export-trains.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P10-02 — Export réservé à la Coordination

- **Type** : Permission
- **Exigences et règles couvertes** : RG-COO-212 (FAIT)
- **Profil** : dev.cheq (refusé), dev.coord (autorisé)
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Lancer l'export avec un profil non Coordination.
- **Résultat attendu** :
  - HTTP 403.
- **Tests automatisés correspondants** : [`apps/api/test/coordination/export-trains.int.test.ts`](../../../apps/api/test/coordination/export-trains.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P10-03 — Suivi par thème : besoin, couvert, pré-assemblage

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-230 (FAIT), RG-COO-233 (FAIT), ECR-COO-06 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P10 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir le suivi par thème, « Marquer pré-assemblé » puis « Désassembler ».
- **Résultat attendu** :
  - Besoin et couvert par thème ; l'état de pré-assemblage suit l'action.
- **Tests automatisés correspondants** : [`e2e/coordination-export-trains.spec.ts`](../../../e2e/coordination-export-trains.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P10-04 — Préparation : choix du rouleur ; export préparation d'un atelier non autorisé refusé ; plafond de 20 thèmes

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-215 (PARTIEL), RG-COO-235 (PARTIEL), RG-COO-236 (FAIT), RG-COO-216 (FAIT), ECR-COO-07 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P10 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Choisir le rouleur dans la vue Préparation.
  2. Lancer l'export préparation d'un atelier non autorisé ; puis avec plus de 20 thèmes.
- **Résultat attendu** :
  - Rouleur enregistré ; refus pour l'atelier non autorisé et au-delà de 20 thèmes.
- **Tests automatisés correspondants** : [`e2e/coordination-export-trains.spec.ts`](../../../e2e/coordination-export-trains.spec.ts) ; [`apps/api/test/coordination/export-trains.int.test.ts`](../../../apps/api/test/coordination/export-trains.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P10-05 — Générateur de fichiers : train prêt, fichier simulé préparé puis envoyé (envoi simulé)

- **Type** : Nominal
- **Exigences et règles couvertes** : ECR-GEN-01 (PARTIEL), ECR-GEN-03 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P10 » de `apps/api/scripts/e2e-seed.ts`.
  - Génération réelle des fichiers machine : dépendance D-15 (simulée).
- **Étapes** :
  1. Choisir un train prêt, préparer le fichier, l'envoyer.
- **Résultat attendu** :
  - Compteur de tiroirs, bilan de génération ; envoi marqué simulé.
- **Tests automatisés correspondants** : [`e2e/coordination-export-trains.spec.ts`](../../../e2e/coordination-export-trains.spec.ts) ; [`apps/api/test/coordination/suivi-generation.int.test.ts`](../../../apps/api/test/coordination/suivi-generation.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
