# TC-COO-P07 — Alertes Pré-Prod et vérification des thèmes

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P07 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : Pilotage › Alertes (REC + COO, calculées), Vérification des thèmes (proches, annonceurs, thèmes modifiés dans Broadcast + reprise), deadline ECR-COO-01 ; restes : mails Q-375, acquittement Q-220, D-08, D-15 ; spec-auditor à passer) |
| RG rattachées dans la matrice | 5 FAIT · 7 PARTIEL |
| Exigences EX rattachées (matrice) | EX-COO-512 (PARTIEL), EX-COO-513 (PARTIEL), EX-FIX-503 (PARTIEL), EX-THM-502 (PARTIEL), EX-ADM-504 (PARTIEL), EX-COO-015 (FAIT), EX-COO-027 (FAIT), EX-COO-029 (PARTIEL), EX-COO-030 (PARTIEL), EX-COO-031 (FAIT), EX-COO-047 (PARTIEL), EX-EXI-077 (PARTIEL), EX-EXI-079 (PARTIEL), EX-REC-036 (FAIT), EX-REC-065 (FAIT), EX-REC-066 (FAIT), EX-REC-067 (FAIT), EX-REC-071 (FAIT) |
| Écrans | ECR-TRA-01, ECR-COO-02 (et ECR-THM-01 à 03) |
| Profils | dev.coord, dev.admin ; dev.cheq en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P07-01 — Alerte « Thème modifié dans Broadcast » et reprise de la version Broadcast

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-068 (PARTIEL), ECR-TRA-01 (PARTIEL), ECR-THM-03 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P07 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Ouvrir Alertes, ouvrir l'alerte « Thème modifié dans Broadcast ».
  2. Reprendre la version Broadcast.
- **Résultat attendu** :
  - L'alerte mène à la fiche ; la version Broadcast est reprise et l'alerte levée.
- **Tests automatisés correspondants** : [`e2e/coordination-alertes.spec.ts`](../../../e2e/coordination-alertes.spec.ts) ; [`apps/api/test/coordination/alertes-preprod.int.test.ts`](../../../apps/api/test/coordination/alertes-preprod.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P07-02 — Fiche dossier : encadrés « Thème modifié » et « thème proche »

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-068 (PARTIEL), RG-COO-069 (PARTIEL), ECR-COO-02 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P07 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir la fiche d'un dossier concerné.
- **Résultat attendu** :
  - Les deux encadrés sont affichés avec leurs actions.
- **Tests automatisés correspondants** : [`e2e/coordination-alertes.spec.ts`](../../../e2e/coordination-alertes.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P07-03 — Thèmes proches : « Visuels différents » lève l'alerte, « Demander la correction » trace la demande

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-069 (PARTIEL), ECR-THM-01 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P07 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir Vérification des thèmes, choisir « Visuels différents » sur une paire.
  2. Sur une autre paire, « Demander la correction ».
- **Résultat attendu** :
  - L'alerte est levée ; la demande est tracée.
- **Tests automatisés correspondants** : [`e2e/coordination-alertes.spec.ts`](../../../e2e/coordination-alertes.spec.ts) ; [`apps/api/test/coordination/alertes-preprod-complement.int.test.ts`](../../../apps/api/test/coordination/alertes-preprod-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P07-04 — Production lancée sur tous les dossiers : « Rien à demander »

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-069 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P07 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Demander une correction sur une paire dont tous les dossiers sont en production.
- **Résultat attendu** :
  - Refus « Rien à demander ».
- **Tests automatisés correspondants** : [`e2e/coordination-alertes.spec.ts`](../../../e2e/coordination-alertes.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P07-05 — Alerte levée quand sa condition disparaît

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-066 (FAIT), RG-COO-067 (FAIT)
- **Profil** : système
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Créer la condition d'une alerte puis la faire disparaître.
- **Résultat attendu** :
  - L'alerte est ouverte puis levée automatiquement, sans doublon.
- **Tests automatisés correspondants** : [`apps/api/test/coordination/alertes-preprod.int.test.ts`](../../../apps/api/test/coordination/alertes-preprod.int.test.ts) ; [`apps/api/test/coordination/alertes-preprod-complement.int.test.ts`](../../../apps/api/test/coordination/alertes-preprod-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
