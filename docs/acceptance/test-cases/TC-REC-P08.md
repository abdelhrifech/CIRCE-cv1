# TC-REC-P08 — Liste des affiches et fiche de l'affiche : filtres, tags, rattachements, thème, conservation

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P08 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : implémenté, testé, audité ; RG BLOQUÉES / PARTIEL listées dans la matrice et ECARTS) |
| RG rattachées dans la matrice | 26 FAIT · 6 NON REPRIS — décision à valider (Q-100/101/118/155) · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-REC-509 (FAIT), EX-REC-513 (FAIT), EX-STK-504 (FAIT), EX-REC-045 (FAIT), EX-REC-047 (PARTIEL), EX-REC-048 (FAIT) |
| Écrans | ECR-REC-03, ECR-REC-05, ECR-REC-06 |
| Profils | dev.coord, dev.recep, dev.cheq, dev.admin ; dev.com en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P08-01 — Liste des affiches : colonnes, filtres, tags calculés, rebut visible

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-121 (FAIT), RG-REC-122 (FAIT), RG-REC-125 (FAIT), RG-REC-126 (FAIT), ECR-REC-03 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Ouvrir la liste des affiches ; appliquer des filtres et un tag.
- **Résultat attendu** :
  - Colonnes et filtres de la maquette ; tags calculés, jamais cochés à la main ; rebut en évidence (RG-REC-121 à RG-REC-126).
- **Tests automatisés correspondants** : [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/affiches.int.test.ts`](../../../apps/api/test/reception/affiches.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P08-02 — Fiche affiche : onglets et modification enregistrée

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-131 (FAIT), RG-NEW-REC-006 (hors matrice, voir REGLES_METIER_NOUVELLES_SPECS), ECR-REC-05 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Ouvrir une fiche affiche, parcourir les onglets, modifier un champ modifiable (conservation, repiquage).
  2. Recharger la fiche.
- **Résultat attendu** :
  - La modification est persistée, versionnée et historisée (RG-REC-131, RG-NEW-REC-006).
- **Tests automatisés correspondants** : [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/affiches.int.test.ts`](../../../apps/api/test/reception/affiches.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P08-03 — Changer de thème : feuille à refaire

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-135 (FAIT), RG-REC-150 (FAIT), RG-X-012 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Depuis l'onglet Préparations, changer le thème d'une affiche.
- **Résultat attendu** :
  - Les anciens thèmes sont purgés, le tag « Feuille à refaire » est posé (RG-REC-135, RG-REC-150, RG-X-012).
- **Tests automatisés correspondants** : [`apps/api/test/reception/affiches.int.test.ts`](../../../apps/api/test/reception/affiches.int.test.ts) ; [`apps/api/test/interactions/reception-vers-coordination.int.test.ts`](../../../apps/api/test/interactions/reception-vers-coordination.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P08-04 — Rattachement à un autre dossier : répartition limitée, version périmée refusée

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-136 (FAIT), RG-X-052 (FAIT), RG-REC-009 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Rattacher l'affiche à un second dossier pour une quantité supérieure à la quantité reçue.
  2. Enregistrer avec une version périmée.
- **Résultat attendu** :
  - Répartition supérieure à la quantité reçue : 422 (RG-X-052).
  - Version périmée : 409 (RG-REC-009).
- **Tests automatisés correspondants** : [`apps/api/test/reception/affiches.int.test.ts`](../../../apps/api/test/reception/affiches.int.test.ts) ; [`apps/api/test/coordination/effets-validation.int.test.ts`](../../../apps/api/test/coordination/effets-validation.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P08-05 — La Réception ne valide pas depuis la fiche ; retrait du dernier dossier

- **Type** : Permission
- **Exigences et règles couvertes** : RG-X-015 (FAIT), RG-X-063 (FAIT), RG-X-013 (FAIT), RG-X-058 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Ouvrir la fiche d'une affiche à confirmer avec le profil réception.
  2. Retirer le dernier dossier rattaché.
- **Résultat attendu** :
  - Aucun bouton « Valider » ; la fiche indique l'état de validation (RG-X-015, RG-X-063).
  - L'affiche redevient une réception inconnue ; la Coordination ne la voit plus (RG-X-013, RG-X-058).
- **Tests automatisés correspondants** : [`e2e/interactions.spec.ts`](../../../e2e/interactions.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
