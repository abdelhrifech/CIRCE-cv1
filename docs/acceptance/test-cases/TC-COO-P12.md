# TC-COO-P12 — Préparation 2 m² fixe, pliage et bus : libération, rendre la main, comptage, quantités à encoller

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P12 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : liste des unités, entretien à l'afficheur, quantité, corriger l'intitulé, rendre la main, retirer / préparer, comptage du pliage, fiche de synthèse, quantités à encoller du bus, réalignement de l'entretien ; [périmé : levé à l'étape 8, 2026-11-05] libération de la semaine, statut « à libérer », repère « Arrivé après libération » et création des UM implémentés sous HYPOTHÈSE Q-265 option (c) / Q-404, PARTIEL, à valider par l'utilisateur ; restes : mail Pré-Prod Q-375, états de collage, flux Bus Q-279, colis COO-P13) |
| RG rattachées dans la matrice | 3 FAIT · 19 PARTIEL |
| Exigences EX rattachées (matrice) | EX-COO-511 (PARTIEL), EX-FIX-501 (PARTIEL), EX-FIX-504 (PARTIEL), EX-FIX-505 (PARTIEL), EX-FIX-506 (PARTIEL), EX-FIX-508 (PARTIEL), EX-FIX-510 (PARTIEL), EX-BUS-501 (PARTIEL), EX-BUS-502 (PARTIEL), EX-BUS-503 (PARTIEL), EX-BUS-504 (PARTIEL), EX-COO-025 (PARTIEL), EX-EXI-040 (PARTIEL), EX-EXI-042 (PARTIEL), EX-EXI-043 (PARTIEL), EX-EXI-071 (PARTIEL), EX-EXI-075 (PARTIEL), EX-TRA-025 (PARTIEL), EX-TRA-026 (PARTIEL) |
| Écrans | ECR-COO-09 |
| Profils | dev.coord, dev.cheq, dev.admin ; dev.expe en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P12-01 — Liste 2 m² fixe : entretien à l'afficheur, libération annoncée, quantité modifiée

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-238 (PARTIEL), RG-COO-239 (PARTIEL), ECR-COO-09 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P12 » de `apps/api/scripts/e2e-seed.ts`.
  - Exécution manuelle : base de dev avec JDD fictifs (`pnpm seed:ref`, `pnpm seed:centres` ; dossiers, instructions et trains de démonstration : `pnpm jdd:demo --seed=7`) ; plateformes « … (JDD) » uniquement (EXC-007).
- **Étapes** :
  1. Ouvrir Préparation 2 m² fixe ; modifier une quantité à produire.
- **Résultat attendu** :
  - Entretien par afficheur affiché ; quantité enregistrée.
- **Tests automatisés correspondants** : [`e2e/coordination-unitaire.spec.ts`](../../../e2e/coordination-unitaire.spec.ts) ; [`apps/api/test/coordination/unitaire.int.test.ts`](../../../apps/api/test/coordination/unitaire.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P12-02 — Ligne « à libérer » : « Libérer la semaine »

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-240 (PARTIEL), RG-COO-241 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P12 » de `apps/api/scripts/e2e-seed.ts`.
  - Hypothèse Q-265 option (c) / Q-404 à valider par l'utilisateur (statut PARTIEL).
- **Étapes** :
  1. Libérer la semaine d'une ligne « à libérer ».
- **Résultat attendu** :
  - La ligne n'est plus « à libérer » ; aucune UM n'est créée par la libération.
- **Tests automatisés correspondants** : [`e2e/coordination-unitaire.spec.ts`](../../../e2e/coordination-unitaire.spec.ts) ; [`apps/api/test/coordination/liberation-colisage.int.test.ts`](../../../apps/api/test/coordination/liberation-colisage.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P12-03 — Corriger l'intitulé : champs vides refusés ; rendre la main à la Pré-Prod

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-244 (PARTIEL), RG-COO-243 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P12 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Corriger l'intitulé avec des champs vides, puis renseignés.
  2. Rendre la main sur une unité.
- **Résultat attendu** :
  - Champs vides refusés ; correction enregistrée (Pré-Prod prévenue, feuille à refaire).
  - Unités rendues avec le repère « main rendue ».
- **Tests automatisés correspondants** : [`e2e/coordination-unitaire.spec.ts`](../../../e2e/coordination-unitaire.spec.ts) ; [`apps/api/test/coordination/unitaire.int.test.ts`](../../../apps/api/test/coordination/unitaire.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P12-04 — Préparer une UM puis en retirer une autre ; retrait impossible refusé

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-250 (PARTIEL), RG-COO-249 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P12 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Préparer une UM, en retirer une autre, puis tenter un retrait impossible.
- **Résultat attendu** :
  - Retrait : UM supprimées, répartitions remises à traiter ; retrait impossible refusé.
- **Tests automatisés correspondants** : [`e2e/coordination-unitaire.spec.ts`](../../../e2e/coordination-unitaire.spec.ts) ; [`apps/api/test/coordination/unitaire.int.test.ts`](../../../apps/api/test/coordination/unitaire.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P12-05 — Bus : quantités à encoller par centre, ajustement global ; fiche de synthèse

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-304 (PARTIEL), RG-COO-305 (PARTIEL), RG-COO-246 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P12 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir la préparation bus, ajuster une quantité.
  2. Imprimer la fiche de synthèse.
- **Résultat attendu** :
  - Ajustement enregistré par centre ; fiche groupée par destinataire (impression navigateur).
- **Tests automatisés correspondants** : [`e2e/coordination-unitaire.spec.ts`](../../../e2e/coordination-unitaire.spec.ts) ; [`apps/api/test/coordination/unitaire-complement.int.test.ts`](../../../apps/api/test/coordination/unitaire-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
