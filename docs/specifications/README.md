# Spécifications fonctionnelles de CIRCE V2

Répertoire des spécifications fonctionnelles versionnées (DOC-020). Chaque exigence et chaque règle y porte un identifiant
unique, conservé d'une version à l'autre (DOC-021).

Les documents ont été déplacés ici le 26/11/2026 depuis `docs/` par `git mv`, sans modification de leur contenu
métier ; seuls des chemins de fichiers déplacés ont été mis à jour.

## Documents

| Document | Contenu | Rôle |
|---|---|---|
| [RECEPTION_REGLES_METIER.md](RECEPTION_REGLES_METIER.md) | Règles `RG-REC-nnn` du module Réception et règles inter-modules `RG-X-nnn` qui le concernent : énoncé, origine (CONSERVÉE, MODIFIÉE, NOUVELLE, SUPPRIMÉE), sources, questions liées | Référence des règles Réception |
| [COORDINATION_REGLES_METIER.md](COORDINATION_REGLES_METIER.md) | Règles `RG-COO-nnn` (bloc 1 : 001 à 199, bloc 2 : 200 à 399) et `RG-X-nnn` | Référence des règles Coordination |
| [ANALYSE_FONCTIONNELLE_COMPLETE.md](ANALYSE_FONCTIONNELLE_COMPLETE.md) | Acteurs et profils, glossaire, cartographie, fiches de parcours `REC-Pnn` et `COO-Pnn` (section 4), navigation, exigences transverses | Vue d'ensemble fonctionnelle et parcours |
| [REGLES_METIER_NOUVELLES_SPECS_2026_11_12.md](REGLES_METIER_NOUVELLES_SPECS_2026_11_12.md) | Comportements implémentés à partir des nouvelles spécifications du 12/11/2026 (Bus, J-3, non-conformités, tableau de bord), avec leurs sources | Complément des deux documents de règles |
| [EVOLUTIONS_NOUVELLES_SPECS_2026_11_12.md](EVOLUTIONS_NOUVELLES_SPECS_2026_11_12.md) | Comparaison de la nouvelle maquette du 12/11/2026 avec la maquette cible et adaptation | Historique des évolutions |
| [EVOLUTIONS_MAQUETTE_2026_11_16.md](EVOLUTIONS_MAQUETTE_2026_11_16.md) | Évolutions de la livraison de maquette du 16/11/2026 : réalisé, conservé, restant | Historique des évolutions |
| [INVENTAIRE_REGLES_METIER_2026-11-09.md](INVENTAIRE_REGLES_METIER_2026-11-09.md) | Inventaire documentaire des 473 règles de la matrice au 09/11/2026, avec occurrences dans le code et les tests | Inventaire daté, non normatif |

Documents liés, conservés dans `docs/` :

- [MATRICE_TRACABILITE_SPECIFICATIONS.md](../MATRICE_TRACABILITE_SPECIFICATIONS.md) : matrice exigence → règle → code →
  tests → statut (une ligne par EX, RG et ECR).
- [QUESTIONS_OUVERTES.md](../QUESTIONS_OUVERTES.md) : questions `Q-nnn`, hypothèses et décisions qui précisent les
  règles.
- [ECARTS_EXISTANT_VS_CIBLE.md](../ECARTS_EXISTANT_VS_CIBLE.md) : écarts `ECART-nnn` entre le comportement historique
  et la cible.
- [MISSION.md](../MISSION.md) : périmètre de la mission.
- Cas de test de recette : [../acceptance/](../acceptance/).

Sources d'origine, en lecture seule et hors dépôt : `docs-sources/` (spécifications, maquettes, schéma de la base) et
`circe-develop/` (code historique).

## Identifiants

