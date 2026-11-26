# TC-TRA — Transverse : coque de navigation, profil, erreurs normalisées, santé de l'API

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Regroupement | Regroupement documentaire (aucun identifiant de parcours dans le plan) : ECR-NAV-01, EX-TRA-*, socle étape 4. |
| Écrans | ECR-NAV-01 |
| Profils | tous profils de dev |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-TRA-01 — Coque : deux bandeaux, menus déroulants, entrée active

- **Type** : Nominal
- **Exigences et règles couvertes** : ECR-NAV-01 (PARTIEL), EX-TRA-008 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « ECR-NAV-01 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir l'application ; ouvrir un onglet du bandeau ; fermer par Échap ; ouvrir une entrée.
- **Résultat attendu** :
  - Deux bandeaux sans menu latéral ; une seule liste ouverte ; l'entrée active porte `aria-current`.
- **Tests automatisés correspondants** : [`e2e/navigation.spec.ts`](../../../e2e/navigation.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-TRA-02 — Le site choisi est envoyé en en-tête `x-site-id`

- **Type** : Nominal
- **Exigences et règles couvertes** : EX-TRA-006 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « ECR-NAV-01 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Choisir un site puis naviguer.
- **Résultat attendu** :
  - Les appels API portent l'en-tête `x-site-id` du site choisi.
- **Tests automatisés correspondants** : [`e2e/navigation.spec.ts`](../../../e2e/navigation.spec.ts) ; [`apps/api/test/me-sites.int.test.ts`](../../../apps/api/test/me-sites.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-TRA-03 — Le profil de dev change les droits ; cookie de profil invalide ignoré

- **Type** : Permission
- **Exigences et règles couvertes** : ECR-NAV-01 (PARTIEL)
- **Profil** : dev.coord (refusé), dev.admin (autorisé)
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « ECR-NAV-01 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Ouvrir Administration en coordination puis en administrateur.
  2. Forger un cookie de profil invalide.
- **Résultat attendu** :
  - Administration refusée en coordination, accessible en administrateur ; le cookie invalide est ignoré par le relais.
- **Tests automatisés correspondants** : [`e2e/navigation.spec.ts`](../../../e2e/navigation.spec.ts) ; [`e2e/socle.spec.ts`](../../../e2e/socle.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-TRA-04 — Erreurs normalisées : 401, 422 avec règle, API indisponible

- **Type** : Rejet
- **Exigences et règles couvertes** : conventions transverses (AGENTS.md §6), sans identifiant EX/RG
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Appeler « Mon profil » sans identité ; provoquer une erreur 422 ; couper l'API.
- **Résultat attendu** :
  - Message d'erreur normalisé `{ code, message, details?, regle? }` ; règle violée affichée ; état d'erreur avec « Réessayer ».
- **Tests automatisés correspondants** : [`e2e/socle.spec.ts`](../../../e2e/socle.spec.ts) ; [`e2e/health.spec.ts`](../../../e2e/health.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
