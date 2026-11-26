# TC-REC-P03 — Panier et saisie du bon de livraison : photo, lecture du BL, contrôles de saisie

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P03 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04) : panier, photo du BL, bon de livraison vérifié, modale Visuel ; 2 FAIT, 11 PARTIEL, 4 BLOQUÉ (Q-112) |
| RG rattachées dans la matrice | 8 FAIT · 5 PARTIEL · 4 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-REC-507 (BLOQUÉ), EX-REC-510 (PARTIEL), EX-SCR-513 (PARTIEL), EX-ADM-501 (PARTIEL), EX-REC-003 (PARTIEL), EX-REC-004 (PARTIEL), EX-REC-005 (BLOQUÉ), EX-REC-006 (BLOQUÉ), EX-REC-010 (PARTIEL), EX-REC-011 (FAIT), EX-REC-012 (PARTIEL), EX-REC-015 (PARTIEL), EX-REC-074 (PARTIEL) |
| Écrans | ECR-REC-01, ECR-REC-07, ECR-REC-11, ECR-REC-12 |
| Profils | dev.recep, dev.coord |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P03-01 — Mise au panier : ligne non cochée, quantité du BL = reste

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-021 (FAIT), RG-REC-022 (FAIT), RG-REC-023 (PARTIEL), RG-NEW-REC-002 (Réalisé, voir précisions)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Cliquer « Au panier » sur une ligne attendue.
  2. Décocher une ligne ; saisir une quantité 0 sur une autre.
- **Résultat attendu** :
  - La ligne arrive non cochée, Qté du BL = reste ; elle n'est plus proposée dans la liste (RG-REC-021, RG-REC-023, RG-NEW-REC-002).
  - Une ligne décochée ou à 0 ne compte pas (RG-REC-022, RG-REC-023).
- **Tests automatisés correspondants** : [`e2e/reception-panier.spec.ts`](../../../e2e/reception-panier.spec.ts) ; [`apps/api/test/reception/bon-livraison.int.test.ts`](../../../apps/api/test/reception/bon-livraison.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P03-02 — Validation refusée sans photo du BL

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-026 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Remplir le bon de livraison sans joindre la photo du BL.
  2. Cliquer « Valider la réception ».
- **Résultat attendu** :
  - L'API refuse avec son message ; aucune réception créée.
- **Tests automatisés correspondants** : [`e2e/reception-panier.spec.ts`](../../../e2e/reception-panier.spec.ts) ; [`apps/api/test/reception/bon-livraison.int.test.ts`](../../../apps/api/test/reception/bon-livraison.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P03-03 — Panier sur deux plateformes, n° de BL déjà utilisé, valeur hors référentiel refusés

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-024 (FAIT), RG-REC-036 (FAIT), RG-REC-035 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Composer un panier mêlant deux plateformes.
  2. Réutiliser un n° de BL existant.
  3. Saisir un imprimeur absent du référentiel.
- **Résultat attendu** :
  - Chaque cas est refusé avec le message de la règle ; aucune écriture.
- **Tests automatisés correspondants** : [`apps/api/test/reception/bon-livraison.int.test.ts`](../../../apps/api/test/reception/bon-livraison.int.test.ts) ; [`apps/api/test/reception/bon-livraison-complement.int.test.ts`](../../../apps/api/test/reception/bon-livraison-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P03-04 — Modale Visuel accessible depuis le panier

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-203 (PARTIEL), ECR-REC-12 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Ouvrir la modale Visuel d'une ligne.
- **Résultat attendu** :
  - La modale montre le dossier, la DA et le reçu.
- **Tests automatisés correspondants** : [`e2e/reception-panier.spec.ts`](../../../e2e/reception-panier.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P03-05 — Lecture automatique du BL et reconnaissance du visuel

- **Type** : Bloqué
- **Exigences et règles couvertes** : RG-REC-028 (BLOQUÉ), RG-REC-031 (BLOQUÉ)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Statut matrice : BLOQUÉ (Q-112, service externe derrière `LlmProvider`).
- **Étapes** :
  1. Photographier un BL et demander le pré-remplissage.
- **Résultat attendu** :
  - Comportement cible non disponible : saisie manuelle (alternatif documenté). Cas à exécuter quand la question sera tranchée.
- **Tests automatisés correspondants** : aucun (cas manuel ou bloqué)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
