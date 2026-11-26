# TC-COO-P02 — Liste des instructions et Instruction OK (automatique, manuelle), écart Broadcast, correction

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P02 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : Instruction OK auto / manuelle, saisie, écart, version Broadcast, correction ; reste Q-257, Q-375, alertes COO-P05, trains coo2) |
| RG rattachées dans la matrice | 10 FAIT · 7 PARTIEL · 1 NON REPRIS — décision à valider (Q-209, Q-224) · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-COO-501 (PARTIEL), EX-COO-502 (PARTIEL), EX-COO-504 (PARTIEL), EX-COO-508 (PARTIEL), EX-TRA-514 (PARTIEL), EX-COO-018 (FAIT), EX-COO-019 (PARTIEL), EX-COO-022 (PARTIEL), EX-COO-023 (PARTIEL), EX-COO-026 (FAIT), EX-COO-028 (PARTIEL), EX-COO-049 (FAIT), EX-COO-050 (PARTIEL), EX-EXI-031 (FAIT), EX-EXI-032 (FAIT), EX-TRA-030 (PARTIEL) |
| Écrans | ECR-COO-01, ECR-COO-02, ECR-COO-04 |
| Profils | dev.coord, dev.admin ; dev.com en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P02-01 — Filtre « À faire » par défaut, écart signalé

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-060 (PARTIEL), RG-COO-055 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P02 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Ouvrir la liste des instructions.
- **Résultat attendu** :
  - « À faire (Coordination) » par défaut : dossiers en cours ; un écart Broadcast / Circé est signalé.
- **Tests automatisés correspondants** : [`e2e/coordination-instruction-ok.spec.ts`](../../../e2e/coordination-instruction-ok.spec.ts) ; [`apps/api/test/coordination/instruction-ok.int.test.ts`](../../../apps/api/test/coordination/instruction-ok.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P02-02 — Fiche dossier : position proposée, entretien saisi, Instruction OK manuelle

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-059 (FAIT), RG-COO-048 (PARTIEL), RG-COO-044 (FAIT), ECR-COO-02 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P02 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir la fiche dossier, vérifier la position, saisir l'entretien.
  2. Poser l'Instruction OK après contrôle.
- **Résultat attendu** :
  - L'instruction passe INSTRUCTION_OK (mode manuel) et est historisée.
- **Tests automatisés correspondants** : [`e2e/coordination-instruction-ok.spec.ts`](../../../e2e/coordination-instruction-ok.spec.ts) ; [`apps/api/test/coordination/instruction-ok.int.test.ts`](../../../apps/api/test/coordination/instruction-ok.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P02-03 — Instruction OK refusée si la répartition n'est pas à 100 % ou avant la prépa

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-043 (FAIT), RG-COO-052 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P02 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Poser une Instruction OK groupée sur un dossier réparti à 90 %.
  2. Poser une Instruction OK avant réception de la préparation.
- **Résultat attendu** :
  - Refus avec le message de la règle ; statut inchangé.
- **Tests automatisés correspondants** : [`e2e/coordination-instruction-ok.spec.ts`](../../../e2e/coordination-instruction-ok.spec.ts) ; [`apps/api/test/coordination/instruction-ok.int.test.ts`](../../../apps/api/test/coordination/instruction-ok.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P02-04 — Écart : appliquer la version Broadcast, puis demander une correction

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-056 (PARTIEL), RG-COO-057 (PARTIEL), ECR-COO-04 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P02 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Sur un dossier en écart, appliquer la version Broadcast.
  2. Sur un autre, demander une correction à Broadcast.
- **Résultat attendu** :
  - La version Broadcast est reprise ; la demande de correction est tracée (envoi réel dépendant de Q-005).
- **Tests automatisés correspondants** : [`e2e/coordination-instruction-ok.spec.ts`](../../../e2e/coordination-instruction-ok.spec.ts) ; [`apps/api/test/coordination/instruction-ok-complement.int.test.ts`](../../../apps/api/test/coordination/instruction-ok-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P02-05 — Instruction OK automatique (règle de Nariman)

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-042 (FAIT)
- **Profil** : système
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Intégrer une préparation qui remplit les conditions de l'Instruction OK automatique.
- **Résultat attendu** :
  - L'instruction passe INSTRUCTION_OK en mode AUTO (décision Q-204, option b).
- **Tests automatisés correspondants** : [`apps/api/test/coordination/instruction-ok.int.test.ts`](../../../apps/api/test/coordination/instruction-ok.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
