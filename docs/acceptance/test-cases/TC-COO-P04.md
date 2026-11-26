# TC-COO-P04 — Validation admin : confirmer, valider en lot, annuler, effets et traçabilité

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P04 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : confirmation unitaire et annulation, effets (étiquette rack, picking, à traiter, • / ✓, n° au suivi), rattachements manuels, ligne modifiée ; restes : envoi du retour Broadcast Q-005, écrans suivi de prod / état des réservations D-10, comptes génériques Q-003, fusion Q-100, alertes affichées COO-P07 (RG-COO-030 à 032, RG-X-050) ; test-engineer fait, audit 1re passe NON CONFORME corrigée, 2e passe à faire) |
| RG rattachées dans la matrice | 22 FAIT · 4 PARTIEL |
| Exigences EX rattachées (matrice) | EX-COO-009 (PARTIEL), EX-COO-014 (PARTIEL), EX-COO-016 (PARTIEL), EX-COO-048 (PARTIEL), EX-EXI-053 (PARTIEL), EX-TRA-005 (PARTIEL), EX-TRA-007 (PARTIEL), EX-TRA-024 (PARTIEL), EX-TRA-036 (PARTIEL) |
| Écrans | ECR-COO-01, ECR-COO-02, ECR-REC-04, ECR-REC-05 |
| Profils | dev.coord, dev.admin (valider, annuler) ; dev.recep et dev.cheq en lecture ; dev.com en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P04-01 — Valider puis annuler la validation d'une affiche depuis la fiche dossier

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-008 (FAIT), RG-COO-014 (FAIT), RG-COO-015 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P04 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Valider une affiche depuis la fiche dossier.
  2. Annuler la validation.
- **Résultat attendu** :
  - Affiche VALIDEE avec nom et date (RG-COO-008, RG-COO-015).
  - Annulation : retour à « à confirmer (doute) », motif ANNULEE (RG-COO-014).
- **Tests automatisés correspondants** : [`e2e/coordination-effets-validation.spec.ts`](../../../e2e/coordination-effets-validation.spec.ts) ; [`apps/api/test/coordination/effets-validation.int.test.ts`](../../../apps/api/test/coordination/effets-validation.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P04-02 — Effets de la validation : étiquette rack, picking, sortie de la liste

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-021 (PARTIEL), RG-COO-023 (FAIT), RG-COO-025 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P04 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Valider une affiche ; consulter la fiche affiche et la liste à traiter.
- **Résultat attendu** :
  - N° d'affiche visible, étiquette rack proposée, l'affiche quitte la liste à traiter (RG-COO-021, RG-COO-023, RG-COO-025).
- **Tests automatisés correspondants** : [`apps/api/test/coordination/effets-validation.int.test.ts`](../../../apps/api/test/coordination/effets-validation.int.test.ts) ; [`apps/api/test/coordination/effets-validation-complement.int.test.ts`](../../../apps/api/test/coordination/effets-validation-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P04-03 — Validation réservée à la Coordination et à l'administrateur

- **Type** : Permission
- **Exigences et règles couvertes** : RG-COO-009 (FAIT)
- **Profil** : dev.recep, dev.cheq (refusés) ; dev.coord, dev.admin (autorisés)
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Tenter de valider une affiche avec chaque profil.
- **Résultat attendu** :
  - Profils non autorisés : 403 ; Coordination et administrateur : succès.
- **Tests automatisés correspondants** : [`apps/api/test/coordination/effets-validation.int.test.ts`](../../../apps/api/test/coordination/effets-validation.int.test.ts) ; [`apps/api/test/coordination/validation-admin.int.test.ts`](../../../apps/api/test/coordination/validation-admin.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P04-04 — Annuler une affiche non validée refusé ; stock inchangé à l'annulation

- **Type** : Transition interdite
- **Exigences et règles couvertes** : RG-X-050 (FAIT), RG-X-053 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P04 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Annuler la validation d'une affiche non validée.
  2. Valider puis annuler une affiche et lire son stock côté Réception.
- **Résultat attendu** :
  - Annulation d'une affiche non validée : 409 (RG-X-050).
  - La Réception voit l'annulation sur la fiche affiche ; le stock ne bouge pas.
- **Tests automatisés correspondants** : [`e2e/interactions.spec.ts`](../../../e2e/interactions.spec.ts) ; [`apps/api/test/coordination/effets-validation.int.test.ts`](../../../apps/api/test/coordination/effets-validation.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P04-05 — Rattachement d'une inconnue par la Coordination (vaut validation), puis annulation et revalidation

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-X-051 (FAIT), RG-COO-017 (FAIT), RG-X-015 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P04 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Rattacher une réception inconnue depuis ECR-REC-04.
  2. Annuler puis revalider depuis la fiche affiche.
- **Résultat attendu** :
  - L'affiche est validée au rattachement ; annulation et revalidation tracées.
- **Tests automatisés correspondants** : [`e2e/coordination-effets-validation.spec.ts`](../../../e2e/coordination-effets-validation.spec.ts) ; [`apps/api/test/coordination/effets-validation-complement.int.test.ts`](../../../apps/api/test/coordination/effets-validation-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
