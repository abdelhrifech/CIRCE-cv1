# TC-COO-P13 — Unités de manutention, colis, expédition et intégration AMT

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P13 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : colisage, expédition, fin de journée, sorties de stock, garde RG-COO-249, site choisi ; [périmé : levé à l'étape 8, 2026-11-05] création des UM par « Colisage » sous HYPOTHÈSE Q-265 (c) / Q-404, RG-COO-260 à 262 PARTIEL, à valider ; restes : mail Q-375, Geodis / Livré / étiquette / boucle Q-284, ECR-EXP-03 ; audit final P11-P13 passé le 2026-11-05 : P12 et P13 NON CONFORMES uniquement à cause de Q-265 ; depuis l'étape 8 Q-265 est une HYPOTHÈSE PRISE (option (c)) à valider, statuts du groupe PARTIEL) |
| RG rattachées dans la matrice | 9 PARTIEL · 5 FAIT · 5 NON REPRIS (hypothèse Q-274) |
| Exigences EX rattachées (matrice) | EX-EXP-501 (FAIT), EX-EXP-503 (FAIT), EX-EXP-506 (PARTIEL), EX-EXI-041 (PARTIEL), EX-EXI-073 (PARTIEL), EX-EXI-085 (PARTIEL) |
| Écrans | ECR-EXP-01, ECR-EXP-02 |
| Profils | dev.expe, dev.cheq, dev.coord ; dev.admin |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P13-01 — Colisage : 25 affiches à 10 par UM donnent 3 UM ; second colisage refusé

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-260 (PARTIEL), RG-COO-261 (PARTIEL), RG-COO-262 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P12 » de `apps/api/scripts/e2e-seed.ts`.
  - Hypothèse Q-265 option (c) à valider (statut PARTIEL).
- **Étapes** :
  1. Lancer « Colisage » sur une ligne de 25 affiches à 10 par UM ; relancer.
- **Résultat attendu** :
  - 3 UM « En cours » ; le second colisage est refusé.
- **Tests automatisés correspondants** : [`e2e/coordination-unitaire.spec.ts`](../../../e2e/coordination-unitaire.spec.ts) ; [`apps/api/test/coordination/liberation-colisage.int.test.ts`](../../../apps/api/test/coordination/liberation-colisage.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P13-02 — Scan et colisage : code inconnu refusé, ouverture du colis, retrait, colis vidé supprimé

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-265 (FAIT), RG-COO-267 (FAIT), ECR-EXP-01 (PARTIEL)
- **Profil** : dev.expe
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P13 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Scanner un code inconnu ; scanner une UM ; retirer l'UM.
- **Résultat attendu** :
  - Code inconnu refusé ; le premier scan ouvre un colis ; le colis vidé est supprimé.
- **Tests automatisés correspondants** : [`e2e/roulage-expedition.spec.ts`](../../../e2e/roulage-expedition.spec.ts) ; [`apps/api/test/coordination/colis.int.test.ts`](../../../apps/api/test/coordination/colis.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P13-03 — Clore le colis puis fin de journée : colis « Expédié », confirmation préalable

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-268 (PARTIEL), RG-COO-269 (PARTIEL), RG-X-087 (PARTIEL)
- **Profil** : dev.expe
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P13 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Clore un colis ; lancer la fin de journée et confirmer.
- **Résultat attendu** :
  - Confirmation demandée avant l'action irréversible ; colis expédié ; sorties de stock déclenchées (RG-X-087).
- **Tests automatisés correspondants** : [`e2e/roulage-expedition.spec.ts`](../../../e2e/roulage-expedition.spec.ts) ; [`apps/api/test/coordination/colis.int.test.ts`](../../../apps/api/test/coordination/colis.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P13-04 — Liste des colis et départs camions : filtres, états vides

- **Type** : Nominal
- **Exigences et règles couvertes** : ECR-EXP-02 (PARTIEL), ECR-EXP-03 (PARTIEL)
- **Profil** : dev.expe
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P13 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir la liste des colis, filtrer par statut ; ouvrir Départs camions.
- **Résultat attendu** :
  - Filtre appliqué ; état vide explicite ; avancement du colisage par départ et destinataire.
- **Tests automatisés correspondants** : [`e2e/roulage-expedition.spec.ts`](../../../e2e/roulage-expedition.spec.ts) ; [`apps/api/test/coordination/expedition-departs-complement.int.test.ts`](../../../apps/api/test/coordination/expedition-departs-complement.int.test.ts)
- **Remarque** : Anomalie ouverte ANO-077 (Q-448) : l'entrée « Déroulant › Liste des colis » est en erreur.
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
