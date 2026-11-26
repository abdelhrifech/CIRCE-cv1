# TC-REC-P05 — Sas et contrôle de la palette : comptage, écarts, rebut, emplacement, validation du contrôle

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P05 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : implémenté, testé, audité ; RG BLOQUÉES / PARTIEL listées dans la matrice et ECARTS) |
| RG rattachées dans la matrice | 22 FAIT · 2 PARTIEL |
| Exigences EX rattachées (matrice) | EX-REC-508 (FAIT), EX-REC-514 (FAIT), EX-REC-519 (PARTIEL), EX-QUA-501 (FAIT), EX-EXI-051 (PARTIEL), EX-REC-018 (FAIT), EX-REC-019 (FAIT), EX-REC-020 (FAIT), EX-REC-021 (FAIT), EX-REC-022 (PARTIEL), EX-REC-023 (FAIT), EX-REC-025 (PARTIEL), EX-REC-026 (FAIT), EX-REC-027 (FAIT), EX-REC-028 (FAIT), EX-REC-053 (FAIT), EX-REC-056 (FAIT), EX-REC-064 (FAIT), EX-REC-070 (FAIT), EX-REC-078 (FAIT) |
| Écrans | ECR-REC-02, ECR-REC-06 |
| Profils | dev.recep (contrôleur) ; dev.coord en lecture ; dev.cheq |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P05-01 — Contrôler la palette et valider le contrôle

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-053 (FAIT), RG-REC-056 (FAIT), RG-REC-061 (FAIT), RG-REC-063 (FAIT), RG-REC-069 (FAIT), ECR-REC-02 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Ouvrir une palette du sas.
  2. Saisir la quantité comptée, l'allée, le rayon et le contrôleur.
  3. Valider le contrôle.
- **Résultat attendu** :
  - La palette passe CONTROLEE et quitte le sas (RG-REC-053, RG-REC-069).
  - Le stock réel et l'emplacement sont posés (RG-REC-056, RG-REC-061).
- **Tests automatisés correspondants** : [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/controle.int.test.ts`](../../../apps/api/test/reception/controle.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P05-02 — Contrôle refusé sans contrôleur ou sans allée / rayon

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-061 (FAIT), RG-REC-067 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Valider le contrôle sans contrôleur, puis sans allée / rayon.
- **Résultat attendu** :
  - Refus avec le message de la règle ; la palette reste À contrôler.
- **Tests automatisés correspondants** : [`apps/api/test/reception/controle.int.test.ts`](../../../apps/api/test/reception/controle.int.test.ts) ; [`apps/api/test/reception/audit-rec-2.int.test.ts`](../../../apps/api/test/reception/audit-rec-2.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P05-03 — Écart de comptage supérieur à 10 % et rebut au contrôle

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-058 (FAIT), RG-REC-064 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Saisir une quantité comptée qui s'écarte de plus de 10 % du BL.
  2. Déclarer une partie au rebut.
- **Résultat attendu** :
  - L'écart est signalé et tracé par un mouvement « Contrôle (écart au BL) » (RG-REC-058).
  - Un mouvement de rebut est écrit ; le stock ne devient jamais négatif (RG-REC-064, ANO-061).
- **Tests automatisés correspondants** : [`apps/api/test/reception/controle-complement.int.test.ts`](../../../apps/api/test/reception/controle-complement.int.test.ts) ; [`apps/api/test/massif/non-regression.int.test.ts`](../../../apps/api/test/massif/non-regression.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P05-04 — Réception à identifier non contrôlable ; contrôle terminé en lecture seule

- **Type** : Transition interdite
- **Exigences et règles couvertes** : RG-REC-070 (FAIT), RG-REC-071 (FAIT), RG-REC-072 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Tenter de contrôler une réception inconnue À identifier.
  2. Rattacher l'inconnue puis contrôler.
  3. Modifier un contrôle terminé.
- **Résultat attendu** :
  - À identifier : HTTP 409 (RG-REC-071) ; après rattachement, contrôle possible (RG-REC-072).
  - Contrôle terminé : toute modification refusée (RG-REC-070).
- **Tests automatisés correspondants** : [`apps/api/test/reception/controle.int.test.ts`](../../../apps/api/test/reception/controle.int.test.ts) ; [`apps/api/test/reception/controle-complement.int.test.ts`](../../../apps/api/test/reception/controle-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P05-05 — Badge du menu et palette en retard de plus de 24 h

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-010 (PARTIEL), RG-REC-054 (FAIT), RG-REC-055 (FAIT), RG-REC-189 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Ouvrir le menu Réception ; laisser une palette plus de 24 h dans le sas (données de test datées).
- **Résultat attendu** :
  - Le badge compte les palettes à contrôler (RG-REC-010, RG-REC-054) ; la palette en retard est repérée (RG-REC-055) et alertée (RG-REC-189).
- **Tests automatisés correspondants** : [`e2e/reception-attendues.spec.ts`](../../../e2e/reception-attendues.spec.ts) ; [`apps/api/test/reception/controle-complement.int.test.ts`](../../../apps/api/test/reception/controle-complement.int.test.ts) ; [`apps/api/test/reception/stock-alertes-complement.int.test.ts`](../../../apps/api/test/reception/stock-alertes-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
