# TC-COO-P09 — Trains : identifiant, positions, faces, couverture, fractionnement, liste (ECR-COO-05)

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P09 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : calcul des trains à l'Instruction OK, liste ECR-COO-05, couverture, fractionner, raccrocher, créer, supprimer, changer statut, annuler thème, débloquer semaine, dupliquer ; restes : boutons des écrans COO-P10, Paris Q-255, RG-COO-204 Q-257) |
| RG rattachées dans la matrice | 14 FAIT · 9 PARTIEL · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-COO-505 (FAIT), EX-FIX-509 (PARTIEL), EX-SCR-506 (FAIT), EX-SCR-509 (PARTIEL), EX-SCR-510 (FAIT), EX-SCR-512 (FAIT), EX-PIL-501 (PARTIEL), EX-ADM-503 (PARTIEL), EX-COO-021 (FAIT), EX-EXI-036 (FAIT) |
| Écrans | ECR-COO-05 |
| Profils | dev.coord, dev.admin, dev.cheq (lecture n° de panneau) |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P09-01 — Liste filtrée par dossier : train EN_ATTENTE et train PRÊT

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-208 (PARTIEL), RG-COO-228 (PARTIEL), ECR-COO-05 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P09 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Ouvrir la liste des trains, filtrer par dossier.
- **Résultat attendu** :
  - Un train avec un visuel manquant est EN_ATTENTE ; un train couvert est PRÊT.
- **Tests automatisés correspondants** : [`e2e/coordination-trains.spec.ts`](../../../e2e/coordination-trains.spec.ts) ; [`apps/api/test/coordination/trains.int.test.ts`](../../../apps/api/test/coordination/trains.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P09-02 — Fractionner un train ; raccrocher un visuel

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-221 (FAIT), RG-COO-222 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P09 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir la fiche d'un train EN_ATTENTE, « Fractionner ».
  2. « Raccrocher un visuel » à un train prêt.
- **Résultat attendu** :
  - Le train passe Prêt, la position manquante est fractionnée ; une position s'ajoute au raccrochage.
- **Tests automatisés correspondants** : [`e2e/coordination-trains.spec.ts`](../../../e2e/coordination-trains.spec.ts) ; [`apps/api/test/coordination/trains.int.test.ts`](../../../apps/api/test/coordination/trains.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P09-03 — Création d'un train de pré-test : rejet puis succès ; suppression sans motif refusée

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-224 (FAIT), RG-COO-225 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P09 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Créer un train de pré-test avec une saisie incomplète, puis complète.
  2. Supprimer un train sans motif.
- **Résultat attendu** :
  - Rejet puis création ; suppression sans motif refusée.
- **Tests automatisés correspondants** : [`e2e/coordination-trains.spec.ts`](../../../e2e/coordination-trains.spec.ts) ; [`apps/api/test/coordination/trains.int.test.ts`](../../../apps/api/test/coordination/trains.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P09-04 — Train EN_PROD immuable ; version périmée refusée

- **Type** : Transition interdite
- **Exigences et règles couvertes** : RG-COO-223 (FAIT), RG-COO-308 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Modifier ou supprimer un train EN_PROD.
  2. Lancer une action de masse avec une version périmée.
- **Résultat attendu** :
  - HTTP 409 dans les deux cas.
- **Tests automatisés correspondants** : [`apps/api/test/coordination/trains.int.test.ts`](../../../apps/api/test/coordination/trains.int.test.ts) ; [`apps/api/test/coordination/trains-complement.int.test.ts`](../../../apps/api/test/coordination/trains-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
