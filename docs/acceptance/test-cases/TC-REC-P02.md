# TC-REC-P02 — Réceptions attendues : recherche, filtres, reçu / attendu / reste, statut de ligne

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P02 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04) : liste, recherche, filtres, statut de ligne, badges, purge (fonction) ; 3 FAIT, 10 PARTIEL, 3 BLOQUÉ (Q-005, Q-134) |
| RG rattachées dans la matrice | 9 PARTIEL · 5 FAIT · 2 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-REC-511 (FAIT), EX-REC-512 (PARTIEL), EX-REC-516 (PARTIEL), EX-REC-520 (PARTIEL), EX-REC-522 (PARTIEL), EX-COO-032 (PARTIEL), EX-COO-039 (PARTIEL), EX-EXI-059 (PARTIEL), EX-EXI-076 (PARTIEL), EX-REC-002 (PARTIEL), EX-REC-007 (PARTIEL), EX-REC-008 (PARTIEL), EX-REC-044 (FAIT), EX-REC-051 (FAIT), EX-REC-075 (PARTIEL) |
| Écrans | ECR-REC-01 |
| Profils | dev.recep, dev.coord, dev.cheq ; dev.com en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P02-01 — Liste des lignes attendues du site, filtre Statut par défaut

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-014 (PARTIEL), RG-REC-016 (PARTIEL), RG-REC-015 (FAIT), ECR-REC-01 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Ouvrir Réception › Réception des affiches.
  2. Observer les colonnes et le filtre Statut ; cocher / décocher des statuts.
- **Résultat attendu** :
  - Seules les lignes du site de l'utilisateur sont listées, Attendue + Partielle par défaut (RG-REC-014, RG-REC-016).
  - Le filtre Statut pilote la liste ; la période / Départ par défaut s'applique (RG-REC-015).
- **Tests automatisés correspondants** : [`e2e/reception-attendues.spec.ts`](../../../e2e/reception-attendues.spec.ts) ; [`apps/api/test/reception/attendues.int.test.ts`](../../../apps/api/test/reception/attendues.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P02-02 — Recherche à la frappe : dossier masqué par un filtre signalé, valeur absente signalée

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-011 (PARTIEL), RG-REC-012 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Saisir un n° de dossier dont la ligne est masquée par le filtre Statut.
  2. Saisir une valeur sans aucune ligne.
- **Résultat attendu** :
  - Le dossier masqué est signalé puis affiché à la demande (RG-REC-011, RG-REC-012).
  - Une valeur sans ligne est signalée comme absente (RG-REC-012).
- **Tests automatisés correspondants** : [`e2e/reception-attendues.spec.ts`](../../../e2e/reception-attendues.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P02-03 — Reçu, reste, statut et contrôle calculés depuis les rattachements réels

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-017 (PARTIEL), RG-REC-018 (FAIT), RG-REC-019 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Réceptionner partiellement une ligne attendue.
  2. Relire la ligne dans la liste.
- **Résultat attendu** :
  - Reçu et Reste reflètent les rattachements ; le statut passe à Partielle (RG-REC-017, RG-REC-018).
  - La colonne Contrôle indique l'état du contrôle de la palette (RG-REC-019).
- **Tests automatisés correspondants** : [`e2e/reception-attendues.spec.ts`](../../../e2e/reception-attendues.spec.ts) ; [`apps/api/test/reception/attendues-complement.int.test.ts`](../../../apps/api/test/reception/attendues-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P02-04 — Filtre invalide refusé par l'API et erreur affichée

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-016 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Appeler la liste avec une valeur de filtre Statut invalide.
- **Résultat attendu** :
  - HTTP 400 au format d'erreur unique ; l'écran affiche le message et « Réessayer ».
- **Tests automatisés correspondants** : [`e2e/reception-attendues.spec.ts`](../../../e2e/reception-attendues.spec.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P02-05 — Purge des attendues à 4 semaines ; affiche livrée après purge acceptée

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-180 (PARTIEL), RG-REC-052 (FAIT)
- **Profil** : système / dev.admin
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Déclencher la purge sur des lignes de plus de 4 semaines.
  2. Réceptionner une affiche dont la ligne a été purgée.
- **Résultat attendu** :
  - Les lignes anciennes sont purgées sans alerte, une ligne au journal (RG-REC-180, statut matrice PARTIEL : planification liée à Q-005).
  - L'affiche est acceptée et rattachable manuellement (RG-REC-052).
- **Tests automatisés correspondants** : [`apps/api/test/reception/attendues.int.test.ts`](../../../apps/api/test/reception/attendues.int.test.ts) ; [`apps/api/test/admin/taches.int.test.ts`](../../../apps/api/test/admin/taches.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
