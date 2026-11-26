# TC-COO-P05 — Lignes attendues : règles de vie, rapprochement, provisoire, annulation, sources

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P05 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : règles de vie des lignes attendues (alimentation Broadcast et prépa sur contrat interne Q-187), provisoire / IP, disparition, suppression interdite, dédoublonnage, état des réservations ECR-PIL-03, suivi de production (API) ; restes : branchement des flux COO-P06, alertes COO-P07, écran ECR-PIL-02 D-10, grains EDR COO-P12 / P13, Q-005) |
| RG rattachées dans la matrice | 19 FAIT · 4 PARTIEL |
| Exigences EX rattachées (matrice) | EX-REC-504 (FAIT), EX-TRA-515 (PARTIEL), EX-THM-504 (FAIT), EX-COO-033 (PARTIEL), EX-COO-034 (PARTIEL), EX-COO-036 (FAIT), EX-COO-037 (FAIT), EX-COO-038 (PARTIEL), EX-COO-040 (PARTIEL), EX-COO-041 (PARTIEL), EX-COO-042 (FAIT), EX-COO-045 (PARTIEL), EX-EXI-003 (FAIT), EX-EXI-010 (PARTIEL), EX-EXI-011 (PARTIEL), EX-EXI-013 (FAIT), EX-EXI-014 (FAIT), EX-EXI-019 (PARTIEL), EX-EXI-056 (PARTIEL), EX-EXI-057 (FAIT), EX-EXI-058 (FAIT), EX-EXI-060 (PARTIEL), EX-REC-050 (FAIT), EX-TRA-006 (PARTIEL), EX-TRA-032 (PARTIEL), EX-TRA-042 (PARTIEL) |
| Écrans | ECR-PIL-03 |
| Profils | système (alimentation) ; dev.coord et dev.cheq en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P05-01 — Dossier sur deux semaines compté une fois ; visuel provisoire « IP à saisir »

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-101 (FAIT), RG-COO-107 (PARTIEL), RG-COO-084 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P05 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Ouvrir Pilotage › État des réservations.
- **Résultat attendu** :
  - Un dossier multi-semaines est compté une fois ; le visuel provisoire porte « IP à saisir ».
- **Tests automatisés correspondants** : [`e2e/coordination-etat-reservations.spec.ts`](../../../e2e/coordination-etat-reservations.spec.ts) ; [`apps/api/test/coordination/lignes-attendues.int.test.ts`](../../../apps/api/test/coordination/lignes-attendues.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P05-02 — Filtre « Où en est-il », grain Dossier, tuile cliquable

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-107 (PARTIEL), ECR-PIL-03 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P05 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Filtrer par avancement ; passer au grain Dossier ; cliquer la tuile « En pré-production ».
  2. Appliquer un filtre sans résultat.
- **Résultat attendu** :
  - Autant de lignes que l'indicateur ; état vide explicite pour un filtre sans résultat.
- **Tests automatisés correspondants** : [`e2e/coordination-etat-reservations.spec.ts`](../../../e2e/coordination-etat-reservations.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P05-03 — Une seule ligne active par clé ; ligne disparue ANNULEE, jamais supprimée

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-080 (FAIT), RG-COO-087 (FAIT), RG-COO-089 (FAIT)
- **Profil** : système
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Intégrer deux fois la même clé de ligne.
  2. Intégrer un flux où une ligne a disparu.
- **Résultat attendu** :
  - Pas de doublon de ligne active (RG-COO-080).
  - La ligne disparue passe ANNULEE ; les liens des affiches sont conservés (RG-COO-087, RG-COO-089).
- **Tests automatisés correspondants** : [`apps/api/test/coordination/lignes-attendues.int.test.ts`](../../../apps/api/test/coordination/lignes-attendues.int.test.ts) ; [`apps/api/test/coordination/lignes-attendues-complement.int.test.ts`](../../../apps/api/test/coordination/lignes-attendues-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P05-04 — Suivi de production sur volume (non-régression ANO-065)

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-105 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Lire le suivi de production avec 1 000 lignes × 15 faces.
- **Résultat attendu** :
  - Réponse dans le temps sans parcours quadratique (ANO-065 corrigée).
- **Tests automatisés correspondants** : [`apps/api/test/massif/volume-reel.int.test.ts`](../../../apps/api/test/massif/volume-reel.int.test.ts) ; [`apps/api/test/coordination/lignes-attendues.int.test.ts`](../../../apps/api/test/coordination/lignes-attendues.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
