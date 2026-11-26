# B — Base réelle CIRCE (UAT, S28 à S41 2026) : Coordination, production, expédition face au modèle Prisma V2

Date : 2026-11-24. Périmètre : tables SQL Server de coordination, production, colisage / expédition et référentiels associés.
Travail en lecture seule. Aucune donnée personnelle reproduite ici : uniquement des structures, des volumes, des distributions et des valeurs de référentiels codés.

## 0. Sources et limites

| Source | Contenu utilisé |
|---|---|
| Export UAT (scratchpad `mssql/`) : `tables.txt`, `colonnes.txt`, `fk.txt`, `controle.txt`, `referentiels-complets.txt`, `profils/*.prof` | volumes, types, nullabilité, PK, FK déclarées, contrôles de l'export, contenu des référentiels de 100 lignes au plus, profils par colonne (nb de NULL, nb de valeurs distinctes, min, max, 5 lignes d'exemple) |
| `apps/api/prisma/schema.prisma` (+ 22 migrations) | modèles V2, `@@map` / `@map` |
| `docs/specifications/COORDINATION_REGLES_METIER.md` §3 (statuts et transitions), `docs/ANALYSE_MODELE_DONNEES.md` §1, `docs/QUESTIONS_OUVERTES.md` (Q-004, Q-250, Q-301 à Q-347), `docs/ECARTS_EXISTANT_VS_CIBLE.md` | règles, décisions et écarts déjà tracés |
| Code V2 (lecture) : `apps/api/src/modules/coordination/{integration-flux,statuts-trains,statuts-colis,export-trains,colis,instruction-ok}.ts` | usages réels des colonnes |
| Code legacy (lecture) : `circe-develop/BDD/DATABASE/DATABASE/dbo/Stored Procedures/p_integ_train_affiches.sql`, `p_integ_destinataire.sql` | sens de `rdep_datdep`, `dep_sembas`, `instr_code`, clé PEX des destinataires |

Limites : aucune requête ad hoc n'a pu être exécutée. Tout ce qui demande une jointure ou un regroupement (sommes par UM, répartition exacte des statuts…) est marqué **« à vérifier »** et repris dans la liste des requêtes du §8. Les mots « probable » ou « probablement » signalent une déduction faite à partir de comptages de valeurs distinctes.

---

## 1. Synthèse des verdicts

