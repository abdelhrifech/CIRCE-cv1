# TC-REC-P07 — Réceptions inconnues : création, identification, rattachement, signalement

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P07 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : implémenté, testé, audité ; RG BLOQUÉES / PARTIEL listées dans la matrice et ECARTS) |
| RG rattachées dans la matrice | 29 FAIT · 2 BLOQUÉ · 2 PARTIEL · 1 NON REPRIS — décision à valider (Q-100/101/118/155) |
| Exigences EX rattachées (matrice) | EX-COO-010 (PARTIEL), EX-COO-017 (PARTIEL), EX-REC-035 (FAIT), EX-REC-037 (FAIT), EX-REC-038 (PARTIEL), EX-REC-039 (FAIT), EX-REC-040 (FAIT), EX-REC-041 (PARTIEL), EX-REC-042 (PARTIEL), EX-REC-043 (FAIT), EX-REC-055 (FAIT) |
| Écrans | ECR-REC-08, ECR-REC-04 |
| Profils | dev.recep (création, signalement) ; dev.coord (rattachement qui vaut validation) ; dev.admin |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P07-01 — Créer une réception inconnue : affiche orpheline, feuille temporaire

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-095 (FAIT), RG-REC-096 (FAIT), RG-REC-099 (FAIT), RG-REC-083 (FAIT), ECR-REC-08 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Ouvrir « Réception inconnue… » ; tenter une quantité nulle ; puis saisir quantité, allée tampon et rayon.
  2. Valider.
- **Résultat attendu** :
  - Quantité nulle refusée ; création ensuite acceptée (RG-REC-095, RG-REC-096).
  - L'affiche est ORPHELINE, une feuille TEMPORAIRE est proposée, une alerte part vers la Coordination (RG-REC-099, RG-REC-083).
- **Tests automatisés correspondants** : [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/inconnues.int.test.ts`](../../../apps/api/test/reception/inconnues.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P07-02 — Identifier et rattacher l'inconnue à un dossier

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-101 (FAIT), RG-REC-109 (FAIT), RG-NEW-REC-005 (hors matrice, voir REGLES_METIER_NOUVELLES_SPECS), ECR-REC-04 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Ouvrir la fiche de l'inconnue, rechercher le dossier, saisir la quantité et rattacher.
- **Résultat attendu** :
  - La palette rejoint le sas, l'annonceur et le libellé sont repris (RG-REC-109).
  - Le rattachement se fait depuis la fiche (RG-NEW-REC-005) ; la liste ECR-REC-04 se met à jour (RG-REC-101).
- **Tests automatisés correspondants** : [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/inconnues.int.test.ts`](../../../apps/api/test/reception/inconnues.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P07-03 — Rattachement sans dossier ou répartition supérieure à la quantité reçue

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-107 (FAIT), RG-REC-108 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Rattacher sans choisir de dossier ni de quantité.
  2. Répartir plus que la quantité reçue sur plusieurs dossiers.
- **Résultat attendu** :
  - HTTP 422 « Choisissez au moins un dossier et une quantité. » (RG-REC-107).
  - Répartition supérieure à la quantité : 422 (RG-REC-108).
- **Tests automatisés correspondants** : [`apps/api/test/reception/inconnues.int.test.ts`](../../../apps/api/test/reception/inconnues.int.test.ts) ; [`apps/api/test/reception/inconnues-complement.int.test.ts`](../../../apps/api/test/reception/inconnues-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P07-04 — Rattachement par la Réception non validant ; par la Coordination validant

- **Type** : Permission
- **Exigences et règles couvertes** : RG-REC-111 (FAIT), RG-COO-017 (FAIT), RG-X-051 (FAIT), RG-X-063 (FAIT)
- **Profil** : dev.recep puis dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P04 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Rattacher une inconnue avec le profil réception.
  2. Rattacher une autre inconnue avec le profil coordination.
- **Résultat attendu** :
  - Par la Réception : validation admin non posée, état « à confirmer (doute) » (RG-REC-111, RG-X-063).
  - Par la Coordination : le rattachement vaut validation (RG-COO-017, RG-X-051).
- **Tests automatisés correspondants** : [`e2e/coordination-effets-validation.spec.ts`](../../../e2e/coordination-effets-validation.spec.ts) ; [`apps/api/test/reception/inconnues.int.test.ts`](../../../apps/api/test/reception/inconnues.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P07-05 — Signaler « Dossier introuvable » ; retirer le dernier dossier

- **Type** : Transition interdite
- **Exigences et règles couvertes** : RG-REC-112 (FAIT), RG-REC-114 (FAIT), RG-X-054 (PARTIEL), RG-X-058 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Signaler une inconnue « Dossier introuvable », deux fois.
  2. Retirer le dernier dossier d'une affiche rattachée.
- **Résultat attendu** :
  - Statut INTROUVABLE ; un signalement répété met à jour la date, sans doublon (RG-REC-112, RG-X-054).
  - Retrait du dernier dossier : retour à « À identifier » (RG-REC-114, RG-X-058) ; transition non listée : 409.
- **Tests automatisés correspondants** : [`e2e/interactions.spec.ts`](../../../e2e/interactions.spec.ts) ; [`apps/api/test/reception/inconnues.int.test.ts`](../../../apps/api/test/reception/inconnues.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
