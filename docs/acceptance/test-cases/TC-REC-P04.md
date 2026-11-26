# TC-REC-P04 — Valider la réception : création de la réception « À contrôler », affiches, mouvements

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Parcours | REC-P04 — fiche dans [ANALYSE_FONCTIONNELLE_COMPLETE.md](../../specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md) §4 ; RG du parcours dans [PLAN_IMPLEMENTATION.md](../../PLAN_IMPLEMENTATION.md) §2-3 |
| Statut au plan | PARTIEL (2026-11-04 : implémenté, testé, audité ; RG BLOQUÉES / PARTIEL listées dans la matrice et ECARTS) |
| RG rattachées dans la matrice | 13 FAIT · 1 BLOQUÉ |
| Exigences EX rattachées (matrice) | EX-REC-503 (FAIT), EX-REC-505 (PARTIEL), EX-REC-506 (PARTIEL), EX-STK-501 (FAIT), EX-THM-501 (FAIT), EX-EXI-055 (FAIT), EX-REC-013 (FAIT), EX-REC-014 (FAIT), EX-REC-016 (FAIT), EX-REC-017 (FAIT), EX-REC-052 (FAIT), EX-REC-060 (FAIT) |
| Écrans | ECR-REC-01, ECR-REC-02 |
| Profils | dev.recep ; dev.coord |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-REC-P04-01 — Réception validée : réception À contrôler, affiches et mouvements créés, palette dans le sas

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-038 (FAIT), RG-REC-045 (FAIT), RG-REC-033 (FAIT), RG-X-005 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : base de dev, plateformes fictives « … (JDD) » ou centres de démonstration (`pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:scenarios`) ; ne pas utiliser les plateformes portant les données reprises (EXC-007).
- **Étapes** :
  1. Mettre une ligne au panier, joindre la photo, compléter le bon de livraison.
  2. Cliquer « Valider la réception ».
- **Résultat attendu** :
  - La réception est créée À contrôler avec ses affiches et mouvements « Réception » (RG-REC-038).
  - Les champs de saisie sont vidés ; la palette entre dans le sas (RG-REC-045).
  - « Affiche reçue » est posée dès l'arrivée de la palette (RG-X-005).
- **Tests automatisés correspondants** : [`e2e/reception-panier.spec.ts`](../../../e2e/reception-panier.spec.ts) ; [`e2e/reception-parcours.spec.ts`](../../../e2e/reception-parcours.spec.ts) ; [`apps/api/test/reception/validation.int.test.ts`](../../../apps/api/test/reception/validation.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P04-02 — Ordre des refus et absence d'écriture partielle

- **Type** : Rejet
- **Exigences et règles couvertes** : RG-REC-037 (FAIT), RG-REC-046 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Soumettre un panier qui viole plusieurs refus (photo, plateforme, quantité, champs).
  2. Provoquer un échec en cours d'écriture (test d'atomicité).
- **Résultat attendu** :
  - Le premier refus de la liste ordonnée est renvoyé, rien n'est écrit (RG-REC-037).
  - Échec en cours d'écriture : retour arrière complet (RG-REC-046).
- **Tests automatisés correspondants** : [`apps/api/test/reception/validation-complement.int.test.ts`](../../../apps/api/test/reception/validation-complement.int.test.ts) ; [`apps/api/test/interactions/atomicite.int.test.ts`](../../../apps/api/test/interactions/atomicite.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P04-03 — Réception partielle, complément d'une affiche et surplus

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-040 (FAIT), RG-REC-050 (FAIT), RG-REC-051 (FAIT)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Réceptionner une partie de l'attendu, puis le complément.
  2. Réceptionner plus de 110 % de l'attendu.
- **Résultat attendu** :
  - Ligne Partielle puis complétée, complément sur l'affiche existante (RG-REC-040, RG-REC-050).
  - Au-delà de 10 % : ligne Surplus (RG-REC-051).
- **Tests automatisés correspondants** : [`apps/api/test/reception/validation-complement.int.test.ts`](../../../apps/api/test/reception/validation-complement.int.test.ts) ; [`apps/api/test/reception/validation.int.test.ts`](../../../apps/api/test/reception/validation.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-REC-P04-04 — Réception sans IP : intitulé saisi ; réception « Sans BL » explicite

- **Type** : Nominal
- **Exigences et règles couvertes** : RG-REC-047 (FAIT), RG-NEW-REC-001 (Réalisé, vérifié)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Réceptionner sur un dossier sans IP en saisissant l'intitulé.
  2. Réceptionner en choisissant explicitement « Sans BL » (transporteur renseigné).
- **Résultat attendu** :
  - L'intitulé saisi est conservé (RG-REC-047).
  - Photo, n° de BL et imprimeur peuvent manquer, le transporteur reste obligatoire ; la livraison porte « Sans BL » (RG-NEW-REC-001).
- **Tests automatisés correspondants** : [`apps/api/test/reception/validation.int.test.ts`](../../../apps/api/test/reception/validation.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
