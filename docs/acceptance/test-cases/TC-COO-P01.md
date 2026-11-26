# TC-COO-P01 — Socle Coordination : droits, périmètre, statuts d'instruction, intégration, historique

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P01 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : socle implémenté, testé ; Instruction OK COO-P02, validation admin COO-P03, alertes COO-P05) |
| RG rattachées dans la matrice | 6 PARTIEL · 8 FAIT |
| Exigences EX rattachées (matrice) | EX-REC-523 (FAIT), EX-COO-003 (FAIT), EX-COO-020 (PARTIEL), EX-EXI-030 (PARTIEL), EX-EXI-070 (PARTIEL), EX-EXI-072 (PARTIEL), EX-REC-072 (FAIT), EX-TRA-001 (PARTIEL), EX-TRA-002 (PARTIEL), EX-TRA-003 (PARTIEL), EX-TRA-004 (FAIT), EX-TRA-034 (PARTIEL) |
| Écrans | ECR-COO-01 |
| Profils | dev.coord, dev.admin ; dev.cheq, dev.expe, dev.recep selon périmètre ; dev.com en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P01-01 — Liste des instructions : préparation et instructions ; dossier annulé sans objet

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-063 (FAIT), RG-COO-062 (PARTIEL), RG-COO-040 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P01 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Ouvrir Validation admin et Instruction OK (liste des instructions).
- **Résultat attendu** :
  - La liste montre le statut de préparation et les instructions ; un dossier annulé affiche « — » (RG-COO-063, RG-COO-062).
- **Tests automatisés correspondants** : [`e2e/coordination-socle.spec.ts`](../../../e2e/coordination-socle.spec.ts) ; [`apps/api/test/coordination/socle.int.test.ts`](../../../apps/api/test/coordination/socle.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P01-02 — Conflit de version et transition non listée refusés

- **Type** : Transition interdite
- **Exigences et règles couvertes** : RG-COO-040 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P01 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Modifier une instruction déjà modifiée entre-temps.
  2. Demander une transition absente de la table.
- **Résultat attendu** :
  - HTTP 409 avec le message du serveur ; aucune écriture.
- **Tests automatisés correspondants** : [`e2e/coordination-socle.spec.ts`](../../../e2e/coordination-socle.spec.ts) ; [`apps/api/test/coordination/socle.int.test.ts`](../../../apps/api/test/coordination/socle.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P01-03 — « Remettre à traiter » une instruction annulée ; retour arrière de l'Instruction OK

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-045 (FAIT), RG-COO-046 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P01 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Remettre à traiter une instruction annulée.
  2. Revenir sur une Instruction OK.
- **Résultat attendu** :
  - L'instruction annulée redevient à traiter (RG-COO-045).
  - Avertissement puis calcul des trains effacé (RG-COO-046).
- **Tests automatisés correspondants** : [`e2e/coordination-socle.spec.ts`](../../../e2e/coordination-socle.spec.ts) ; [`apps/api/test/coordination/socle.int.test.ts`](../../../apps/api/test/coordination/socle.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P01-04 — Commerce en lecture seule ; droit absent refusé

- **Type** : Permission
- **Exigences et règles couvertes** : RG-COO-165 (PARTIEL), RG-COO-168 (FAIT)
- **Profil** : dev.com (refusé en écriture), dev.coord (autorisé)
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Avec le profil commerce, tenter une écriture de coordination.
- **Résultat attendu** :
  - Lecture permise, écriture refusée (403) (RG-COO-168, RG-COO-165).
- **Tests automatisés correspondants** : [`apps/api/test/coordination/socle.int.test.ts`](../../../apps/api/test/coordination/socle.int.test.ts) ; [`apps/api/test/coordination/socle-complement.int.test.ts`](../../../apps/api/test/coordination/socle-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
