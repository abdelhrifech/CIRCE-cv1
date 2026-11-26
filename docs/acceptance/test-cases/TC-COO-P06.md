# TC-COO-P06 — Intégration Broadcast : copie de l'état des réservations et flux

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | COO-P06 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-05 : passage d'intégration (verrou, ordre fixe, journal de chargement, délai), cinq flux sur contrat d'entrée Q-188, retour « reçue et associée », messages vers Broadcast en file, « Rafraîchir un dossier », écran « Chargements Broadcast » ; restes : source et envoi réels Q-005, RG-COO-109 BLOQUÉE Q-228, alertes affichées COO-P07) |
| RG rattachées dans la matrice | 11 PARTIEL · 13 FAIT · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-TRA-512 (FAIT), EX-COO-043 (PARTIEL), EX-COO-046 (PARTIEL), EX-EXI-012 (PARTIEL), EX-EXI-015 (FAIT), EX-EXI-016 (PARTIEL), EX-EXI-017 (FAIT), EX-EXI-018 (PARTIEL), EX-EXI-020 (PARTIEL), EX-TRA-038 (FAIT), EX-TRA-039 (PARTIEL) |
| Écrans | aucun écran propre ; écran « Chargements Broadcast » |
| Profils | système ; dev.coord (rafraîchir un dossier) ; dev.admin |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-COO-P06-01 — Journal de chargement : passage réussi, flux « État des réservations » en succès

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-COO-116 (PARTIEL), RG-COO-104 (PARTIEL)
- **Profil** : dev.admin
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P06 » de `apps/api/scripts/e2e-seed.ts`.
  - Contrat Broadcast simulé (Q-005 / Q-188) : aucune source réelle.
- **Étapes** :
  1. Ouvrir le journal de chargement après le passage du seed.
- **Résultat attendu** :
  - Le passage est journalisé ; le flux « État des réservations » est en succès ; ordre fixe des flux.
- **Tests automatisés correspondants** : [`e2e/coordination-integration.spec.ts`](../../../e2e/coordination-integration.spec.ts) ; [`apps/api/test/coordination/integration-broadcast.int.test.ts`](../../../apps/api/test/coordination/integration-broadcast.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P06-02 — Passage manuel réservé à l'administrateur

- **Type** : Permission
- **Exigences et règles couvertes** : RG-COO-103 (PARTIEL)
- **Profil** : dev.coord (refusé), dev.admin (autorisé)
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P06 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Avec le profil coordination, ouvrir le journal de chargement.
- **Résultat attendu** :
  - Le bouton de passage manuel est désactivé pour la Coordination.
- **Tests automatisés correspondants** : [`e2e/coordination-integration.spec.ts`](../../../e2e/coordination-integration.spec.ts) ; [`apps/api/test/coordination/integration-broadcast.int.test.ts`](../../../apps/api/test/coordination/integration-broadcast.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P06-03 — « Rafraîchir un dossier » : n° obligatoire

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-132 (PARTIEL)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`), bloc « COO-P06 » de `apps/api/scripts/e2e-seed.ts`.
- **Étapes** :
  1. Lancer « Rafraîchir un dossier » sans n°, puis avec un n°.
- **Résultat attendu** :
  - Sans n° : refus ; avec n° : demande enregistrée.
- **Tests automatisés correspondants** : [`e2e/coordination-integration.spec.ts`](../../../e2e/coordination-integration.spec.ts) ; [`apps/api/test/coordination/integration-broadcast.int.test.ts`](../../../apps/api/test/coordination/integration-broadcast.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-COO-P06-04 — Flux en échec rejouable ; prépa renvoyée sans annulation refusée ; idempotence

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-COO-116 (PARTIEL), RG-COO-122 (FAIT), RG-COO-134 (PARTIEL)
- **Profil** : système
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Simuler un flux en échec puis rejouer.
  2. Renvoyer une préparation sans annulation de la précédente.
  3. Rejouer le même lot.
- **Résultat attendu** :
  - État partiel assumé, journalisé, rejouable (RG-COO-116).
  - Prépa renvoyée sans annulation : refus d'intégration (RG-COO-122).
  - Aucune donnée doublée (RG-COO-134).
- **Tests automatisés correspondants** : [`apps/api/test/coordination/integration-broadcast.int.test.ts`](../../../apps/api/test/coordination/integration-broadcast.int.test.ts) ; [`apps/api/test/coordination/integration-broadcast-complement.int.test.ts`](../../../apps/api/test/coordination/integration-broadcast-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
