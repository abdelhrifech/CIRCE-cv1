# TC-NEW — Nouvelles spécifications du 12/11/2026 et maquette du 16-20/11 : Bus, non-conformités, pilotage, stocks, administration

> Fichier généré à partir des cas rédigés (voir [README](../README.md)). Les identifiants EX-, RG- et ECR- cités
> existent dans `docs/specifications/` ou dans `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md` ; aucun cas ne crée de règle.

| Élément | Valeur |
|---|---|
| Regroupement | Regroupement documentaire (aucun identifiant de parcours) : `docs/specifications/REGLES_METIER_NOUVELLES_SPECS_2026_11_12.md`, compléments de la matrice (nouvelles spécifications, maquette-new). |
| Écrans | écrans Bus, NC, Tableau de bord, Stocks, Administration |
| Profils | dev.recep, dev.coord, dev.admin, dev.com selon l'écran |

## Jeu de données et profils

- Tests automatisés : base de test `apps/api/prisma/test.db` uniquement, données fictives de `apps/api/scripts/e2e-seed.ts` (utilisateurs `e2e.recep`, `e2e.coord`, `e2e.chef`, `e2e.admin`) ; JDD massifs reproductibles : `pnpm jdd --seed=<n> --volume=<n>` (base de test).
- Recette manuelle : profils de développement `dev.recep`, `dev.coord`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (sélecteur « Profil (dev) » ou `pnpm start:all --user=<profil>`) ; JDD fictifs `pnpm seed:ref`, `pnpm seed:centres`, `pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` (base de dev) sur les plateformes « … (JDD) ».
- JDD fictifs des nouvelles spécifications : `pnpm seed:news` (Bus, J-3, non-conformités, base de dev) ; `pnpm seed:scenarios` (JDD+).
- Ne pas exécuter ces cas sur les plateformes portant les données reprises de Circé (écart déclaré : [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## TC-NEW-01 — Non-conformités : quatre entrées et champs des formulaires ; choix obligatoires signalés

- **Type** : Nominal
- **Exigences et règles couvertes** : EX-NEW-NC-001 (Réalisé, voir précisions), RG-NEW-NC-002 (Réalisé, voir précisions)
- **Profil** : dev.recep
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : `pnpm seed:news` sur la base de dev (plateformes « (JDD) »).
- **Étapes** :
  1. Ouvrir les entrées NC ; remplir un formulaire de réception contrôlée en omettant un choix obligatoire.
- **Résultat attendu** :
  - Les champs sont disponibles ; les choix obligatoires manquants sont refusés par le serveur ; portée déduite du type.
- **Tests automatisés correspondants** : [`e2e/admin-nouvelles-specs.spec.ts`](../../../e2e/admin-nouvelles-specs.spec.ts) ; [`apps/api/test/nonconformite/parcours.int.test.ts`](../../../apps/api/test/nonconformite/parcours.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-NEW-02 — Déclarants : import Excel, doublons normalisés, export XLSX

- **Type** : Nominal
- **Exigences et règles couvertes** : EX-NEW-ADM-001 (Réalisé, voir précisions)
- **Profil** : dev.admin
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Fichier `e2e/fixtures/declarants-comprimes.xlsx`.
- **Étapes** :
  1. Importer le fichier ; réimporter ; exporter.
- **Résultat attendu** :
  - Doublons neutralisés (casse, accents, espaces) ; export XLSX ; déclarants persistés.
- **Tests automatisés correspondants** : [`e2e/admin-nouvelles-specs.spec.ts`](../../../e2e/admin-nouvelles-specs.spec.ts) ; [`apps/api/test/nonconformite/parcours.int.test.ts`](../../../apps/api/test/nonconformite/parcours.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-NEW-03 — Bus : cinq pages accessibles, ajustement manuel centre × parc × format

- **Type** : Nominal
- **Exigences et règles couvertes** : EX-NEW-BUS-001 (Réalisé, voir précisions), RG-NEW-BUS-002 (Réalisé, voir précisions), EX-NEW-NAV-001 (Réalisé, voir précisions)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
  - Exécution manuelle : `pnpm seed:news`.
- **Étapes** :
  1. Ouvrir les cinq pages Bus ; ajuster une quantité par centre × parc × format.
- **Résultat attendu** :
  - Pages accessibles, contexte actif unique ; ajustement historisé, quantité vendue inchangée ; un réimport conserve l'ajustement.
- **Tests automatisés correspondants** : [`e2e/admin-nouvelles-specs.spec.ts`](../../../e2e/admin-nouvelles-specs.spec.ts) ; [`apps/api/test/bus/parcours.int.test.ts`](../../../apps/api/test/bus/parcours.int.test.ts)
- **Remarque** : Le test d'intégration Bus ne porte pas les identifiants dans ses titres ; il est cité comme preuve par REGLES_METIER_NOUVELLES_SPECS_2026_11_12.md (section Bus).
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-NEW-04 — Tableau de bord : notes personnelles conservées

- **Type** : Nominal
- **Exigences et règles couvertes** : EX-NEW-PIL-001 (Réalisé, voir précisions)
- **Profil** : dev.coord
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Ajouter une note de moins de 500 caractères ; recharger.
- **Résultat attendu** :
  - La note et la disposition sont conservées par utilisateur.
- **Tests automatisés correspondants** : [`e2e/admin-nouvelles-specs.spec.ts`](../../../e2e/admin-nouvelles-specs.spec.ts) ; [`apps/api/test/pilotage/nouveautes.int.test.ts`](../../../apps/api/test/pilotage/nouveautes.int.test.ts)
- **Remarque** : Anomalies ouvertes liées : ANO-075, ANO-076 (lenteurs sur volume réel).
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).

## TC-NEW-05 — Stocks et fin de campagne : renvoi puis destruction avec confirmation ; conservation protégée

- **Type** : Rejet
- **Exigences et règles couvertes** : EX-STK-NEW-001 (IMPLÉMENTÉ, limites de volume tracées), RG-STK-NEW-002 (IMPLÉMENTÉ, recette complète à poursuivre), EX-ADM-NEW-001 (PARTIEL : raccordement moteurs, machines/ateliers et ordonnancement), EX-PIL-NEW-001 (PARTIEL : activité/équipe et graphiques globaux)
- **Profil** : dev.admin
- **Préconditions et jeu de données** :
  - Exécution automatisée : base de test (`apps/api/prisma/test.db`) préparée par `pnpm --filter @circe/api e2e:seed` (lancé par `pnpm test:e2e`).
- **Étapes** :
  1. Ouvrir Stocks, filtrer ; dans Fin de campagne, renvoyer puis détruire.
  2. Ouvrir les nouvelles rubriques d'administration et le suivi de production.
- **Résultat attendu** :
  - La destruction exige une confirmation et conserve les deux sorties ; rubriques chargées sans erreur ; filtres du suivi cumulés sans mutation.
- **Tests automatisés correspondants** : [`e2e/admin-maquette-new.spec.ts`](../../../e2e/admin-maquette-new.spec.ts) ; [`apps/api/test/stocks/fin-campagne.int.test.ts`](../../../apps/api/test/stocks/fin-campagne.int.test.ts)
- **Résultat d'exécution** : à consigner dans une campagne (`docs/acceptance/campaigns/`).
