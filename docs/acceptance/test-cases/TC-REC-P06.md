# TC-REC-P06 — Feuille de stock (étiquette rack) et impressions

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P06 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : implémenté, testé, audité ; RG BLOQUÉES / PARTIEL listées dans la matrice et ECARTS) |
| RG rattachées dans la matrice | 15 FAIT · 3 PARTIEL · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-REC-502 (FAIT), EX-REC-515 (FAIT), EX-TRA-507 (FAIT), EX-REC-029 (FAIT), EX-REC-030 (FAIT), EX-REC-031 (FAIT), EX-REC-032 (FAIT), EX-REC-033 (FAIT), EX-REC-034 (FAIT), EX-REC-054 (PARTIEL) |
| Écrans | ECR-REC-09, ECR-REC-10, ECR-REC-03 |
| Profils | dev.recep, dev.coord ; dev.expe pour le picking |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P06-01 — Feuille définitive imprimée après contrôle, type noté et tag levé

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-084 (FAIT), RG-REC-085 (FAIT), RG-REC-129 (FAIT), ECR-REC-09 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Valider un contrôle puis « Valider et imprimer ».
  2. Imprimer depuis l'aperçu (PDF navigateur).
- **Résultat attendu** :
  - La feuille porte la mention FEUILLE DE STOCK DÉFINITIVE (RG-REC-084).
  - Le type de feuille imprimée est noté, le tag « Feuille à refaire » est levé (RG-REC-085, RG-REC-129).
- **Tests automatisés correspondants** : [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/impressions.int.test.ts`](../../../apps/api/test/reception/impressions.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P06-02 — Étiquettes rack en lot, en un clic, avec exemplaires

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-086 (FAIT), RG-REC-087 (FAIT), RG-REC-090 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Sélectionner plusieurs affiches dans la liste et lancer « Étiquettes rack ».
- **Résultat attendu** :
  - Aperçu en mode étiquette, impression en un clic ; réimpression possible (RG-REC-086, RG-REC-087, RG-REC-090).
- **Tests automatisés correspondants** : [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/impressions.int.test.ts`](../../../apps/api/test/reception/impressions.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P06-03 — « Ranger avant d'imprimer » quand des affiches sont en zone tampon

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-088 (FAIT), ECR-REC-10 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Lancer l'impression d'une feuille dont l'affiche est encore en zone tampon.
- **Résultat attendu** :
  - La modale de rangement s'ouvre avant toute impression (RG-REC-088).
- **Tests automatisés correspondants** : [`apps/api/test/reception/impressions.int.test.ts`](../../../apps/api/test/reception/impressions.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P06-04 — Impression sur l'imprimante de plateforme et échec non bloquant

- **Type** : Bloqué
- **Exigences et règles couvertes** : RG-REC-076 (FAIT), RG-REC-092 (BLOQUÉ)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Statut matrice de RG-REC-092 : BLOQUÉ (Q-002, agent d'impression local).
- **Étapes** :
  1. Envoyer une feuille à l'imprimante de la plateforme.
- **Résultat attendu** :
  - Cible : échec non bloquant avec message et réimpression. Aujourd'hui : sortie PDF navigateur seulement.
- **Tests automatisés correspondants** : aucun (cas manuel ou bloqué)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
