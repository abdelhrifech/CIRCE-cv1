# TC-COO-P11 — Roulage : suivi 8 m², dispatch des rouleurs, bagues et étiquettes

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P11 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : dispatch du roulage, rouleurs, bagues, suivi 8 m² ; restes : moteur de répartition cible Q-276, impression physique Q-002 / Q-287, unités UM et lot Q-265, poste / machine D-02, tableau de roulage Q-278) |
| RG rattachées dans la matrice | 7 PARTIEL · 7 FAIT · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-SCR-501 (BLOQUÉ), EX-SCR-502 (BLOQUÉ), EX-SCR-507 (PARTIEL), EX-SCR-511 (FAIT), EX-SCR-515 (BLOQUÉ), EX-SCR-516 (BLOQUÉ), EX-PIL-502 (PARTIEL), EX-TRA-031 (PARTIEL) |
| Écrans | ECR-COO-08, ECR-COO-10, ECR-COO-11 |
| Profils | dev.coord, dev.cheq (rouleur, bagues), dev.admin |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P11-01 — Dispatch : trains prêts de l'atelier, affectation d'un rouleur, charge et liste de picking

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-291 (FAIT), RG-COO-294 (FAIT), RG-COO-296 (FAIT), ECR-COO-10 (FAIT)
- **Profil** : dev.cheq
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P11 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Ouvrir le dispatch du roulage, affecter un rouleur, ouvrir sa liste de picking.
- **Résultat attendu** :
  - Affectation immédiate, charge recalculée, liste de picking du rouleur.
- **Tests automatisés correspondants** : [`e2e/roulage.spec.ts`](../../../e2e/roulage.spec.ts) ; [`apps/api/test/coordination/roulage-dispatch.int.test.ts`](../../../apps/api/test/coordination/roulage-dispatch.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P11-02 — « Proposer une répartition » (règle simulée) puis « Tout désaffecter » ; rien à répartir refusé

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-293 (PARTIEL), RG-COO-294 (FAIT)
- **Profil** : dev.cheq
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P11 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Proposer une répartition, puis tout désaffecter ; recommencer sans rien à répartir.
- **Résultat attendu** :
  - Proposition appliquée (règle simulée, moteur cible Q-276) ; refus visible quand rien n'est à répartir.
- **Tests automatisés correspondants** : [`e2e/roulage.spec.ts`](../../../e2e/roulage.spec.ts) ; [`apps/api/test/coordination/roulage-dispatch.int.test.ts`](../../../apps/api/test/coordination/roulage-dispatch.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P11-03 — Bagues : rouleur obligatoire, passage « En production », réimpression avec motif

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-298 (PARTIEL), RG-COO-299 (PARTIEL), RG-COO-300 (PARTIEL), RG-COO-301 (FAIT), RG-COO-302 (PARTIEL), ECR-COO-11 (PARTIEL)
- **Profil** : dev.cheq
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P11 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Imprimer des bagues sans rouleur, puis avec rouleur.
  2. Modifier les textes ; réimprimer sans puis avec motif.
- **Résultat attendu** :
  - Sans rouleur : refus ; avec rouleur : unités « En production ».
  - Réimpression sans motif refusée.
- **Tests automatisés correspondants** : [`e2e/roulage.spec.ts`](../../../e2e/roulage.spec.ts) ; [`apps/api/test/coordination/roulage-bagues.int.test.ts`](../../../apps/api/test/coordination/roulage-bagues.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P11-04 — Suivi 8 m² : saisie en ligne des demies, valeur négative refusée

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-237 (PARTIEL), ECR-COO-08 (PARTIEL)
- **Profil** : dev.cheq
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P11 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Saisir les demies et les 8 m² finales ; saisir une valeur négative.
- **Résultat attendu** :
  - Reste à faire recalculé ; valeur négative refusée.
- **Tests automatisés correspondants** : [`e2e/roulage.spec.ts`](../../../e2e/roulage.spec.ts) ; [`apps/api/test/coordination/roulage-8m2-rouleurs.int.test.ts`](../../../apps/api/test/coordination/roulage-8m2-rouleurs.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
