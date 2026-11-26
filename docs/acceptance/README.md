# Recette — cas de test, traçabilité et campagnes

Ce dossier porte les livrables de recette exigés par le référentiel technique Cityz Media 0.2.0-pre :

- DOC-022 : cas de test rédigés à partir des exigences et règles des spécifications ;
- DOC-023 : matrice de traçabilité exigences ↔ cas de test ;
- DOC-025 : comptes rendus de campagnes (version, environnement, résultats, anomalies, décision du Responsable Métier).

Les spécifications de référence sont dans [`docs/specifications/`](../specifications/). La matrice complète
exigence → code → tests reste [`docs/MATRICE_TRACABILITE_SPECIFICATIONS.md`](../MATRICE_TRACABILITE_SPECIFICATIONS.md).

## Organisation

| Emplacement | Contenu |
|---|---|
| [`test-cases/`](test-cases/) | Un fichier par parcours : `TC-REC-P01.md` à `TC-REC-P10.md`, `TC-COO-P01.md` à `TC-COO-P13.md`, plus deux regroupements hors parcours numérotés (`TC-TRA.md` transverse, `TC-NEW.md` nouvelles spécifications) |
| [`traceability.md`](traceability.md) | Matrice exigences / règles / écrans ↔ cas de test ↔ tests automatisés, générée depuis les cas |
| [`campaigns/`](campaigns/) | Un compte rendu par campagne, nommé `AAAA-MM-JJ-<objet>.md` |

Campagnes consignées :

- [2026-11-24 — recette technique sur données réelles reprises](campaigns/2026-11-24-recette-donnees-reelles.md)
  (décision du Responsable Métier à compléter ; écart [EXC-007](../exceptions/EXC-007-donnees-production-dans-le-depot.md)).

## Conventions d'identifiants

- Cas de test : `TC-<parcours>-<nn>`, par exemple `TC-REC-P04-01`. `<parcours>` reprend l'identifiant du plan
  (`REC-P01` à `REC-P10`, `COO-P01` à `COO-P13`, voir [`PLAN_IMPLEMENTATION.md`](../PLAN_IMPLEMENTATION.md) §2-3).
- `TC-TRA-nn` et `TC-NEW-nn` regroupent des comportements documentés qui n'ont pas d'identifiant de parcours au plan
  (coque de navigation, socle d'erreurs ; nouvelles spécifications du 12/11 et maquette du 16-20/11). `TRA` et `NEW` ne
  sont pas des identifiants de parcours.
- Un cas ne cite que des identifiants `EX-`, `RG-` et `ECR-` qui existent dans `docs/specifications/` ou dans la
  matrice. Un cas ne crée jamais de règle : un comportement sans source donne lieu à une question `Q-nnn` dans
  [`QUESTIONS_OUVERTES.md`](../QUESTIONS_OUVERTES.md).
- Un identifiant de cas n'est jamais réutilisé. Un cas abandonné reste dans son fichier avec la mention « Abandonné ».

## Modèle de cas

```markdown
## TC-<parcours>-<nn> — <titre>

- **Type** : Nominal | Rejet | Permission | Transition interdite | Bloqué | Non repris
- **Exigences et règles couvertes** : RG-…, EX-…, ECR-… (statut de la matrice)
- **Profil** : dev.recep | dev.coord | dev.cheq | dev.expe | dev.admin | dev.com
- **Préconditions et jeu de données** : base, JDD fictif, état initial
- **Étapes** : 1. … 2. …
- **Résultat attendu** : comportement documenté, message, code HTTP
- **Tests automatisés correspondants** : fichier e2e ou d'intégration, ou « aucun (manuel) »
- **Résultat d'exécution** : consigné dans une campagne
```

Jeux de données : uniquement fictifs. Tests automatisés sur la base de test (`apps/api/scripts/e2e-seed.ts`,
`pnpm jdd --seed=<n> --volume=<n>`) ; recette manuelle sur la base de dev avec `pnpm seed:ref`, `pnpm seed:centres`,
`pnpm seed:news`, `pnpm seed:scenarios`, `pnpm jdd:demo --seed=<n>` et les profils `dev.*`, sur les plateformes
« … (JDD) ». La base de dev livrée contient aussi des données reprises de Circé : ne pas les utiliser pour la recette
(EXC-007).

## Modèle de campagne

```markdown
# Campagne du <date> — <objet>

## 1. Identification   (version : commit et tag de build, date, exécutant)
## 2. Environnement    (Staging ou local, base, identité, volume)
## 3. Périmètre        (fichiers de cas exécutés, exclusions)
## 4. Résultats        (un tableau par fichier : cas, résultat OK / KO / non exécuté, commentaire)
## 5. Anomalies        (corrigées, ouvertes, avec règle et cas liés)
## 6. Décision du Responsable Métier   (nom, date, décision, réserves)
```

Une campagne n'a valeur de recette qu'avec la décision nominative du Responsable Métier (DOC-025, DOC-026).

## Mise à jour

1. Ajouter ou modifier un cas dans le fichier du parcours ; vérifier chaque identifiant cité par
   `grep -rn "<ID>" docs/specifications docs/MATRICE_TRACABILITE_SPECIFICATIONS.md`.
2. Mettre à jour [`traceability.md`](traceability.md) (régénération ou ligne ajoutée à la main).
3. Après chaque campagne, ajouter son compte rendu dans `campaigns/` et le citer ci-dessus.
