# TC-COO-P08 — Déblocage des préparations et « Rendre la main »

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P08 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | À FAIRE |
| RG rattachées dans la matrice | 14 FAIT · 2 PARTIEL · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-EXI-045 (PARTIEL) |
| Écrans | ECR-COO-09 |
| Profils | dev.coord, dev.admin |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P08-01 — Recherche sans critère : grille vide et message

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-140 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P08 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Ouvrir le déblocage sans saisir de n° de préparation ou de dossier.
- **Résultat attendu** :
  - Grille vide et message demandant un critère.
- **Tests automatisés correspondants** : [`e2e/coordination-deblocage.spec.ts`](../../../e2e/coordination-deblocage.spec.ts) ; [`apps/api/test/coordination/deblocage.int.test.ts`](../../../apps/api/test/coordination/deblocage.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P08-02 — Groupe avec une UM « Préparé » : « Rendre la main » désactivé

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-143 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P08 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Rechercher un groupe dont une UM est au statut 6 ou plus.
- **Résultat attendu** :
  - Action désactivée, motif affiché ; l'API refuse en 422.
- **Tests automatisés correspondants** : [`e2e/coordination-deblocage.spec.ts`](../../../e2e/coordination-deblocage.spec.ts) ; [`apps/api/test/coordination/deblocage.int.test.ts`](../../../apps/api/test/coordination/deblocage.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P08-03 — « Rendre la main » : motif par défaut, confirmation, suivi des déblocages

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-145 (PARTIEL), RG-COO-151 (FAIT), RG-COO-149 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P08 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Rendre la main sur un groupe débloquable, confirmer.
  2. Ouvrir le suivi des déblocages.
- **Résultat attendu** :
  - Déblocage atomique et tracé (qui, quand, quoi) ; il apparaît dans le suivi.
- **Tests automatisés correspondants** : [`e2e/coordination-deblocage.spec.ts`](../../../e2e/coordination-deblocage.spec.ts) ; [`apps/api/test/coordination/deblocage-complement.int.test.ts`](../../../apps/api/test/coordination/deblocage-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
