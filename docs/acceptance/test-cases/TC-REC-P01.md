# TC-REC-P01 — Socle Réception : entités, droits, traçabilité, historique, concurrence

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P01 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04) : socle livré, 4 RG FAIT, 14 PARTIEL complétées par P02-P08 / COO-P04 |
| RG rattachées dans la matrice | 12 PARTIEL · 6 FAIT |
| Exigences EX rattachées (matrice) | EX-REC-501 (FAIT), EX-ADM-502 (PARTIEL), EX-REC-024 (PARTIEL), EX-REC-057 (PARTIEL), EX-REC-058 (PARTIEL), EX-REC-080 (PARTIEL), EX-REC-081 (FAIT), EX-TRA-035 (PARTIEL), EX-TRA-037 (PARTIEL) |
| Écrans | aucun écran propre (socle) |
| Profils | tous profils (dev.recep, dev.coord, dev.cheq, dev.expe, dev.admin, dev.com) |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P01-01 — Une écriture de réception est tracée et historisée dans une seule transaction

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-002 (PARTIEL), RG-REC-004 (PARTIEL), RG-REC-005 (PARTIEL), RG-REC-006 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Valider une réception sur une ligne attendue (voir TC-REC-P04-01).
  2. Ouvrir la fiche de l'affiche créée, onglet Mouvements / historique.
- **Résultat attendu** :
  - L'action porte l'auteur et la date (RG-REC-004).
  - L'historique de l'affiche et le journal d'événements sont écrits avec l'action (RG-REC-005, RG-REC-006).
- **Tests automatisés correspondants** : [`apps/api/test/reception/socle.int.test.ts`](../../../apps/api/test/reception/socle.int.test.ts) ; [`apps/api/test/reception/socle-complement.int.test.ts`](../../../apps/api/test/reception/socle-complement.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P01-02 — Action refusée à un rôle non autorisé ou hors périmètre site

- **Type** : Permission
- **Exigences et règles couvertes** : RG-REC-001 (PARTIEL), RG-REC-002 (PARTIEL)
- **Profil** : dev.com (refusé), dev.recep (autorisé)
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Avec le profil commerce, tenter une écriture de réception (rattacher, mouvement).
  2. Avec un profil réception, viser une plateforme hors de son périmètre.
- **Résultat attendu** :
  - Rôle non autorisé : HTTP 403, rien n'est écrit (RG-REC-002).
  - Hors périmètre site : 403 ou 404 (RG-REC-001).
- **Tests automatisés correspondants** : [`apps/api/test/reception/socle-audit.int.test.ts`](../../../apps/api/test/reception/socle-audit.int.test.ts) ; [`apps/api/test/reception/socle.int.test.ts`](../../../apps/api/test/reception/socle.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P01-03 — Double soumission rejouée et version périmée refusée

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-008 (FAIT), RG-REC-009 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Envoyer deux fois la même requête de création avec le même en-tête `Idempotency-Key`.
  2. Modifier une affiche avec un numéro de version périmé.
- **Résultat attendu** :
  - La seconde requête rejoue la réponse, sans seconde écriture (RG-REC-008).
  - Version périmée : HTTP 409 (RG-REC-009).
- **Tests automatisés correspondants** : [`apps/api/test/reception/socle-complement.int.test.ts`](../../../apps/api/test/reception/socle-complement.int.test.ts) ; [`apps/api/test/socle.int.test.ts`](../../../apps/api/test/socle.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P01-04 — Reçu = somme des rattachements, stock = somme des mouvements ; aucune suppression de réception

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-151 (PARTIEL), RG-REC-153 (FAIT), RG-REC-176 (FAIT), RG-REC-074 (FAIT), RG-X-016 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Réceptionner puis contrôler une affiche avec un écart de comptage.
  2. Lire le reçu de la ligne et le stock de l'affiche ; chercher une action de suppression de réception.
- **Résultat attendu** :
  - Le reçu est compté une seule fois, le stock est la somme des mouvements (RG-REC-151, RG-REC-153, RG-X-016).
  - Statut et tags envoyés par le client sont ignorés (RG-REC-176) ; aucune route ne supprime une réception (RG-REC-074).
- **Tests automatisés correspondants** : [`apps/api/test/reception/socle.int.test.ts`](../../../apps/api/test/reception/socle.int.test.ts) ; [`apps/api/test/reception/audit-rec.int.test.ts`](../../../apps/api/test/reception/audit-rec.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
