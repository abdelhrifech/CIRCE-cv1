# Base réelle CIRCE (copie Docker) : lecture, correspondance avec le modèle V2, faisabilité d'un remplacement

Date : 2026-11-24. Source : conteneur `circe-sql` (SQL Server 2025), base `CIRCE`, lue **en lecture seule** (requêtes `SELECT` uniquement, aucune écriture). Rapports détaillés : `A-referentiels-reception.md` (37 tables), `B-coordination-production.md` (contrôles exécutés en §8 bis). Aucune donnée personnelle dans ces documents ; les profils bruts (avec échantillons) restent hors dépôt, dans le scratchpad de la session.

## 1. Ce qu'est la base

- Export de la base de **qualification** (UAT) `CIRCE`, fenêtre du **07/07 au 07/10/2026** (semaines 202628 à 202641), produit le 12/11/2026 par `generate_export.py` (`export_meta.info`, verdict OK).
- Secrets masqués (clés d'API transporteurs, identifiants dans les URL de suivi). **Sans historique** (tables `histo_*`, `th_*`, `tt_log` vides) et **sans tables utilisateurs** (`tr_utilisateur*`, droits, menus absents).
- 83 tables, dont 22 vides ; ≈ 1,1 million de lignes, surtout `tf_face_train` (388 805) et `instruction_detail` (357 284). 2 822 photos annoncées « rapatriées », mais aucun contenu de fichier dans `photo`.

## 2. Correspondance avec le modèle V2 (68 modèles Prisma)

| Domaine | Tables réelles → modèle V2 | Verdict |
|---|---|---|
| Référentiels | `tr_plateforme`, `tr_atelier`, `tr_categorie_support`, `tr_imprimeur`, `tr_transposteur_reception`, `tr_rouleur`, `tr_destinataire`, `tr_jour_depart`, `tr_instruction_plus`, `Surface`, `Transaco_Surface_Format`… | TRANSFORMATION : renommage de colonnes (`plt_id` → `id`…), conservation des id d'origine ; atelier 0 (`ate_type = 0`) sans valeur dans `TypeAtelier` |
| Types de préparation | `tr_type_preparation` (0 à 13, clés des tables de faits) / `TypePreparation` (1 à 28, id Broadcast) → un seul `type_preparation` V2 | À DÉCIDER : deux espaces d'id incompatibles, la fusion Q-318 perd la correspondance |
| Réception | `livraison`, `affiche`, `asso_livraison_affiche`, `asso_livraison_photo`, `photo`, `mouvement`, `tf_prepa_affiche`, `tf_dossier_semaine_depart` | TRANSFORMATION lourde : `reception` V2 à créer depuis les 1 976 livraisons ; type de mouvement à inférer ; `affiche.quantite` à recalculer ; lien affiche ↔ ligne sans quantité |
| Coordination / production | `instruction_train`, `instruction_visuels`, `instruction_detail`, `tf_face_train`, `tf_repart_calcul`, `tf_UM`, `tf_UM_colis`, `tf_colis`, `tf_prepa_Broadcast`, `tr_ate_dest_trans`, `tr_dest_adresse` | TRANSFORMATION : statut `rpc_statut` (0 à 10) → enums V2 ; `version` réelle (version du train) ≠ verrou optimiste ; `plateformeId` des colis à dériver de l'atelier ; ≈ 25 colonnes de faces sans champ |
| Sans équivalent réel | `utilisateur`, rôles, périmètres, `dossier` (dérivable de `cont_num`, statut sans source), `reception`, alertes, bagues, suivi 8 m², déblocages, vérifications de thèmes, corrections Broadcast, exports de trains, génération de fichiers, encollage Bus, mails | Vides, ou à garder du JDD de démo |
| Abandonnables | `tr_commune`, `tr_communes_calber` (75 000 lignes), `tr_destination` (figé depuis 2018), tables AMT et Geodis, `Activite`/`Equipe`/`Machine` (production legacy) | Hors périmètre V2 actuel |

**Statuts (Q-004 résolue).** `tr_statut` : 0 À traiter, 1 En cours, 2 Instructions ok, 3 Erreur, 4 Annulé, 5 A imprimer, 6 Préparé, 7 A expédier, 8 Terminé, 9 Export prépa, 10 Au roulage. Même ordre que l'enum C# `StatutPreparation` : l'hypothèse de Q-004 est confirmée. Seul écart de libellé : le code 5 vaut « A imprimer » en production et `PRET_A_PRODUIRE` dans `StatutInstruction`.

## 3. Qualité mesurée (requêtes exécutées)

- Intégrité des liens principaux : bonne (0 mouvement sans affiche, 0 association BL ↔ affiche orpheline, 0 détail sans instruction, 0 UM ou colis orphelin, 0 colis mélangeant des destinataires).
- **Effets de fenêtre** (export de 3 mois d'une base qui vit depuis 2018) :
  - 3 396 affiches créées avant le 07/07 ;
  - 4 489 affiches dont la quantité ≠ Σ mouvements ;
  - 527 stocks négatifs ;
  - 4 883 lignes attendues pointant vers un rattachement hors export ;
  - 12 transports et 980 adresses de destinataires orphelins.
- **Règles métier V2 violées par les données réelles** :
  - RG-COO-043 (répartition à 100 %) : 268 instructions validées ne somment pas 100 %.
  - RG-COO-264 (quantité d'UM) : 25 UM où Σ colis ≠ quantité, 2 923 où Σ répartitions ≠ quantité.
  - 1 instruction « prête » a une face à un statut incompatible.
- **Données manquantes ou anormales** :
  - mouvements de réception datés `0001-01-01`, car le legacy ne renseigne jamais la date ;
  - 345 affiches sans n° de dossier ;
  - 8 119 lignes attendues sans plateforme ;
  - `tf_prepa_affiche.Statut` toujours vide (statut calculé dans le legacy).

## 4. Peut-on remplacer les données de la base de dev par les données réelles sans impact sur les règles métier ?

**Pas tel quel, et pas sans impact.** Un import est faisable techniquement, mais seulement en partie et par un script de transformation. Une copie directe n'est pas possible, pour cinq raisons :

1. **Les règles de la V2 sont plus strictes que les données réelles.** Charger les données sans passer par les services contournerait ces règles (CLAUDE.md §7.4). Passer par les services rejetterait une part des lignes : répartitions ≠ 100 %, UM incohérentes, stocks négatifs, plateformes manquantes.
2. **Les invariants de la V2 ne tiennent pas sur une fenêtre de 3 mois.** « Stock = Σ mouvements » et « reçu = Σ rattachements » demandent des mouvements d'ouverture (stock initial au 07/07) ou une reprise complète de l'historique.
3. **La V2 a des concepts sans source réelle** : utilisateurs et périmètres, réception, statut du dossier, mode d'Instruction OK. Il faudrait des valeurs déduites ou des HYPOTHÈSES. Par exemple, sans `iokMode` ni dossier `PREPARATION_RECUE`, aucune instruction réelle n'est exportable (RG-COO-211).
4. **Les données sont dans le passé** (départs du 18/06 au 09/10/2026). Les écrans à la semaine courante seraient vides et les règles temporelles faussées (retard 24 h, purge à 4 semaines, export du jeudi). Il faudrait simuler l'horloge ou décaler les dates, mais les semaines sont gravées dans les clés (`instr_code`, codes-barres).
5. **Données personnelles et conformité.** La base contient des noms de personnes, des logins Windows, des contacts et des adresses. Le Standards (DOC-024 : aucune donnée de production dans les jeux de test ; FIN-020 : destruction des copies) et la skill `circe-jdd` l'interdisent sans anonymisation ou accord explicite (Q-321).

**Ce qui est faisable sans risque pour les règles** :

- **Référentiels réels** (plateformes, ateliers, formats, imprimeurs, transporteurs, rouleurs anonymisés, destinataires, jours de départ, surfaces), avec leurs id d'origine.
- **Valeurs de `tr_statut`** pour fermer Q-004.
- **Volumétrie réelle** pour mesurer les performances SQLite. ≈ 900 000 lignes demandent des index supplémentaires.
- **Réception sur une seule semaine**, en rejouant les livraisons par les services. Cela produit des réceptions, rattachements et mouvements cohérents, mais seules les lignes valides passent.

**Recommandation.** Garder le JDD de démo comme base de dev et créer une **base de recette séparée** (`recette.db`) alimentée par un script de reprise. Ce script :

- pseudonymise les données personnelles ;
- convertit les référentiels avec leurs id d'origine ;
- convertit les statuts selon `tr_statut` ;
- crée des mouvements d'ouverture ;
- produit un rapport de rejets qui liste chaque ligne refusée et la RG concernée.

Ce rapport mesure en lui-même l'écart entre le legacy et les règles cible. Les décisions nécessaires sont posées en Q-437 à Q-443.