| Table réelle | Lignes | Modèle Prisma | Verdict |
|---|---:|---|---|
| `instruction_train` | 4 392 | `Instruction` | TRANSFORMATION (statut → enum ; `dossierId` dérivé ; `updatedAt` complété) + À DÉCIDER (`iokMode` absent, ce qui bloque l'export, §6) |
| `instruction_detail` | 357 284 | `InstructionDetail` | TRANSFORMATION légère (`ins_dat_maj` vide à 100 % → `insd_dat_cre`) |
| `instruction_visuels` | 6 444 | `InstructionVisuel` | TRANSFORMATION (statut ; 279 statuts NULL → À DÉCIDER) |
| `tf_face_train` | 388 805 | `FaceTrain` (reprise partielle, Q-324) | TRANSFORMATION lourde (statut, `version`→`versionTrain`, `RefPanel`, 1 108 `insv_id` pendants, environ 25 colonnes sans champ) |
| `tf_repart_calcul` | 38 919 | `Repartition` | TRANSFORMATION (statut, `rpc_retire`, colonnes abandonnées) + À DÉCIDER (`IdGroupePreparation` absent) |
| `tf_UM` | 39 439 | `UniteManutention` | TRANSFORMATION (statut, `updatedAt`) |
| `tf_colis` | 12 869 | `Colis` | TRANSFORMATION (`plateformeId` dérivé de l'atelier, noms de colonnes, `float`→`Decimal`, `Mailcolis_envoye` NULL) |
| `tf_UM_colis` | 39 184 | `UniteColis` | TRANSFORMATION (id technique, `created_at`) |
| `tf_train_export` | 0 | `ExportTrainLigne` (structure différente) | rien à charger ; reprise directe IMPOSSIBLE (6 groupes de colonnes contre un JSON) et inutile |
| `tf_anomalies` | 0 | AUCUN | abandon (Q-309, Q-329) |
| `tf_colis_ext` | 0 | AUCUN | hors périmètre (Q-310, Q-328) |
| `log_colis_transporteur` | 0 | AUCUN | hors périmètre (Q-310, Q-328) |
| `tf_prepa_Broadcast` | 9 841 | `PrepaBroadcast` | TRANSFORMATION + À DÉCIDER (7 identifiants attendus par la V2 absents) |
| `tr_destinataire` | 932 | `Destinataire` | TRANSFORMATION + À DÉCIDER (**clé PEX et type de destination divergents du code V2**, §3.4) |
| `tr_destination` | 596 | AUCUN | non repris (figé depuis 2018, inutilisé par les répartitions) |
| `tr_type_destination` | 5 | AUCUN | À DÉCIDER (table de passage type Circé ↔ type Broadcast) |
| `tr_dest_adresse` | 1 912 | `DestinataireAdresse` (table `tr_destinataire_adresse`) | TRANSFORMATION (nom de table, recomposition des colonnes, au moins 980 orphelins probables) |
| `tr_type_adresse` | 1 | AUCUN | inutile |
| `tr_commune` | 36 262 | AUCUN | non repris |
| `tr_communes_calber` | 39 208 | AUCUN | non repris (adresses Geodis, Q-328) |
| `tr_transporteur` | 2 | AUCUN (entier sans FK) | À DÉCIDER (référentiel minimal) |
| `tr_trans_tarif` | 4 | AUCUN (texte sans FK) | À DÉCIDER (avec `tr_transporteur`) |
| `tr_transporteur_atelier` | 18 | AUCUN | non repris (chemins réseau, URL de suivi) |
| `tr_ate_dest_trans` | 11 196 | `TransportDestinataire` | TRANSFORMATION (noms de colonnes ; unicité à vérifier ; orphelins) |
| `tr_agence_geodis` | 5 | AUCUN | hors périmètre (Q-328) |
| `tr_format_colis` | 5 | AUCUN (code `Colis.formatCode`) | DIRECT pour les codes ; libellés à exposer |
| `tr_rouleur` | 372 | `Rouleur` | TRANSFORMATION légère |
| `tr_type_anomalie` | 9 | AUCUN | abandon (AMT, Q-329) |
| `tr_lien_cote_cote`, `TR_tri_cote_cote`, `tr_train_convention_a_trier` | 5 / 3 / 2 | AUCUN | À DÉCIDER (côte à côte, bloc « Paris », Q-255) |
| `tr_statut` | 11 | enums `StatutInstruction` / `StatutProduction` | DIRECT par table de correspondance (§2) |
| `tr_statut_repart` | 4 | AUCUN | abandon (RG-COO-276) ; données toujours à 0 |
| `tr_statut_colis` | 16 | AUCUN | hors périmètre (suivi Geodis, Q-328) |
| `PreparationExterne`, `ColisPreparationExterne`, `RessourcePreparationExterne` | 0 | AUCUN | rien à charger ; abandon |

---

## 2. Statuts : correspondance `tr_statut` 0..10 → enums V2

Le contenu réel de `tr_statut` (11 lignes) suit **exactement** l'ordre de l'énumération C# `StatutPreparation` sur laquelle reposaient Q-004 et `integration-flux.ts:154` (`STATUTS_PAR_CODE`). L'hypothèse de Q-004 est confirmée par la donnée. Fermer le volet « export DSI » de Q-004 reste une décision de l'utilisateur.

| Code | Libellé `tr_statut` | `StatutInstruction` (instruction, visuel) | `StatutProduction` (face, répartition, UM, colis) |
|---:|---|---|---|
| 0 | A traiter | `A_TRAITER` | `A_TRAITER` |
| 1 | En cours | `EN_COURS` | `EN_COURS` |
| 2 | Instructions ok | `INSTRUCTION_OK` | `INSTRUCTION_OK` |
| 3 | Erreur | `ERREUR` | `ERREUR` |
| 4 | Annulé | `ANNULE` | `ANNULE` |
| 5 | A imprimer | `PRET_A_PRODUIRE` | `A_IMPRIMER` |
| 6 | Préparé | — (aucune valeur : jamais observé sur une instruction) | `PREPARE` |
| 7 | A expédier | — | `A_EXPEDIER` |
| 8 | Terminé | — | `TERMINE` |
| 9 | Export prépa | — | `EXPORT_PREPA` |
| 10 | Au roulage | — | `AU_ROULAGE` |

Valeurs observées (profils) :

| Colonne | NULL | Distinctes | Min..max | Lecture |
|---|---:|---:|---|---|
| `instruction_train.rpc_statut` | 0 | 5 | 0..5 | 5 des 6 codes 0..5 sont présents (lequel manque : à vérifier) ; aucun code ≥ 6 : conforme à `StatutInstruction` |
| `instruction_visuels.rpc_statut` | 279 | 3 | 0..4 | `InstructionVisuel.statut` est NOT NULL avec la valeur par défaut `A_TRAITER` : à décider pour les 279 NULL |
| `tf_face_train.rpc_statut` | 0 | 6 | 0..10 | 0 et 10 présents, 4 autres codes (à vérifier) |
| `tf_repart_calcul.rpc_statut` | 0 | 3 | 0..4 | **aucune répartition à 6 « Préparé »** alors que la machine d'états V2 prévoit 1 → 6 (RG-COO-250) : à vérifier |
| `tf_UM.rpc_statut` | 0 | 3 | 1..8 | {1, x, 8} avec x entre 2 et 7 (probablement 6 ou 7) |
| `tf_colis.rpc_statut` | 0 | 2 | 1..8 | exactement {1, 8} : aucun colis à 7 au moment de l'export (passage 7 → 8 par la fin de journée, RG-COO-269) ; compatible avec `TRANSITIONS_COLIS` |

Autres référentiels de statut :
- `tr_statut_repart` : 0 NA, 1 En cours, 2 Plateforme, 3 Commerce. `instruction_train.tsr_repart_code` vaut 0 sur 100 % des lignes : cohérent avec l'abandon de l'AMT (RG-COO-276).
- `tr_statut_colis` : 16 états de suivi transporteur (Id 1..16, `Ordre` 0..15). Aucune FK entrante. Les colonnes de suivi de `tf_colis` sont NULL à 100 % : rien à reprendre.
- `tr_instruction_plus` : 0 Standard, 1 début, 2 fin, 3 fin-1, 4 milieu de train. Identique au seed V2 (`InstructionPlus`). Codes observés : 0..2 (8 NULL).
- `tr_format_colis` : 1 Roulée (carton), 2 Palette, 3 Vrac, 4 Sachet, 5 À définir. La valeur par défaut V2 (5, RG-COO-266) correspond. Écart de libellé avec `ANALYSE_MODELE_DONNEES.md` §1.8 (« 1 Carton »).
- `tr_type_adresse` : une seule ligne (« Principale »). Écart avec `ANALYSE_MODELE_DONNEES.md` §1.8, qui annonce STANDARD/URGENTE/AUTRE.

Transformation commune : dans tout le modèle V2, `statut` n'a pas de `@map`. La colonne s'appelle donc `statut` (TEXT d'enum) et non plus `rpc_statut` (tinyint). Le chargement convertit le code en nom d'enum avec le tableau ci-dessus. Il n'y a pas de CHECK en base (Q-346) : un code hors table doit faire échouer l'import, pas passer en silence.

---

## 3. Constats transverses

### 3.1 Types et colonnes techniques
| Type SQL Server | Cible Prisma / SQLite | Remarque |
|---|---|---|
| `numeric(9,0)` (`rpc_id`, `cadr_ident`, `des_id`, `rpc_repartition`, `rpc_num_aff_amt`, `UM_repartition`, `tf_prepa_Broadcast.id`) | `Int` ou `BigInt` | toutes les valeurs observées tiennent sur 32 bits (max observé : 72,6 M) ; le choix `BigInt` du schéma V2 est sans risque |
| identifiants `int` (`insd_id` jusqu'à 579,7 M ; `ft_id` jusqu'à 275,3 M) | `Int` | marge suffisante sous 2^31 |
| `smalldatetime`, `datetime` | `DateTime` | dates naïves en heure locale : **fixer la convention de fuseau** avant l'import. Une conversion Paris → UTC décale les dates à 00:00 sur la veille, ce qui change la semaine ISO calculée par `semaineIsoDe` pour un lundi |
| `timestamp` (rowversion `rpc_tms`, `ano_tms`) | supprimé | remplacé par `version` (verrou optimiste V2) |
| `tinyint` de statut | enum (TEXT) | §2 |
| `bit` NULL (`Mailcolis_envoye`, `pre_assemblage`) | `Boolean` NOT NULL | règle NULL → faux à décider colonne par colonne (`Mailcolis_envoye` : §4.8) |
| `char(1)` O/N (`rpc_retire`, `dest_dispatch`) | `Boolean` / `String` | `rpc_retire` NULL à 100 % → `false` |
| `float` (`colis_poids`) | `Decimal` | imprécision binaire visible dans les exemples : arrondir à 2 décimales |
| `t_dat_sys` (type alias) | — | tables sans données ou non reprises |

### 3.2 Colonne `version` en collision
`tf_face_train.version` (tinyint 0..3, 3 187 NULL) est la **version du train** (RG-COO-067). Dans le schéma V2, `version` sert au verrou optimiste, et la version du train est rangée dans `versionTrain` (`@map("version_train")`). À l'import : `version` réel → `versionTrain`, puis verrou `version` = 1. Ne jamais copier la colonne réelle dans le verrou.

### 3.3 Identifiants des référentiels à conserver (dépendance avec l'analyse des référentiels)
Les tables de faits pointent vers `ate_id`, `sup_id`, `tpr_id`, `dest_id`, `rouleur_id`, `IdJourDepart`. Le chargement n'est possible que si les modèles V2 `Atelier`, `CategorieSupport`, `TypePreparation`, `Destinataire`, `Rouleur`, `JourDepart` gardent les identifiants réels, **y compris les « inconnus » d'identifiant 0** :
- `ate_id = 0` : présent dans les instructions et les faces (7 ateliers distincts, entre 0 et 12) et dans les répartitions (5 distincts, entre 0 et 10). Or `tr_atelier.ate_type = 0` pour l'atelier 0, et l'enum V2 `TypeAtelier` n'a que FIXE / SCROLL : il faut une transformation ou une valeur supplémentaire.
- `sup_id = 0` (« Support inconnu ») dans `tf_prepa_Broadcast` ; `tpr_id = 0` dans les répartitions.
- `TypePreparation` V2 fusionne deux tables (Q-318) : les faits portent `tpr_id` de `tr_type_preparation` (0..13). L'identifiant V2 doit être ce `tpr_id`.
- Ateliers déroulants réels : 5, 6 (2 m²), 7, 8 (8 m²), 11, 12 (4 m²). Ateliers fixes et pliage : 1, 2, 3, 4, 9, 10. Les paramètres V2 laissés vides faute de données (`trains.ateliersExportPrepa`, `suivi8m2.ateliers`, types pliage et bus, Q-319) peuvent désormais être renseignés à partir de ces référentiels, sur décision.

### 3.4 Destinataires : clé PEX et type divergents du code V2 (point bloquant pour les intégrations)
- Legacy (`p_integ_destinataire.sql:41-206`) : la clé PEX est stockée dans `des_PexId`, et `des_type` est le **type Circé** (0 Afficheur, 1 Agence/Site, 2 Société d'affichage, 3 Dépôt, 4 Plateformes), traduit depuis le type Broadcast par `tr_type_destination.IdTypeDestinationDA` (4, 2, 3, 5, 1). `des_id` est l'ancienne clé AMT vers `tr_destination`.
- V2 (`integration-flux.ts:246-253, 362-371`) : recherche et création sur `desType` = **type Broadcast** (1..5, RG-COO-119) et `desId` (`@map("des_id")`) = **clé PEX**.
- Données réelles : `des_id` est NULL sur 484 lignes et prend 426 valeurs (ancienne clé AMT) ; `des_PexId` est NULL sur 64 lignes et prend 822 valeurs ; `des_type` prend 5 valeurs entre 0 et 4.
- Conséquence : chargées telles quelles, les lignes réelles ne sont pas retrouvées par l'intégration V2, qui crée des doublons et rattache les faces au mauvais destinataire (RG-COO-119, 120, 128). Il faut, au choix, transformer à l'import (`desId` ← `des_PexId`, `desType` ← `IdTypeDestinationDA`) ou réaligner le code sur `pexId`. **À DÉCIDER** (QC-B-01).

### 3.5 Données entièrement dans le passé
Toute la période exportée (départs du 2026-06-18 au 2026-10-09, semaines 28 à 41) est antérieure à aujourd'hui (2026-11-24, S48). Effets :
- les filtres « départ à venir » de la V2 (`integration-flux.ts:924`, `alimentation-lignes.ts:913` : `dateDepart > maintenant`) ne retournent rien ;
- les écrans qui s'ouvrent par défaut sur la semaine courante ou suivante sont vides ;
- les règles temporelles se déclenchent toutes comme « dépassées » : RG-COO-066 (préparation non reçue après l'échéance), RG-COO-076 (export du jeudi 14 h), alertes de départ S / S+1.

Les semaines sont gravées dans les clés (`instr_code` aaaaww…, `train_id` aaww…, `UM_code_barre` « aaww-… », `UM_code_synthese`) : décaler les dates oblige à réécrire ces clés. Il est préférable de **simuler l'horloge** (date du jour injectée) plutôt que de décaler les données. À DÉCIDER (QC-B-02).

### 3.6 Données personnelles chargées en base de développement
L'import amènerait dans `dev.db` :
- des noms d'afficheurs (`pers_nom` des faces, répartitions et UM) ;
- des noms de rouleurs ;
- les mails et téléphones des destinataires ;
- les noms d'assistants (`tf_prepa_Broadcast`) ;
- les adresses figées dans les colis ;
- des comptes Windows dans les colonnes `*_user`.

Recommandation : pseudonymiser avant le chargement (hors du présent rapport, qui n'en reproduit aucun). À décider avec l'équipe (QC-B-03).

### 3.7 Sémantique de `rdep_datdep` (`FaceTrain.dateDepart`)
D'après `p_integ_train_affiches.sql:38-46, 105-109` :
- `rdep_datdep` = `DateDepart` Broadcast, c'est-à-dire la date de départ ;
- `dep_sembas` / `dep_anbas` et `cont_sembas` = `Semaine` / `AnneeSemaine`, c'est-à-dire la semaine d'affichage ;
- `instr_code` = `dep_anbas` + `dep_sembas` sur 2 chiffres + `C0` + `ate_id` sur 2 chiffres + `cont_num` sur 8 chiffres (RG-COO-046), ce que confirment les valeurs min et max réelles.

`rdep_datdep` couvre les semaines ISO 25 à 41, contre 28 à 41 pour la semaine d'affichage. Dans les exemples, le départ précède l'affichage de 2 à 4 semaines. Or `colis.ts:137,426` calcule la « semaine » du colis avec `semaineIsoDe(dateDepart)`. Sur données réelles, on obtient la semaine de départ et non la semaine d'affichage. Il faut vérifier que c'est l'intention.

### 3.8 Contrôles de l'export (`controle.txt`) utiles ici
- Aucun orphelin `tf_face_train.instr_code` → `instruction_train`, ni `instruction_detail.instr_code` → `instruction_train`, ni `tf_anomalies.rpc_id` → `tf_repart_calcul`.
- **1 108 faces** pointent vers un `insv_id` qui n'existe pas (déjà absent dans la source).
- Complétude vérifiée pour les UM d'un colis, les répartitions d'une UM et les faces d'une instruction.
- Débordement hors période : 99 répartitions et 101 UM en semaine 42.

---

## 4. Fiches par table

Chaque fiche suit le même plan : (1) contenu et sens métier, (2) modèle Prisma, (3) correspondance des colonnes, (4) qualité observée, (5) impact sur les RG et les performances, (6) verdict.

### 4.1 `instruction_train` → `Instruction`
1. **Contenu.** Une instruction de composition par dossier × semaine d'affichage × atelier déroulant (grain Q-206). PK `instr_code` varchar(18), unique sur les 4 392 lignes : Q-303 est confirmée, pas de doublon. Ateliers : 7 valeurs entre 0 et 12. Ce sont les ateliers déroulants plus l'atelier 0 : le fixe et le pliage n'ont pas d'instruction. 2 378 dossiers. Semaines 28 à 41 de 2026.
2. **Modèle.** `Instruction` (`@@map("instruction_train")`).
3. **Correspondance des colonnes.**

| Colonne réelle | Champ Prisma | Type | Remarque |
|---|---|---|---|
| `instr_code` | `code` | varchar(18) → String | DIRECT |
| `ate_id` | `atelierId` | smallint → Int | FK : l'atelier 0 doit exister |
| `tsr_repart_code` | — | tinyint | toujours 0, non repris (RG-COO-276) |
| `rpc_statut` | `statut` | tinyint → enum | §2 ; colonne renommée |
| `tip_ins_code` | `tipInsCode` | tinyint → Int | 8 NULL ; FK `InstructionPlus` |
| `instr_type_instruction` | `typeInstruction` | varchar | une seule valeur (« contrat ») |
| `rese_ident` | `reseIdent` | int | NULL à 100 % |
| `cont_num` | `contNum` | int | DIRECT |
| `instr_annonceur` | `annonceur` | varchar(30) | DIRECT |
| `cont_anbas`, `cont_sembas` | `contAnbas`, `contSembas` | smallint | DIRECT |
| `instr_commentaire` | `commentaire` | varchar(100) | 3 897 NULL |
| `instr_dat_cre` | `createdAt` | datetime | 0 NULL |
| `instr_dat_maj` | `updatedAt` | datetime | 8 NULL → reprendre `instr_dat_cre` (le champ est NOT NULL) |
| `instr_user` | — | varchar(20) | perdu : pas d'utilisateur V2 correspondant (Q-345) ; `createdById` NULL |
| `instr_entretien` | `entretien` | smallint | 28 valeurs, de 0 à 100 |
| `instr_CommentExtPlay` | `commentExtPlay` | varchar(255) | 3 838 NULL |
| `Conservation`, `CoteCote` | `conservation`, `coteCote` | int / tinyint | 890 NULL chacun |
| — | `dossierId` | | à dériver : `Dossier` par `cont_num` (§5) |
| — | `iokMode`, `iokParId`, `iokLe` | | **aucune source** (historique non exporté) |
| — | `exporteLe`, `exporteParId` | | aucune source |
| — | `version`, `createdById`, `updatedById` | | 1 / NULL |

4. **Qualité.**
   - 7 instructions sans face (4 392 contre 4 385 `instr_code` distincts dans les faces).
   - 266 instructions sans détail, 265 sans visuel.
   - Il existe des instructions sur l'atelier 0 (par exemple au statut 0, créées par le flux Broadcast).
   - Cohérence du préfixe `instr_code` avec `cont_anbas` / `cont_sembas` : à vérifier sur la totalité (seuls le min et le max sont cohérents).
5. **Impact.**
   - Machines d'états RG-COO-040, 041, 044, 045, 046 : correspondance directe.
   - Le statut 3 ERREUR est hérité (RG-COO-041) : à reconduire à 1 à l'intégration suivante.
   - **RG-COO-211** (`export-trains.ts:98-108`) n'exporte que les instructions `INSTRUCTION_OK` dont `iokMode` vaut AUTO ou MANUEL **et** dont le dossier est `PREPARATION_RECUE`. Sur données réelles, `iokMode` est NULL partout et le statut du dossier est inconnu : **aucune instruction n'est exportable**. L'affichage « automatique / après contrôle » (RG-COO-042, 044) est vide.
   - RG-COO-167 : les lignes de l'atelier 0 ne sont visibles par aucun périmètre d'atelier.
   - Volume négligeable.
6. **Verdict.** TRANSFORMATION + À DÉCIDER : faut-il dériver `iokMode` (par exemple selon que `instr_user` est un compte technique ou nominatif), ce qui serait une règle inventée ? Proposition : QC-B-04.

### 4.2 `instruction_detail` → `InstructionDetail`
1. **Contenu.** Lignes « cadre » ou « bdx » (`insd_type`, 2 valeurs) d'une instruction, une par face ou emplacement (`insd_cadr_ident`, `insd_cadre_lib`), avec thème et repiquage. 357 284 lignes ; 4 126 instructions ; 23 dates de création seulement, toutes écrites par un même compte technique d'intégration.
2. **Modèle.** `InstructionDetail`.
3. **Correspondance des colonnes.** `insd_id`→`id` ; `instr_code`→`instructionCode` ; `insd_cadr_ident`→`cadrIdent` ; `insd_cadre_lib`→`cadreLib` ; `sup_id`→`supportId` ; `tpr_id`→`typePreparationId` ; `insd_afch_ident`→`afchIdent` ; `insd_theme`→`theme` ; `insd_repiquage_ident`→`repiquageIdent` ; `insd_repiquage`→`repiquage` ; `insd_type`→`type` ; `insd_dat_cre`→`createdAt` ; `ins_dat_maj`→`updatedAt`, **NULL à 100 %**, à remplacer par `insd_dat_cre`. `insd_user` n'est pas repris.
4. **Qualité.**
   - `sup_id` est NULL sur 317 797 lignes (89 %) ; la seule valeur non nulle est 1026.
   - `tpr_id` prend 3 valeurs (2, 10, 11) ; thème NULL sur 497 lignes ; repiquage renseigné sur 497 lignes seulement.
   - FK `instr_code` : 0 orphelin (contrôle 89). La FK que la V2 ajoute (Q-317) passera.
5. **Impact.**
   - 357 k lignes : avec l'index `instructionCode` existant, une lecture par instruction est rapide.
   - Éviter tout chargement complet en mémoire.
   - Le support n'est pas fiable (NULL en majorité) : aucune règle ne doit en dépendre.
6. **Verdict.** TRANSFORMATION légère.

### 4.3 `instruction_visuels` → `InstructionVisuel`
1. **Contenu.** Visuels (thèmes) d'une instruction avec pourcentage de répartition (`insv_pourcentage` : 3 valeurs entre 0 et 100) et thème d'origine. 6 444 lignes ; 4 127 instructions.
2. **Modèle.** `InstructionVisuel`.
3. **Correspondance des colonnes.** `insv_id`→`id` ; `instr_code`→`instructionCode` (FK déclarée) ; `sup_id`→`supportId` ; `tpr_id`→`typePreparationId` ; `rpc_statut`→`statut` (renommée, enum) ; `insv_afch_ident`→`afchIdent` ; `insv_theme`→`theme` ; `insv_theme_ori`→`themeOri` ; `insv_pourcentage(_ori)`→`pourcentage(Ori)` (decimal(6,2) → Decimal) ; `insv_dat_cre`→`createdAt` ; `insv_dat_maj`→`updatedAt` (2 749 NULL, à compléter). `insv_user` n'est pas repris.
4. **Qualité.**
   - Un groupe homogène de **279 lignes** a `sup_id`, `rpc_statut`, `insv_afch_ident`, `insv_theme_ori` et `insv_pourcentage_ori` tous NULL : probablement des visuels ajoutés à la main ou par un autre chemin.
   - `insv_pourcentage_ori` vaut 0,00 sur toutes les lignes non nulles : la colonne n'a pas de sens observable.
   - `sup_id` ne prend qu'**une seule valeur (26)**, quel que soit l'atelier.
5. **Impact.**
   - RG-COO-043 (`instruction-ok.ts:42-52`) somme les pourcentages par couple (`supportId`, `typePreparationId`). Avec un support constant ou NULL, la règle revient à une somme par type de préparation, plus un groupe « null » pour les 279 lignes. Somme = 100 % pour les instructions au statut 2 ou 5 : à vérifier (§8).
   - 1 108 faces pointent vers un visuel absent (§4.4).
6. **Verdict.** TRANSFORMATION + À DÉCIDER pour les 279 statuts NULL (`A_TRAITER` par défaut ou exclusion).

### 4.4 `tf_face_train` → `FaceTrain`
1. **Contenu.** Une face d'un train déroulant, c'est-à-dire une affiche à poser à une position d'un panneau pour une semaine. 388 805 lignes ; 69 colonnes.
   - Supports : 5 valeurs entre 26 et 1027, tous déroulants (26, 27, 29, 1026, 1027).
   - Ateliers : 7 valeurs (0, 5, 6, 7, 8, 11, 12 probables).
   - `ft_type` : 4 valeurs, dont « Face », « entretien » et « exception ».
   - `train_id` : 166 008 trains distincts, soit environ 2,3 faces par train en moyenne.
2. **Modèle.** `FaceTrain` (reprise partielle, Q-324).
3. **Correspondance des colonnes.**

| Colonne réelle | Champ Prisma | Remarque |
|---|---|---|
| `ft_id` | `id` | DIRECT |
| `dest_id` | `destinataireId` | 81 valeurs ; 3 FK redondantes dans le réel |
| `rpc_statut` | `statut` | §2 |
| `ate_id`, `sup_id` | `atelierId`, `supportId` | identifiants réels à garder (§3.3) |
| `instr_code` | `instructionCode` | 0 orphelin |
| `cadr_ident` (numeric(9,0) NOT NULL) | `cadrIdent` (Int) | min 0 |
| `cadre_lib` | `cadreLib` | une valeur littérale « entretien » existe |
| `rdep_datdep` | `dateDepart` | §3.5, §3.7 ; fuseau §3.1 |
| `pers_ident`, `pers_nom` | `afficheurId`, `afficheurNom` | min 0 (pas d'afficheur ?) ; donnée personnelle |
| `cont_sembas`, `cont_anbas`, `cont_num`, `cont_annonc` | `contSembas`, `contAnbas`, `contNum`, `contAnnonc` | 1 NULL sur sembas / anbas |
| `empl_sect_code`, `empl_depa_code`, `comm_numord`, `empl_numord`, `empl_addresse1` | champs `empl*` / `commNumord` | NULL sur environ 27 923 lignes |
| `train`, `rang` | `train`, `rang` | 27 923 / 27 924 NULL |
| `theme`, `theme_id`, `repiquage`, `repiquage_id` | idem | thème NULL sur 3 187 lignes |
| `train_id` | `trainId` | 3 789 NULL |
| `ordre_propose`, `ordre_reel` | `ordrePropose`, `ordreReel` | `ordre_reel` entre 0 et 99 |
| `ordre_calcule`, `ordre_reel_initial` | `ordreCalcule`, `ordreReelInitial` | NULL à 100 % |
| `insv_id` | `visuelId` | 31 145 NULL + **1 108 pendants** → NULL obligatoire (FK V2) |
| `dep_sembas`, `dep_anbas` | `depSembas`, `depAnbas` | semaines 28 à 41 de 2026 |
| `ft_type` | `ftType` | 4 valeurs |
| `version` | **`versionTrain`** | §3.2 |
| `rouleur_id` | `rouleurId` | 88 valeurs ; 3 985 NULL |
| `colis_id` | `colisId` | 7 024 NULL ; lien logique sans FK V2 |
| `pre_assemblage` | `preAssemblage` | bit NOT NULL |
| `Conservation`, `CoteCote` | `conservation`, `coteCote` | 27 924 NULL |
| `RefPanel` | `refPanel` | **colonne renommée `ref_panel`** |
| `IdJourDepart` | `jourDepartId` | 5 valeurs (1..5) ; 28 299 NULL |
| `ft_dat_cre`, `ft_dat_maj` | `createdAt`, `updatedAt` | 30 `ft_dat_maj` NULL → reprendre la date de création |

**Colonnes réelles sans champ** (environ 25) :
- `empl_ident` ; `tyaf_code` et `reac_code` (NULL à 100 %) ; `typr_code` (type de préparation 10..13) ;
- `empl_addresse2/3` ; `cadr_lettre` (lettre de position A..Z) ; `form_larg`, `form_haut` ;
- `agreement` (la V2 met une date dans « CentreCommercial » faute de cette colonne, Q-193 (1)) ;
- `rese_ident`, `idre_nom`, `panel_ident`, `ft_user_maj`, `commune` ;
- `IdFaceOTAffichage` (360 499 valeurs : la V2 en fait une approximation, Q-188 (16)) ;
- `CodeUniteUrbaine` ; `Convention`, `RefConvention`, `IdTypeDossier`, `IdStructure`, `IdProduit` (données du bloc « Paris », RG-COO-214, Q-255) ;
- `IdLienCoteCote`, `IdPanelDestination`.

**Champs Prisma sans source** : `fractionnee` (faux), `origineTrain`, `motifSuppression`, `createdById`, `updatedById`, `version`.

4. **Qualité.**
   - Un bloc de 27 923 à 27 924 faces (7,2 %) n'a ni emplacement, ni panneau, ni train, ni rang, ni convention : probablement les types « entretien » et « exception ». Répartition de `ft_type` à vérifier.
   - `IdLienCoteCote` n'est renseigné que sur 5 276 faces.
   - Semaines cohérentes partout (28 à 41).
   - FK déclarées vers destinataire, atelier, support, rouleur, colis et jour de départ : vérifiées par l'export.
5. **Impact sur les RG.**
   - Machine d'états `TRANSITIONS_FACE` (RG-COO-200 à 225) : codes directs.
   - `PREPARE` (6) et `TERMINE` (8) sont terminaux en V2.
   - Statut d'unité calculé : EN_PROD si une face est à 9 ou 10 (`statuts-trains.ts:65-71`). Le point de non-retour RG-COO-223 fonctionne donc sans table `bague`.
   - RG-COO-224 et 225 : `origineTrain` est NULL. Les `ft_type` « entretien » / « exception » pourraient être l'équivalent legacy, à décider.
   - RG-COO-214 : non calculable sans les colonnes du bloc « Paris ».
   - RG-COO-130 : `IdFaceOTAffichage` réel disponible mais non modélisé.
   - Lettre de position (export, bague RG-COO-300) : à recalculer depuis `cadreLib` faute de `cadr_lettre`.

   **Impact sur les performances.**
   - Environ 390 k lignes et environ 45 colonnes reprises : de l'ordre de 150 à 250 Mo dans SQLite (estimation).
   - Les lectures par semaine et atelier (`export-trains.ts:524` : `atelierId, depAnbas, depSembas, statut`) n'ont pas d'index adapté. Les index existants sont `(statut, atelierId)`, `trainId`, `instructionCode` et `contNum`. Ajouter `(atelierId, depAnbas, depSembas)`.
   - SQLite n'indexe pas les colonnes de relation : `colisId`, `visuelId` et `destinataireId` ne sont pas indexés.
   - Une semaine représente environ 27,8 k faces. Le calcul des unités en mémoire (`trains.ts`) reste supportable, mais il faut le mesurer.
6. **Verdict.** TRANSFORMATION lourde + À DÉCIDER : ajouter par migration les colonnes réelles utiles (`cadr_lettre`, `IdFaceOTAffichage`, `agreement`, `commune`, `typr_code`, colonnes « Paris ») ; proposition QC-B-05.

### 4.5 `tf_repart_calcul` → `Repartition`
1. **Contenu.** Ligne de répartition (quantité par destinataire × atelier × semaine × thème) pour le fixe, le pliage et le bandeau.
   - 38 919 lignes ; ateliers : 5 valeurs entre 0 et 10 ; supports : 7 valeurs entre 5 et 107 (dont les bandeaux 100 et plus).
   - Types de préparation : 6 valeurs entre 0 et 9 ; semaines 28 à 42 (99 lignes en S42).
2. **Modèle.** `Repartition`.
3. **Correspondance des colonnes.**
   - Directes : `rpc_id`→`id` ; `sup_id`, `ate_id`, `tpr_id`, `dest_id`, `UM_id`→`*Id` ; `rpc_statut`→`statut` ; `sem_num`, `sem_annee` ; `des_id`, `des_type`, `des_type_adr` (NULL à 100 %) ; `rpc_type` (NULL à 100 %) ; `rpc_repartition`→`repartition` ; `rpc_annonceur`, `rpc_theme`, `rpc_repiquage`, `rpc_repiquageId` ; `rpc_num_aff_amt`→`numAfficheAmt` ; `rpc_qte`→`qte` ; `rpc_dat_aff`→`dateAffichage` ; `cont_num` ; `numeroReception` (NULL à 100 %) ; `IdPreparationDetail` ; `rpc_dat_cre` / `rpc_dat_maj`→`createdAt` / `updatedAt` (12 NULL).
   - `rpc_retire` (char(1), NULL à 100 %) → `retire = false`.
   - Sans champ : `soc_id` (constant à 1), `act_id`, `rpc_refacturation`, `rpc_san_rep` (NULL à 100 %), `rpc_rpfo_ident` (6 569 valeurs ; RG-COO-272 parle de « libérer le `rpfo_ident` »), `rpc_user`, `rpc_tms`, `pers_ident` / `pers_nom` (afficheur).
   - Sans source : `idGroupePreparation`, `corrigeePlateforme`, `rendueLe`.
4. **Qualité.**
   - 3 360 répartitions sans UM.
   - `rpc_qte` va de 0 à 242 : des quantités nulles existent.
   - 38 798 `IdPreparationDetail` distincts pour 38 919 lignes : environ 121 réutilisations, probablement une annulation (4) suivie d'une réintégration (RG-COO-272).
   - Aucun statut 6 observé (§2).
   - Les 3 colonnes `des_*` à NULL montrent que `tr_destination` ne sert plus.
5. **Impact.**
   - Machine d'états des répartitions (RG-COO-261, 262, 272, 277, 278) : la répartition 1 → 6 (RG-COO-250) n'est pas observée dans les données. Il faut vérifier si le legacy la pratique encore.
   - RG-COO-122, 123, 125, 143 à 149 (groupes de déblocage) reposent sur `idGroupePreparation`, que le réel ne fournit pas : les groupes ne peuvent pas être reconstitués (COO-P08 limité). RG-COO-277 (UM ≥ 6) reste évaluable par les UM.
   - Volume faible.
6. **Verdict.** TRANSFORMATION + À DÉCIDER : `idGroupePreparation` reste NULL ou est dérivé via `IdPreparationDetail` vers Broadcast (source absente de l'export) ; QC-B-06.

### 4.6 `tf_UM` → `UniteManutention`
1. **Contenu.** Unité de manutention (paquet préparé) du fixe et du pliage.
   - 39 439 lignes ; ateliers : 3 valeurs entre 1 et 4 ; supports : 7 valeurs ; quantité de 1 à 89 ; poids de 0,08 à 798.
   - `UM_code_barre` unique (39 439 valeurs = nombre de lignes, préfixe « aaww- »).
2. **Modèle.** `UniteManutention`.
3. **Correspondance des colonnes.**
   - Directes : `UM_id`→`id` ; `tpr_id`, `ate_id`, `sup_id`, `dest_id` ; `rpc_statut`→`statut` ; `sem_num`, `sem_annee` ; `UM_repartition`, `UM_annonceur`, `UM_theme`, `UM_Repiquage`, `UM_num_aff_amt`, `UM_qte`, `cont_num` ; `UM_poids` (numeric(9,2) → Decimal) ; `UM_code_barre` (unique) ; `UM_code_synthese` ; `UM_comment` (NULL à 100 %) ; `UM_date_aff` (8 070 NULL) ; `UM_dat_cre` / `UM_dat_maj` (249 NULL, à compléter).
   - Sans champ : `pers_ident`, `pers_nom`, `UM_user`.
4. **Qualité.**
   - 33 UM sans atelier, type de préparation ni afficheur.
   - 101 UM en S42.
   - 255 UM hors de tout colis.
   - Environ 3 964 UM ne sont référencées par aucune répartition (39 439 contre 35 475 `UM_id` distincts) : à vérifier.
5. **Impact.**
   - RG-COO-260 et 261 (création), 265 (UM 1 ou 6 colisables), 277 (déblocage refusé si ≥ 6), 278.
   - Les 33 UM sans atelier échappent au périmètre RG-COO-167.
   - Invariant Σ `rpc_qte` des répartitions = `UM_qte` : à vérifier.
6. **Verdict.** TRANSFORMATION.

### 4.7 `tf_UM_colis` → `UniteColis`
1. **Contenu.** Lien n–n UM ↔ colis avec quantité (`uc_qte` de 1 à 30). 39 184 lignes ; PK composite (`UM_id`, `colis_id`).
2. **Modèle.** `UniteColis` : `id` technique plus `@@unique([uniteId, colisId])`.
3. **Correspondance des colonnes.** `UM_id`→`uniteId` ; `colis_id`→`colisId` ; `uc_qte`→`quantite` ; `uc_dat_cre`→`createdAt` (le champ V2 est `created_at`) ; `uc_user` et `uc_dat_maj` sont perdus.
4. **Qualité.**
   - 39 184 `UM_id` distincts = nombre de lignes : **chaque UM est dans un seul colis**, aucun fractionnement observé alors que RG-COO-264 le permet.
   - Les liens touchent 6 487 colis.
   - `uc_qte` plafonne à 30 alors que `UM_qte` monte à 89 : au moins certaines UM ont une quantité colisée inférieure à leur quantité. Invariant RG-COO-264 probablement non respecté sur une partie des lignes, à vérifier.
5. **Impact.** RG-COO-264, 265 (même destinataire entre l'UM et le colis : à vérifier), 267.
6. **Verdict.** TRANSFORMATION.

### 4.8 `tf_colis` → `Colis`
1. **Contenu.** Colis expédié vers un destinataire depuis un atelier.
   - 12 869 lignes ; ateliers : 9 valeurs entre 1 et 12 ; transporteurs {1, 2} ; tarifs : 3 codes ; formats : 4 valeurs entre 1 et 5 ; poids de 1 à 575.
   - `colis_code` unique (« C- » + identifiant sur 18 chiffres, RG-COO-266).
   - Les colis sont soit des colis d'UM (6 487), soit des colis de faces (6 286 `colis_id` référencés par les faces). Ces deux ensembles sont probablement presque disjoints ; environ 96 colis n'appartiendraient à aucun des deux (à vérifier).
2. **Modèle.** `Colis`.
3. **Correspondance des colonnes.**

| Colonne réelle | Champ Prisma | Remarque |
|---|---|---|
| `colis_id` | `id` | |
| — | `plateformeId` (NOT NULL, `plt_id`) | **absent du réel** : dériver par `tr_atelier.plt_id` via `ate_id` |
| `ate_id`, `dest_id` | `atelierId`, `destinataireId` | 0 NULL |
| `rpc_statut` | `statut` | {1, 8} |
| `fc_col_id` | `formatCode` (colonne `colis_format`) | renommée |
| `colis_code` | `codeColis` | unique |
| `colis_poids` (float) | `poids` (Decimal) | arrondir |
| `tsp_id` | `transporteur` | sans FK V2 |
| `tarif_code` | `tarif` (colonne `tsp_id_tarif_code`) | renommée |
| `colis_code_ext` | `codeExterne` (colonne `colis_code_externe`) | 5 199 NULL |
| `commentaire` | `commentaire` (colonne `colis_comment`) | 12 839 NULL |
| `colis_dat_expe` | `dateExpedition` | 12 NULL |
| `Mailcolis_envoye` | `mailEnvoye` | 935 NULL, 11 934 à 1 |
| `colis_dat_cre`, `colis_dat_maj` | `createdAt`, `updatedAt` | 12 `maj` NULL |
| `colis_user` | — | perdu |
| `adr_id` + 8 colonnes d'adresse figée (`adr_destinataire` … `adr_cedex`) | — | **adresse du colis au moment de l'envoi non modélisée** |
| 20 colonnes de suivi transporteur (`ref_uni_exp` … `url_preuve_livraison`) | — | NULL à 100 % : aucune perte |

4. **Qualité.**
   - `colis_dat_cre` remonte au 2026-01-09, bien avant la période. Exemple : un colis créé en janvier et expédié en septembre, au statut 8. Il s'agit probablement de colis « navette » de longue durée.
   - Poids minimum 1 : conforme à RG-COO-263 (poids minimum de 1 kg).
5. **Impact.**
   - `TRANSITIONS_COLIS` 1 → 7 → 8 (RG-COO-266, 268, 269) : compatible.
   - RG-COO-268 : le transporteur et le tarif par défaut viennent de `TransportDestinataire` (§4.11).
   - **RG-COO-271** : si les NULL de `Mailcolis_envoye` deviennent `false`, 935 colis anciens seront candidats à un renvoi de mail le jour où l'envoi sera activé (Q-375). Traduire NULL en `true` pour les colis au statut 8 est à décider.
   - Perte de l'adresse figée : l'adresse affichée d'un colis ancien sera l'adresse courante du destinataire.
6. **Verdict.** TRANSFORMATION + À DÉCIDER (`mailEnvoye`, adresse figée) ; QC-B-07.

### 4.9 `tf_train_export`, `tf_anomalies`, `tf_colis_ext`, `log_colis_transporteur`
1. **Contenu.**
   - `tf_train_export` (0 ligne) : trains exportés vers Surf, 6 contrats au plus par ligne.
   - `tf_anomalies` (0) : anomalies AMT 901 à 910 des répartitions.
   - `tf_colis_ext` (0) et `log_colis_transporteur` (0) : retours de suivi transporteur.
2. **Modèle.** `ExportTrainLigne` (même nom de table, structure JSON différente) ; AUCUN modèle pour les trois autres.
3. **Correspondance des colonnes.** Sans objet : tables vides.
4. **Qualité.** Aucune donnée sur la période. L'export des trains n'a donc laissé aucune trace en base UAT, et l'historique « Exporter trains » n'est pas exporté.
5. **Impact.**
   - `alertes-coordination.ts:785-796` utilise la date des lots d'export : aucune alerte fondée sur une date d'export pour les données reprises.
   - Les faces au statut 5 ou plus n'ont pas de lot V2.
6. **Verdict.** Rien à charger. `ExportTrains` et `ExportTrainLigne` restent vides. Abandon de `tf_anomalies` (Q-329). Suivi transporteur hors périmètre (Q-328).

### 4.10 `tf_prepa_Broadcast` → `PrepaBroadcast`
1. **Contenu.** Copie de l'état des réservations Broadcast.
   - 9 841 lignes ; 3 884 dossiers chapeau ; 3 822 DA chapeau ; semaines 28 à 41.
   - `Surface` : 6 libellés (de « 0 m2 » à « 8 m2 ») ; `Format` : 2 libellés (fixe, déroulant).
   - `StatutPreparation` : 2 valeurs (« Calculé », « Envoyé ») et 670 NULL.
   - `DestinataireEffectif` : 3 valeurs. Deux correspondent aux plateformes 1 et 2 ; la troisième désigne un site sans ligne dans `tr_plateforme` (site Bus, Q-335).
2. **Modèle.** `PrepaBroadcast`.
3. **Correspondance des colonnes.**
   - Directes : `id` ; `DestinataireEffectif`, `IdDossierDeVenteChapeau`, `IdDAChapeau`, `Annonceur`, `Surface`, `Format`, `AssistantCommercial`, `AssistantLogistique` (données personnelles), `Theme`, `Bandeau`, `quantite`, `StatutPreparation`, `sem_num`, `sem_annee`, `sup_id`→`supportId` (7 valeurs entre 0 et 29, dont 0 « inconnu »), `repiquage`, `IdThemeBandeau` ; `dateCreated` / `dateModified` → `createdAt` / `updatedAt`.
   - **Champs V2 sans colonne réelle** : `IdSiteCCF`, `IdPreparationChapeau`, `IdSurface`, `IdFormat`, `IdTypePreparation`, `IdTheme`, `EstResteEnPlace`, `date_vue`.
   - Dérivations possibles, sur décision :
     - `idSurface` depuis le libellé `Surface`, qui coïncide avec `Surface.Libelle` ;
     - `idSiteCcf` depuis `DestinataireEffectif` via `tr_plateforme.id_site_ccf` (39, 40) ; impossible pour le troisième site.
   - `idFormat` n'est pas dérivable sans le libellé des formats Broadcast.
4. **Qualité.**
   - `Bandeau` et `repiquage` sont identiques (mêmes 9 715 NULL, 81 valeurs) : colonne en double.
   - Thème NULL sur 615 lignes.
5. **Impact.**
   - RG-COO-080 à 087 (lignes attendues, clé avec thème ; Q-305, Q-325) : sans `IdTheme`, toutes les lignes passent par la variante « sans thème ».
   - RG-COO-092 : `EstResteEnPlace` vaut faux.
   - RG-COO-081 (support à partir de surface × format) : sans objet puisque `sup_id` est fourni.
   - Recoupe le rapport Réception.
6. **Verdict.** TRANSFORMATION + À DÉCIDER (QC-B-08).

### 4.11 `tr_ate_dest_trans` → `TransportDestinataire`
1. **Contenu.** Transporteur et tarif par défaut pour un couple destinataire × atelier (RG-COO-120, 268). 11 196 lignes = 933 destinataires distincts × 12 ateliers (1 à 12) : une ligne par couple très probable. PK réelle (`dest_id`, `tsp_id`, `tarif_code`, `ate_id`).
2. **Modèle.** `TransportDestinataire`.
3. **Correspondance des colonnes.** `dest_id`→`destinataireId` ; `ate_id`→`atelierId` ; `tsp_id`→`transporteur` (colonne `trans_id`) ; `tarif_code`→`tarif` ; `created_at` sans source.
4. **Qualité.**
   - 933 `dest_id` distincts contre 932 destinataires : au moins 1 orphelin (pas de FK sur `dest_id` dans le réel).
   - Unicité (destinataire, atelier) imposée par la V2 : à vérifier (§8).
5. **Impact.** RG-COO-268 utilisable dès que l'import est fait.
6. **Verdict.** TRANSFORMATION (filtrage des orphelins).

### 4.12 `tr_destinataire` → `Destinataire`
1. **Contenu.** Destinataires des envois : afficheurs, agences et sites, sociétés, dépôts, plateformes.
   - 932 lignes ; identifiants de 1 à 2 216 (beaucoup de trous).
   - Actif : 2 valeurs ; dispatch O/N (38 NULL).
2. **Modèle.** `Destinataire`.
3. **Correspondance des colonnes.** `dest_id`→`id` ; `dest_nom_ori`→`nomOrigine` ; `dest_nom`→`nom` ; `dest_actif`→`actif` ; `dest_dispatch`→`dispatch` ; `des_id`→`desId` ; `des_type`→`desType` ; `des_mail`→`mail` ; `des_NumTel`→`telephone` ; `des_PexId`→`pexId` ; `dest_dat_cre` / `dest_dat_maj`→`createdAt` / `updatedAt` (colonnes `created_at` / `updated_at`). `dest_user` est perdu ; `contactModifie` vaut faux.
4. **Qualité.** Mail renseigné sur 198 lignes, téléphone sur 207 (données personnelles). `des_PexId` est NULL sur 64 lignes.
5. **Impact.** **§3.4** : divergence de clé avec RG-COO-119, 120 et 128. Faces, répartitions, UM et colis pointent vers ces identifiants (81 à 142 destinataires utilisés selon la table).
6. **Verdict.** TRANSFORMATION + À DÉCIDER (QC-B-01).

### 4.13 `tr_destination`, `tr_type_destination`
1. **Contenu.**
   - `tr_destination` : ancien référentiel AMT de destinations (PK composite `des_id`, `des_type`, `des_type_adr`). 596 lignes, dernière mise à jour en janvier 2018. Il est référencé par `tr_destinataire.des_id` sans FK, et les répartitions ne l'utilisent plus (`des_*` NULL à 100 %).
   - `tr_type_destination` : 5 types Circé avec leur correspondance Broadcast (`IdTypeDestinationDA`).
2. **Modèle.** AUCUN.
3. **Correspondance des colonnes.** Sans objet.
4. **Qualité.** `tr_destination` est figé depuis 2018 ; `tr_type_destination` est complet (5 types).
5. **Impact.** `tr_type_destination` est indispensable si l'on garde le type Circé dans `desType` (§3.4).
6. **Verdict.** `tr_destination` : non repris (Q-309). `tr_type_destination` : À DÉCIDER (paramètre ou référentiel, selon QC-B-01).

### 4.14 `tr_dest_adresse`, `tr_type_adresse`, `tr_commune`, `tr_communes_calber`
1. **Contenu.**
   - `tr_dest_adresse` (1 912 lignes) : adresse principale par destinataire. Un seul `tad_cod` et un seul `adr_principale` (valeur 1) ; adresse découpée en numéro, type de voie, voie, lieu-dit, localité, code postal, cedex ; `calb_id` renvoie vers la table de communes du transporteur.
   - `tr_commune` (36 262) : communes par département et numéro d'ordre (décode l'emplacement des faces).
   - `tr_communes_calber` (39 208) : codes postaux et communes du transporteur.
2. **Modèle.** `DestinataireAdresse` (table V2 `tr_destinataire_adresse`, colonnes `adr_1`, `adr_2`, `adr_postal`, `adr_localite`, `lieu_dit`) ; AUCUN modèle pour les trois autres.
3. **Correspondance des colonnes.** `adresse1` = numéro + type de voie + voie ; `adresse2` = cedex ou non repris (à décider) ; `codePostal` ← `adr_code_postal` ; `localite` ← `adr_localite` ; `lieuDit` ← `adr_lieu_dit`. Non repris : `calb_id`, `IdAdresse`, `tad_cod`, `adr_principale`, `adr_user_maj`.
4. **Qualité.** 1 912 `dest_id` distincts pour 932 destinataires : **au moins 980 adresses orphelines probables** (pas de FK sur `dest_id`), sauf si l'export de `tr_destinataire` a été filtré (à vérifier dans `export_meta.manifest`).
5. **Impact.** RG-COO-119 (adresse insérée seulement si le destinataire n'en a aucune) : il faut charger les adresses avant de rejouer une intégration. Faces : la V2 n'a pas de colonne `commune` texte ; `tr_commune` ne servirait qu'à la reconstituer.
6. **Verdict.** `tr_dest_adresse` : TRANSFORMATION avec filtrage des orphelins. Les trois autres : non repris (`tr_communes_calber` relève de Geodis, Q-328).

### 4.15 Transport : `tr_transporteur`, `tr_trans_tarif`, `tr_transporteur_atelier`, `tr_agence_geodis`, `tr_format_colis`
1. **Contenu.**
   - `tr_transporteur` : 2 lignes (1 navette interne, 2 messagerie externe) ; les clés d'API sont masquées (NULL).
   - `tr_trans_tarif` : 4 lignes (transporteur 1 : un tarif ; transporteur 2 : trois tarifs, avec expéditeur, incoterm, type d'édition, regroupement).
   - `tr_transporteur_atelier` : 18 lignes (transporteur × ateliers 0 à 8, chemin réseau, URL de suivi aux identifiants masqués).
   - `tr_agence_geodis` : 5 lignes (agence, compte, actif).
   - `tr_format_colis` : 5 lignes (§2).
2. **Modèle.** AUCUN : `Colis.transporteur` / `tarif` et `TransportDestinataire.transporteur` / `tarif` sont des valeurs sans FK.
3. **Correspondance des colonnes.** Sans objet.
4. **Qualité.** Les colonnes sensibles sont masquées par l'export.
5. **Impact.** Sans référentiel, les écrans d'expédition affichent des codes nus (1, 2, codes de tarif).
6. **Verdict.**
   - `tr_transporteur` et `tr_trans_tarif` : À DÉCIDER (référentiel minimal ou libellés en paramètre).
   - `tr_transporteur_atelier` et `tr_agence_geodis` : non repris (Q-328 ; ne pas importer de chemins réseau ni d'URL contenant des identifiants).
   - `tr_format_colis` : codes DIRECT.

### 4.16 `tr_rouleur` → `Rouleur`
1. **Contenu.** Opérateurs de roulage des ateliers déroulants. 372 lignes ; ateliers : 6 valeurs entre 5 et 12 ; date de fin NULL sur 126 lignes, parfois en 2099 (« sans fin »).
2. **Modèle.** `Rouleur`.
3. **Correspondance des colonnes.** `rouleur_id`→`id` ; `ate_id`→`atelierId` ; `rouleur_nom`→`nom` (donnée personnelle) ; `rouleur_date_fin`→`dateFin` (colonne `date_fin`) ; `poste` sans source.
4. **Qualité.** 88 rouleurs sont utilisés par les faces.
5. **Impact.** RG-COO-217 (rouleur obligatoire à « Au roulage ») : les faces réelles ont presque toutes un rouleur (3 985 NULL).
6. **Verdict.** TRANSFORMATION légère.

### 4.17 `tr_type_anomalie`, `tr_lien_cote_cote`, `TR_tri_cote_cote`, `tr_train_convention_a_trier`
1. **Contenu.**
   - `tr_type_anomalie` : codes 901 à 910 de l'intégration AMT (destination, transporteur, adresse, activité, support, type de préparation, atelier, société, afficheur inconnus).
   - `tr_lien_cote_cote` : 1 à 4 = à gauche, à droite, en haut, en bas (regroupement 1) ; 5 = suivi de (regroupement 2).
   - `TR_tri_cote_cote` : Train, Côte à côte, Spécifique.
   - `tr_train_convention_a_trier` : 2 conventions avec période d'application.
2. **Modèle.** AUCUN.
3. **Correspondance des colonnes.** Sans objet.
4. **Qualité.** Référentiels complets et cohérents avec les faces (`IdLienCoteCote` ∈ {1, 2}).
5. **Impact.** Lus par le tri « côte à côte » et le bloc « Paris » du legacy (RG-COO-214, Q-255). La V2 ne les modélise pas : rien n'est cassé, mais rien n'est calculable non plus.
6. **Verdict.** `tr_type_anomalie` : abandon (Q-329). Les trois autres : À DÉCIDER avec Q-255.

### 4.18 `tr_statut`, `tr_statut_repart`, `tr_statut_colis`
Voir §2. `tr_statut` : DIRECT par la table de correspondance (pas de table V2). `tr_statut_repart` : abandon. `tr_statut_colis` : hors périmètre.

### 4.19 `PreparationExterne`, `ColisPreparationExterne`, `RessourcePreparationExterne`
Tables vides : préparations confiées à des plateformes externes, avec colis et ressources. Aucun modèle V2, aucune RG COO sourcée. Abandon (rien à charger).

---

## 5. Tables V2 sans équivalent réel : origine possible des données

| Table V2 | Source réelle possible | Proposition |
|---|---|---|
| `dossier` | dérivable : `cont_num` distincts de `instruction_train` (2 378), `tf_repart_calcul` (2 954), `tf_prepa_Broadcast` (3 884), `tf_face_train` (2 378) ; `annonceur` depuis l'instruction ou la copie Broadcast | création dérivée. **Statut** (RG-COO-063 : `A_TRAITER` / `PREPARATION_RECUE` / `ANNULE`) sans source directe ; indices possibles : `StatutPreparation = 'Envoyé'`, présence de visuels ou détails, répartitions avec `IdPreparationDetail`. Toute dérivation serait une règle inventée → QC-B-04 |
| `demande_correction`, `demande_theme`, `verification_theme` | aucune (le legacy ne trace pas) | vides |
| `passage_integration`, `flux_chargement`, `envoi_broadcast` | aucune (`tt_log` vide dans l'export) | vides |
| `alerte_acquittement` | aucune | vide (alertes calculées) |
| `deblocage_preparation` | `th_repart_annule` (vide dans l'export) | vide |
| `export_trains`, `tf_train_export` (`ExportTrainLigne`) | `tf_train_export` vide ; historique non exporté | vides ; les faces au statut 5 ou plus restent sans lot |
| `generation_fichiers` | aucune (fichiers machine hors base) | vide |
| `bague` | aucune (impression RDLC sans persistance) | vide ; EN_PROD reste calculé par les faces à 9 ou 10 |
| `suivi_8m2` | aucune | vide |
| `rendu_main` | aucune | vide |
| `encollage_bus` | aucune (site Bus absent de `tr_plateforme`) | vide |
| `tf_liberation_semaine` | dérivable sur hypothèse : couples (atelier, semaine) ayant des UM | sans ligne, toutes les semaines passées du fixe et du pliage portent le repère « à libérer » (RG-COO-240 à 242, RG-X-076) ; dériver est une hypothèse (Q-265) → QC-B-09 |
| `mail_file`, `tache_execution`, `regle_alerte` | aucune | vides |
| `journal_audit`, `statut_historique` | `histo_historique_entite` vide dans l'export | vides : aucun historique de statut pour les données reprises |
| `asso_affiche_visuel`, réceptions | hors périmètre B (rapport Réception) | — |

---

## 6. Impact sur les règles métier (récapitulatif)

| Règle(s) | Effet du remplacement des données de dev par les données réelles |
|---|---|
| RG-COO-040, 041, 044, 045, 046 (instruction) | codes 0..5 directs ; statut 3 ERREUR présent ou non (à vérifier) |
| RG-COO-042, 044, **211**, RG-X-083 | `iokMode` NULL → aucune instruction exportable ; mode affiché vide. **Bloquant pour COO-P10 sur données réelles** |
| RG-COO-043 | somme par (support, type) : support constant (26) ou NULL ; somme = 100 % à vérifier |
| RG-COO-063, 062 | statut de dossier sans source |
| RG-COO-067 | `version` → `versionTrain` (§3.2) |
| RG-COO-080 à 087, 092 | clés de ligne sans `IdTheme` ni `IdSurface` ; site Bus non rattaché |
| RG-COO-119, 120, 128 | **divergence clé PEX / type** (§3.4) : doublons de destinataires si une intégration est rejouée |
| RG-COO-122, 123, 125, 143 à 149, 277, 278, RG-X-059 | groupes de préparation absents ; déblocage limité aux gardes calculables par les UM |
| RG-COO-130 | `IdFaceOTAffichage` réel non modélisé |
| RG-COO-167 | périmètre des utilisateurs de dev à rattacher aux identifiants réels ; lignes de l'atelier 0 et 33 UM sans atelier invisibles |
| RG-COO-200 à 209, 221, 222 | trains, rangs et ordres présents ; lettre de position à recalculer (`cadr_lettre` non modélisée) |
| RG-COO-210, 215 à 220, 223 | statuts directs ; EN_PROD dérivé des faces à 9 ou 10 ; paramètres d'ateliers à renseigner (5, 6 / 7, 8, 11, 12) |
| RG-COO-214 | non calculable (colonnes du bloc « Paris » non modélisées ; Q-255) |
| RG-COO-224, 225 | `origineTrain` sans source ; `ft_type` « entretien » / « exception » à rapprocher |
| RG-COO-240 à 242, RG-X-076 | aucune libération → repère « à libérer » sur tout l'historique (QC-B-09) |
| RG-COO-250, 261, 262, 272 | aucune répartition à 6 observée ; `rpfo_ident` non repris |
| RG-COO-263 à 271, RG-X-087 | colis {1, 8} compatibles ; `plateformeId` dérivé ; invariants de quantité UM / colis à vérifier ; mail (RG-COO-271) à protéger contre un renvoi massif |
| RG-COO-066, 076, alertes de départ | toutes les dates sont passées (§3.5) |

---

## 7. Performances SQLite

- Volume à charger dans le périmètre B : environ 900 k lignes, dont 389 k faces et 357 k détails. Taille estimée : 250 à 400 Mo. SQLite le supporte, mais `pnpm start:all` et les tests ne doivent jamais utiliser ce fichier (`test.db` dédié, CLAUDE.md §7).
- Import : `createMany` par lots de quelques milliers de lignes dans des transactions. Désactiver la vérification des FK pendant le chargement, puis lancer `PRAGMA foreign_key_check` à la fin.
- Index à ajouter avant les mesures :
  - `FaceTrain(atelierId, depAnbas, depSembas)`, `FaceTrain(colisId)`, `FaceTrain(visuelId)`, `FaceTrain(destinataireId)` ;
  - `Repartition(uniteId)` ;
  - `UniteManutention(atelierId, semAnnee, semNum)` ;
  - `Colis(atelierId, statut)`.
  
  SQLite ne crée pas d'index sur les colonnes de clé étrangère.
- Points de vigilance déjà tracés :
  - traitements en mémoire (listes, calcul des unités de train, alertes calculées à la lecture) ;
  - lectures par paquets (ANO-049 à 051, limite de paramètres SQLite) ;
  - écritures sérialisées (Q-343).
  
  Une semaine pèse environ 27,8 k faces : les écrans à la semaine sont réalistes, mais les écrans « toutes semaines » (alertes, liste des dossiers) sont à mesurer (étape 9).

## 8. Requêtes de contrôle à exécuter sur l'export (avant toute décision)

1. Répartition exacte de `rpc_statut` par table (instructions, visuels, faces, répartitions, UM).
2. Répartition de `ft_type` ; croisement avec les faces sans emplacement.
3. Σ `insv_pourcentage` par (`instr_code`, `sup_id`, `tpr_id`) pour les instructions au statut 2 ou 5 (RG-COO-043).
4. Σ `uc_qte` par UM comparée à `UM_qte` (RG-COO-264) ; Σ `rpc_qte` par UM comparée à `UM_qte`.
5. UM et colis de destinataires différents (RG-COO-265) ; faces dont le colis a un autre destinataire.
6. Colis au statut 8 avec des UM ou des faces à un statut inférieur à 8 (RG-COO-269).
7. Répartitions avec UM à un statut hors {1, 6} ; répartitions sans UM à un statut hors {0, 3, 4}.
8. Instructions au statut 5 dont des faces sont à un statut hors {4, 5, 7, 8, 9, 10}.
9. `instr_code` comparé à `dep_anbas` + `dep_sembas` + `C0` + `ate_id` + `cont_num` (RG-COO-046).
10. Doublons (`dest_id`, `ate_id`) dans `tr_ate_dest_trans` ; `dest_id` orphelins dans `tr_ate_dest_trans` et `tr_dest_adresse` ; filtre éventuel de `tr_destinataire` dans `export_meta.manifest`.
11. Colis sans UM ni face ; UM sans répartition.


### 8 bis. Résultats des contrôles exécutés le 2026-11-24 (requêtes SELECT sur la copie Docker)

| # | Contrôle | Résultat |
|---|---|---|
| 1 | Statuts | Instructions 0:8, 1:2, 2:565, 4:267, 5:3550 · Faces 0:37, 2:26, 4:3752, 5:188, 8:381780, 10:3022 · Répartitions 0:1047, 1:35559, 4:2313 · UM 1:255, 6:161, 8:39023 · Colis 1:12, 8:12857 |
| 3 | Σ % des visuels ≠ 100 (instructions au statut 2 ou 5) | 496 groupes (instruction, format, type) sur 4 435 ; 268 instructions si l'on somme par instruction seule → RG-COO-043 violée sur une partie des données réelles |
| 4 | Σ `uc_qte` ≠ `UM_qte` | 25 UM · Σ `rpc_qte` ≠ `UM_qte` : 2 923 UM |
| 5 | UM et colis de destinataires différents | 0 |
| 6 | Colis au statut 8 avec une UM < 8 | 0 |
| 7 | Répartitions avec UM hors {1, 6} / sans UM hors {0, 3, 4} | 0 / 0 |
| 8 | Instructions au statut 5 avec des faces hors {4, 5, 7, 8, 9, 10} | 1 |
| 10 | Doublons (`dest_id`, `ate_id`) / orphelins `tr_ate_dest_trans` / orphelins `tr_dest_adresse` | 0 / 12 / 980 |
| 11 | Colis sans UM | 6 382, dont 6 286 portent des faces (colis du déroulant, sans UM) · UM sans répartition : 3 964 |
| — | Autres | 1 face sans instruction ; mouvements datés `0001-01-01` ; 345 affiches sans n° de dossier ; 4 489 affiches dont la quantité ≠ Σ mouvements et 527 à stock négatif (fenêtre de 3 mois : 3 396 affiches créées avant le 07/07/2026, mouvements antérieurs absents) ; 4 883 réceptions attendues pointant vers un rattachement hors export |

## 9. Questions candidates (numérotation définitive à attribuer, dernier n° existant : Q-429)

| ID provisoire | Sujet | Options |
|---|---|---|
| QC-B-01 | Clé PEX et type des destinataires (§3.4) | (a) transformer à l'import (`desId` ← `des_PexId`, `desType` ← `IdTypeDestinationDA`) ; (b) réaligner le code V2 sur `pexId` et le type Circé avec `tr_type_destination` |
| QC-B-02 | Données dans le passé (§3.5) | (a) horloge simulée injectée ; (b) décalage des dates avec réécriture des clés (`instr_code`, `train_id`, codes-barres) |
| QC-B-03 | Données personnelles en base de dev (§3.6) | pseudonymisation avant chargement, ou chargement brut sur poste maîtrisé |
| QC-B-04 | Statut du dossier et `iokMode` des instructions à 2 ou 5 (RG-COO-063, 211) | règle de dérivation fournie par l'équipe, ou laisser NULL (export impossible sur données reprises) |
| QC-B-05 | Colonnes réelles de `tf_face_train` à ajouter (Q-324) | `cadr_lettre`, `IdFaceOTAffichage`, `agreement`, `commune`, `typr_code`, colonnes « Paris » |
| QC-B-06 | `IdGroupePreparation` des répartitions (déblocage) | NULL (déblocage limité) ou source Broadcast à obtenir |
| QC-B-07 | Colis : `Mailcolis_envoye` NULL et adresse figée | NULL → vrai pour les colis au statut 8 ; ajouter ou non l'adresse figée |
| QC-B-08 | `PrepaBroadcast` : identifiants absents | dérivation de `idSurface` et `idSiteCcf` par libellé ; `idFormat`, `IdTheme` : source à obtenir |
| QC-B-09 | Libération des semaines passées (Q-265) | dériver une libération par (atelier, semaine) ayant des UM, ou accepter le repère « à libérer » |
| QC-B-10 | `InstructionVisuel` : 279 statuts NULL ; atelier 0 / `ate_type` 0 | valeur par défaut ou exclusion ; troisième valeur de `TypeAtelier` ou atelier nullable |

## 10. Points bloquants

1. **Destinataires** : clé PEX et type divergents entre le réel et le code V2 (QC-B-01). Charger tel quel puis rejouer une intégration crée des doublons.
2. **Export des trains** : `iokMode` et statut de dossier sans source. Aucune instruction réelle n'est exportable (RG-COO-211) tant que QC-B-04 n'est pas tranchée.
3. **Horloge** : toutes les données sont passées (QC-B-02). Écrans à la semaine courante vides, règles temporelles faussées.
4. **Identifiants de référentiels** : ils doivent être conservés, y compris l'atelier 0, et `TypeAtelier` n'accepte pas `ate_type = 0` (dépendance avec le rapport des référentiels).
5. **Colonne `version` des faces** : à router vers `versionTrain`. Sinon le verrou optimiste est corrompu.