| Préfixe | Objet | Exemple | Où il est défini |
|---|---|---|---|
| `EX-<MOD>-nnn` | Exigence issue des spécifications. `MOD` : `REC` (Réception), `COO` (Coordination), `TRA` (transverse), `ADM`, `STK`, `EXP`, `PIL`, `BUS`, `THM`, `FIX`, `SCR`, `QUA`, `EXI` (existant)… ; exigences des ateliers renumérotées **+500** (Q-350) | `EX-REC-012` | Matrice, documents de règles (champ Sources) |
| `EX-NEW-<MOD>-nnn`, `EX-NEW16-<MOD>-nnn` | Exigences des nouvelles spécifications du 12/11/2026 et de la maquette du 16/11/2026 | `EX-NEW-PIL-001` | Matrice, `REGLES_METIER_NOUVELLES_SPECS_2026_11_12.md` |
| `RG-REC-nnn` | Règle métier Réception (001 à 299, numérotation avec trous) | `RG-REC-012` | `RECEPTION_REGLES_METIER.md` |
| `RG-COO-nnn` | Règle métier Coordination (001 à 399) | `RG-COO-043` | `COORDINATION_REGLES_METIER.md` |
| `RG-X-nnn` | Règle inter-modules Réception ↔ Coordination | `RG-X-015` | Les deux documents de règles |
| `RG-NEW-<MOD>-nnn`, `RG-STK-NEW-nnn`, `RG-NEW16-<MOD>-nnn` | Règles des nouvelles spécifications | `RG-STK-NEW-002` | `REGLES_METIER_NOUVELLES_SPECS_2026_11_12.md`, matrice |
| `ECR-<MOD>-nn` | Écran de la maquette | `ECR-REC-04` | Matrice, documents de règles |
| `REC-Pnn`, `COO-Pnn` | Parcours (REC-P01 à REC-P10, COO-P01 à COO-P13) | `REC-P01` | `ANALYSE_FONCTIONNELLE_COMPLETE.md` §4, `docs/PLAN_IMPLEMENTATION.md` |
| `Q-nnn` | Question ouverte, hypothèse ou décision | `Q-343` | `docs/QUESTIONS_OUVERTES.md` |
| `ECART-nnn` | Écart entre l'existant et la cible | `ECART-128` | `docs/ECARTS_EXISTANT_VS_CIBLE.md` |
| `TC-<parcours>-nn` | Cas de test de recette | `TC-REC-P01-01` | `docs/acceptance/test-cases/` |

Le code et les tests citent ces identifiants : un commentaire `// RG-REC-012` sur la fonction de service qui implémente la
règle, et l'identifiant dans le nom de chaque test (`it('RG-REC-012 …')`), voir [AGENTS.md](../../AGENTS.md) §5.

## Règle de stabilité des identifiants

1. Un identifiant attribué n'est jamais réutilisé pour une autre exigence ou une autre règle, même après suppression.
2. Une règle supprimée par la cible garde son identifiant avec l'origine `SUPPRIMÉE` ; une règle fusionnée laisse un trou
   dans la numérotation.
3. Une modification de l'énoncé d'une règle conserve son identifiant (DOC-021) ; la décision qui la motive est tracée
   par une question tranchée (`Q-nnn`) citée dans la règle.
4. Les anciens identifiants provisoires (`docs/_travail/legacy-*.md`) ne sont cités qu'en source ; ils peuvent coïncider
   numériquement avec un identifiant définitif sans le désigner.
5. Toute règle a une source (`fichier:ligne` ou `doc §/écran`) ; sans source, une question `Q-nnn` est ouverte au lieu
   d'écrire une règle ([AGENTS.md](../../AGENTS.md) §7).

## Modifier une spécification

- Le contenu de ces documents ne change que sur décision métier tracée (question tranchée dans
  `docs/QUESTIONS_OUVERTES.md`), jamais pour faire passer un test.
- Après une modification : mettre à jour la matrice, les cas de test (`docs/acceptance/test-cases/`) et
  `docs/acceptance/traceability.md`.
- Ce répertoire doit être protégé par une règle CODEOWNERS imposant l'approbation de Cityz Media (DOC-026, CIC-004).
