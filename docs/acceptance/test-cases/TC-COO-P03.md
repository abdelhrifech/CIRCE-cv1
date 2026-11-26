# TC-COO-P03 — Validation admin : proposition de rattachement, cas sûrs, affiches à doute

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P03 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : état de validation calculé, motifs, cas sûrs, pastille, « Valider la sélection » + ECR-COO-03 ; Q-184 TRANCHÉE (panier = BL) ; restes : alertes COO-P05, effets COO-P04, lecture du BL Q-112) |
| RG rattachées dans la matrice | 13 FAIT · 4 PARTIEL |
| Exigences EX rattachées (matrice) | EX-COO-506 (PARTIEL), EX-COO-004 (PARTIEL), EX-COO-005 (PARTIEL), EX-COO-006 (PARTIEL), EX-COO-007 (PARTIEL), EX-COO-008 (FAIT), EX-COO-012 (FAIT), EX-COO-013 (PARTIEL), EX-EXI-052 (PARTIEL) |
| Écrans | ECR-COO-01, ECR-COO-03 |
| Profils | dev.coord, dev.admin (validation) ; dev.recep (rattachement seul) |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P03-01 — Proposition « à confirmer » après réception, rien n'est validé

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-X-001 (FAIT), RG-X-005 (FAIT), RG-COO-005 (FAIT)
- **Profil** : dev.recep puis dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P03 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. La Réception reçoit le BL d'un dossier.
  2. La Coordination ouvre la liste.
- **Résultat attendu** :
  - Une proposition « à confirmer » apparaît ; aucune affiche n'est validée automatiquement.
- **Tests automatisés correspondants** : [`e2e/interactions.spec.ts`](../../../e2e/interactions.spec.ts) ; [`apps/api/test/coordination/validation-admin.int.test.ts`](../../../apps/api/test/coordination/validation-admin.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P03-02 — Pastilles « À confirmer » et cas sûr pré-coché

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-019 (FAIT), RG-COO-011 (FAIT), ECR-COO-01 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P03 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir la liste ECR-COO-01.
- **Résultat attendu** :
  - La pastille du dossier indique « À confirmer » ; le cas sûr est pré-coché, jamais les doutes.
- **Tests automatisés correspondants** : [`e2e/coordination-validation-admin.spec.ts`](../../../e2e/coordination-validation-admin.spec.ts) ; [`apps/api/test/coordination/validation-admin.int.test.ts`](../../../apps/api/test/coordination/validation-admin.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P03-03 — « Valider la sélection » sans affiche à confirmer refusé

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-013 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P03 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Lancer « Valider la sélection » sur une sélection sans affiche à confirmer.
- **Résultat attendu** :
  - Refus « Rien à valider ».
- **Tests automatisés correspondants** : [`e2e/coordination-validation-admin.spec.ts`](../../../e2e/coordination-validation-admin.spec.ts) ; [`apps/api/test/coordination/validation-admin.int.test.ts`](../../../apps/api/test/coordination/validation-admin.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P03-04 — Doutes dans la sélection : confirmation explicite

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-012 (FAIT), RG-COO-006 (PARTIEL), RG-X-053 (FAIT), ECR-COO-03 (FAIT), RG-NEW-REC-004 (Réalisé, voir précisions)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P03 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Sélectionner des affiches dont certaines à doute ; valider.
  2. Choisir « sans doute seulement » puis recommencer en confirmant les doutes.
- **Résultat attendu** :
  - La modale ECR-COO-03 demande une confirmation explicite ; le motif de doute est affiché ; aucune affiche à doute n'est validée sans confirmation.
- **Tests automatisés correspondants** : [`e2e/coordination-validation-admin.spec.ts`](../../../e2e/coordination-validation-admin.spec.ts) ; [`apps/api/test/coordination/validation-admin.int.test.ts`](../../../apps/api/test/coordination/validation-admin.int.test.ts)
- **Remarque** : Le 24/11, `coordination-validation-admin.spec.ts:18` échouait (Q-444, validation admin en 2 m² fixe / pliage) : voir la campagne du 24/11.
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
