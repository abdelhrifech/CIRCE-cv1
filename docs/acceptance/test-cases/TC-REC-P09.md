# TC-REC-P09 — Rebut, mouvements manuels de stock et fonctions legacy sans écran cible

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P09 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : implémenté, testé, audité ; RG BLOQUÉES / PARTIEL listées dans la matrice et ECARTS) |
| RG rattachées dans la matrice | 10 NON REPRIS — décision à valider (Q-100/101/118/155) · 1 PARTIEL · 3 FAIT · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-STK-502 (BLOQUÉ), EX-REC-061 (PARTIEL), EX-REC-079 (PARTIEL), EX-TRA-013 (PARTIEL) |
| Écrans | ECR-STK-01, ECR-STK-03, ECR-REC-03 |
| Profils | dev.recep, dev.cheq, dev.coord ; dev.admin |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P09-01 — Mise au rebut depuis Stocks avec mouvement de rebut

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-156 (FAIT), RG-STK-NEW-001 (IMPLÉMENTÉ)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Ouvrir Stocks, sélectionner une affiche en stock, la mettre au rebut.
- **Résultat attendu** :
  - Un mouvement de rebut est écrit, le stock diminue d'autant (RG-REC-156) ; une erreur annule tout le lot (RG-STK-NEW-001).
- **Tests automatisés correspondants** : [`apps/api/test/reception/stock-alertes-admin.int.test.ts`](../../../apps/api/test/reception/stock-alertes-admin.int.test.ts) ; [`apps/api/test/stocks/fin-campagne.int.test.ts`](../../../apps/api/test/stocks/fin-campagne.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P09-02 — Sortie supérieure au stock disponible refusée

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-151 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Demander une sortie ou un rebut supérieur au stock de l'affiche.
- **Résultat attendu** :
  - HTTP 422 `REC_STOCK_NEGATIF`, rien n'est écrit (ANO-061, hypothèse Q-417).
- **Tests automatisés correspondants** : [`apps/api/test/massif/non-regression.int.test.ts`](../../../apps/api/test/massif/non-regression.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P09-03 — Affiche héritée « fusionnée » en lecture seule

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-169 (FAIT)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Modifier une affiche héritée marquée fusionnée.
- **Résultat attendu** :
  - Modification refusée (RG-REC-169).
- **Tests automatisés correspondants** : [`apps/api/test/reception/affiches.int.test.ts`](../../../apps/api/test/reception/affiches.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P09-04 — Fonctions legacy non reprises (fusion, zone picking, listes legacy)

- **Type** : Non repris
- **Exigences et règles couvertes** : RG-REC-157 (NON REPRIS — décision à valider (Q-100/101/118/155)), RG-REC-163 (NON REPRIS — décision à valider (Q-100/101/118/155))
- **Profil** : —
- **Préconditions et jeu de données** :
  - Statut matrice : NON REPRIS — décision à valider (Q-100, Q-101, Q-118, Q-155) ; arbitrage Q-382.
- **Étapes** :
  1. Vérifier l'absence de ces fonctions dans l'application.
- **Résultat attendu** :
  - Aucune fonction exposée tant que la décision n'est pas prise ; écart consigné.
- **Tests automatisés correspondants** : aucun (cas manuel ou bloqué)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
