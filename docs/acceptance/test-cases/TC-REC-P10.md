# TC-REC-P10 — Alertes Réception, paramètres, référentiels, dashboard et interfaces de retour

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P10 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : implémenté, testé, audité ; RG BLOQUÉES / PARTIEL listées dans la matrice et ECARTS) |
| RG rattachées dans la matrice | 5 FAIT · 3 PARTIEL · 7 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-REC-518 (BLOQUÉ), EX-REC-063 (PARTIEL), EX-REC-068 (FAIT), EX-REC-069 (FAIT), EX-REC-073 (FAIT), EX-TRA-028 (PARTIEL) |
| Écrans | ECR-TRA-01, ECR-ADM-04, ECR-ADM-05, ECR-ADM-07 |
| Profils | dev.coord, dev.admin ; dev.recep (lecture des alertes) ; dev.com en lecture |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P10-01 — Alerte « Feuille de stock définitive à imprimer » visible

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-187 (FAIT), ECR-TRA-01 (PARTIEL)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Rattacher une affiche dont la feuille définitive n'est pas imprimée.
  2. Ouvrir Alertes.
- **Résultat attendu** :
  - L'alerte est listée avec un lien vers l'affiche.
- **Tests automatisés correspondants** : [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/stock-alertes-admin.int.test.ts`](../../../apps/api/test/reception/stock-alertes-admin.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P10-02 — Paramètres Règles métier › Réception modifiés et conservés ; valeur hors bornes refusée

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-178 (FAIT), ECR-ADM-05 (PARTIEL)
- **Profil** : dev.admin
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Modifier un paramètre, recharger.
  2. Saisir une valeur hors bornes.
- **Résultat attendu** :
  - Message de succès, valeur conservée, historique ; valeur hors bornes refusée avec son message.
- **Tests automatisés correspondants** : [`e2e/admin-parametres.spec.ts`](../../../e2e/admin-parametres.spec.ts) ; [`apps/api/test/reception/stock-alertes-admin.int.test.ts`](../../../apps/api/test/reception/stock-alertes-admin.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P10-03 — Référentiels imprimeurs / livreurs ; doublon refusé

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-179 (PARTIEL), ECR-ADM-07 (PARTIEL)
- **Profil** : dev.admin
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Ajouter un imprimeur, puis le même une seconde fois ; désactiver.
- **Résultat attendu** :
  - Ajout accepté, doublon refusé avec son message ; agents de réception en lecture seule.
- **Tests automatisés correspondants** : [`e2e/admin-lot3.spec.ts`](../../../e2e/admin-lot3.spec.ts) ; [`apps/api/test/admin/referentiels-reception.int.test.ts`](../../../apps/api/test/admin/referentiels-reception.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P10-04 — Règles d'alerte : canal et destinataires paramétrables

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-190 (PARTIEL), ECR-ADM-04 (PARTIEL)
- **Profil** : dev.admin
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Modifier le canal et les destinataires d'une règle d'alerte ; recharger.
- **Résultat attendu** :
  - Valeur conservée au rechargement (RG-REC-190, statut matrice PARTIEL).
- **Tests automatisés correspondants** : [`e2e/admin-lot3.spec.ts`](../../../e2e/admin-lot3.spec.ts) ; [`apps/api/test/admin/regles-alerte.int.test.ts`](../../../apps/api/test/admin/regles-alerte.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P10-05 — Dashboard de réception, taux d'entretien, export vers PEX / Broadcast

- **Type** : Bloqué
- **Exigences et règles couvertes** : RG-REC-194 (BLOQUÉ), RG-REC-195 (BLOQUÉ), RG-REC-199 (BLOQUÉ)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Statut matrice : BLOQUÉ (Q-005 pour l'export ; dashboard à préciser).
- **Étapes** :
  1. Ouvrir le dashboard de réception.
- **Résultat attendu** :
  - À exécuter après levée du blocage.
- **Tests automatisés correspondants** : aucun (cas manuel ou bloqué)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
