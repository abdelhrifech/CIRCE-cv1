# A. Référentiels et Réception : base réelle CIRCE et modèle Prisma V2

Date : 2026-11-24. Périmètre : référentiels et Réception (tables listées en §3 à §5).
Ce document est une analyse en lecture seule. Aucun code, aucun schéma ni aucune donnée n'a été modifié.

## 0. Sources et limites

**Base réelle.** Export SQL Server de la base de qualification UAT, couvrant 3 mois (du 07/07 au 07/10/2026). Les secrets sont masqués. L'export ne contient ni historique ni tables utilisateurs. Il a été extrait dans le scratchpad de session, sous `mssql/` :
- `tables.txt` : volumes ;
- `colonnes.txt` : types, nullabilité, IDENTITY, PK ;
- `fk.txt` : 87 FK déclarées ;
- `controle.txt` : 108 contrôles de l'export ;
- `referentiels-complets.txt` : contenu intégral des tables de 100 lignes ou moins ;
- `profils/<table>.prof` : pour chaque colonne, nombre de NULL, nombre de valeurs distinctes, min et max, plus 5 lignes d'exemple.

**Modèle V2.** `apps/api/prisma/schema.prisma` et `apps/api/prisma/migrations/*/migration.sql`, en particulier `20261104160802_cree_modele_initial` et `20261105140000_ajoute_lignes_attendues_vie`.

**Documents.** `docs/ANALYSE_MODELE_DONNEES.md` (§3.3, §5), `docs/specifications/RECEPTION_REGLES_METIER.md`, `docs/QUESTIONS_OUVERTES.md` (Q-004, Q-300 à Q-349) et `docs/ECARTS_EXISTANT_VS_CIBLE.md`. Le code historique `circe-develop` a été lu pour établir le sens des colonnes ; les références sont données au format fichier:ligne.

**Données personnelles.** Ce rapport n'en contient aucune : pas de nom, d'adresse, de téléphone, de mail, de login Windows, d'annonceur ni de thème réel. Seuls figurent des volumes, des distributions et des codes de référentiels.

**Limite principale.** Aucune requête croisée n'a pu être exécutée : les profils sont mono-colonne. Les chiffres croisés présentés ici sont donc des estimations par différence de comptages, signalées « ≈ ». Les vérifications à lancer sont listées en §8.

## 1. Synthèse : verdict par table

Légende des verdicts :
- **DIRECT** : chargement colonne à colonne, à type compatible ;
- **TRANSF.** : transformation nécessaire ;
- **IMPOSSIBLE** : la cible ne peut pas recevoir la donnée ;
- **À DÉCIDER** : une question est nécessaire avant de charger.

| Table réelle | Lignes | Modèle Prisma (table SQLite) | Verdict |
|---|---|---|---|
| tr_plateforme | 4 | `Plateforme` (`tr_plateforme`) | TRANSF. (renommage des colonnes, id explicite, trim) |
| tr_atelier | 13 | `Atelier` (`tr_atelier`) | TRANSF. ; atelier 0 À DÉCIDER (`ate_type` = 0 hors enum) |
| tr_categorie_support | 24 | `CategorieSupport` | TRANSF. (id explicite, `est_deroulant` à dériver) |
| Surface | 7 | `Surface` (`surface`) | DIRECT (id explicite) |
| Transaco_Surface_Format | 28 | `CorrespondanceSupport` (`transaco_surface_format`) | TRANSF. (id technique ajouté ; `sup_id` = 0 signifie « inconnu ») |
| transcoCategSupport | 19 | AUCUN | À DÉCIDER (non repris, Q-309) |
| tr_type_preparation | 14 | `TypePreparation` (`type_preparation`) | **À DÉCIDER : conflit d'espace d'identifiants** (§3.6) |
| TypePreparation | 28 | `TypePreparation` (fusion Q-318) | **À DÉCIDER** (même conflit) |
| tr_atelier_support | 14 | AUCUN | Non repris (Q-309) ; aucun usage V2 constaté |
| tr_atelier_droit_prepa | **0** | `AtelierDroitPrepa` | DIRECT (rien à charger) |
| tr_instruction_plus | 5 | `InstructionPlus` | DIRECT (libellés à arbitrer) |
| tr_jour_depart | 7 | `JourDepart` | DIRECT |
| tr_parametre_alternance | 19 | `ParametreAlternance` | DIRECT |
| tr_imprimeur | 214 | `Imprimeur` | TRANSF. (projection id + libellé ; colonnes de contact abandonnées) |
| tr_transposteur_reception | 137 | `Livreur` | DIRECT |
| tr_activite | 8 | AUCUN | Non repris (FK de `tf_repart_calcul.act_id` absente de `Repartition`) |
| Activite | 7 582 | AUCUN (lien logique `mouvement.IdActivite`) | À DÉCIDER : type de mouvement « production » absent (Q-169) |
| Equipe | 6 | AUCUN | Non repris (Q-309) |
| Machine | 27 | AUCUN | Non repris (Q-309) |
| tr_type_entite | 4 | enum `TypeEntite` | DIRECT (correspondance de codes) |
| histo_action_applicative | 16 | enum `ActionAudit` | DIRECT (correspondance ; code 14 à confirmer) |
| tr_type_dossier | 11 | AUCUN | Hors Réception ; à traiter par l'analyse Coordination |
| tr_statut | 11 | enums `StatutProduction` / `StatutInstruction` | DIRECT (§3.13 ; tranche le contenu attendu par Q-004) |
| tr_statut_repart | 4 | AUCUN | Non repris (AMT, RG-COO-276) |
| tr_statut_colis | 16 | AUCUN | Hors périmètre (Q-310, étape 8) |
| tr_societe | 1 | AUCUN | Non repris (Q-309) |
| photo | 2 822 | `Photo` | TRANSF. ; **binaire absent sur 100 % des lignes** |
| livraison | 1 976 | `Livraison` + **`Reception` à créer** | TRANSF. + À DÉCIDER (statut et plateforme de la réception) |
| affiche | 9 953 | `Affiche` | TRANSF. (statut à calculer, `cont_num` texte, NULL → faux, `quantite` à recalculer) |
| asso_livraison_affiche | 9 939 | `LivraisonAffiche` | DIRECT |
| asso_livraison_photo | 2 822 | `LivraisonPhoto` | DIRECT |
| mouvement | 20 578 | `Mouvement` | TRANSF. + À DÉCIDER (type à inférer, date sentinelle 0001-01-01) |
| fusion_affiche | **0** | `FusionAffiche` | DIRECT (rien à charger) |
| tf_dossier_semaine_depart | 5 313 | `AfficheSemaineDepart` | DIRECT (contrôler l'unicité ; `Dossier` = 0) |
| tf_prepa_affiche | 35 810 | `ReceptionAttendue` + `AfficheAttendue` | **TRANSF. lourde + À DÉCIDER** (8 119 lignes sans plateforme, dédoublonnage, quantité des liens Q-213) |
| tf_prepa_Broadcast | 9 841 | `PrepaBroadcast` | TRANSF. (`IdSiteCCF` à dériver ; données personnelles) |
| histo_*, th_*, tt_log | 0 | `JournalAudit`, `StatutHistorique` (V2) | Rien à charger (§5) |

## 2. Constats transverses

### 2.1 Le nommage Prisma ne correspond pas toujours aux noms réels

Q-341 prévoit un `@@map`/`@map` vers les noms réels. Les migrations montrent pourtant des colonnes renommées, ce qui empêche une copie directe `INSERT … SELECT` par nom de colonne : il faut un script de correspondance explicite. Écarts constatés :
- **tr_plateforme** : `plt_id` devient `id`, `plt_nom` devient `nom`.
- **tr_atelier** : `ate_id` devient `id`.
- **tr_categorie_support** : `sup_id` devient `id`.
- **Surface** : `IdSurface` devient `id`.
- **Types de préparation** : la table s'appelle `type_preparation` au lieu de `tr_type_preparation` / `TypePreparation` ; `tpr_id` devient `id`, `tpr_lib` devient `libelle`.
- **tr_jour_depart** : `jour_depart_id` devient `id`.
- **tr_parametre_alternance** : `parametre_id` devient `id`.
- **tr_atelier_droit_prepa** : `adp_id` devient `id`, `IdSurface` devient `id_surface`, `adp_exclusion` devient `exclusion`.
- **photo** : `photo_id` devient `id`.
- **asso_livraison_photo** : `asso_livraison_photo_Id` devient `id`.
- **affiche** : `validationAdmin` devient `validation_admin`.
- **livraison** : les colonnes texte `Expediteur` / `Imprimeur` sont remplacées par les FK `livreur_id` / `imprimeur_id`.
- **Transaco_Surface_Format** : la PK composite réelle est remplacée par un `id` technique.

Les colonnes d'audit legacy (`*_user`, `*_dat_cre`, `*_dat_maj`, `Qui*`, `Date*`) deviennent `created_at` / `updated_at` / `created_by_id`.

Les noms de table SQLite ne sont pas sensibles à la casse : `Surface` et `surface` sont donc compatibles, mais pas `tr_type_preparation` et `type_preparation`.

### 2.2 Les identifiants legacy doivent être conservés

Les paramètres déjà seedés par la V2 contiennent des identifiants legacy (`apps/api/src/reference/seed-ref.ts:102-186`) :
- `coordination.supportsBandeau` = `5:100;26:100;…` ;
- `integration.routagePliage` = `39:2;40:3;43:9;44:10` ;
- `integration.atelierDeroulant` = `5:39:5;…;6:40:12` ;
- `integration.typesDeroulants` = `17;18;19;20;21;28`.

Ils ne correspondent au référentiel réel que si les tables de référence sont insérées **avec id explicite** : `tr_plateforme.plt_id`, `tr_atelier.ate_id`, `tr_categorie_support.sup_id`, `Surface.IdSurface`.

Points techniques :
- SQLite accepte l'id 0 en `INTEGER PRIMARY KEY` : `sup_id` 0, `ate_id` 0, `tpr_id` 0 et `act_id` 0 sont des lignes « inconnu ».
- Après un chargement à id explicite, la séquence `AUTOINCREMENT` (table `sqlite_sequence`) se positionne sur le max inséré.

Constat favorable : les ateliers 1 à 12, sites 39 et 40, et les supports 5 / 26 / 1026 / 19 / 27 / 29 / 100 / 102 / 105 / 107 cités par les paramètres existent bien dans le réel.

### 2.3 Types SQL Server → SQLite / Prisma

| Type réel | Prisma / SQLite | Compatibilité |
|---|---|---|
| tinyint, smallint, int | Int (INTEGER) | OK |
| numeric(9,0) (`tr_imprimeur.id`, `tr_transposteur_reception.id`, `tf_prepa_Broadcast.id`) | Int | OK : max observé 72 633 188, inférieur à 2^31 |
| bigint (`photo.size`) | Int | OK : max observé ≈ 13,7 Mo |
| numeric(7,2) (`sup_poids`) | Decimal (affinité NUMERIC en SQLite) | OK : 12 valeurs entre 0,01 et 1,50 ; risque d'arrondi flottant mineur |
| bit NULL | Boolean NOT NULL DEFAULT false | NULL → false (Q-313) : 159 à 775 NULL selon les colonnes de `affiche` |
| datetime, smalldatetime, date | DateTime | Conversion ISO-8601. **Le fuseau horaire n'est pas porté par SQL Server** (heure locale) : il faut fixer une convention (Europe/Paris → UTC) car elle conditionne les semaines et les délais (RG-REC-055) |
| `t_dat_sys` (type utilisateur : `tpr_dat_maj`, `act_dat_maj`) | DateTime | Valeur exportée au format « AAAA-MM-JJ hh:mm » |
| char(n) (`plt_tel` char(14), `*_user` char(8)) | String | **Trim obligatoire** : remplissage par des espaces, par exemple « 0466…    » |
| varchar(max) | String (TEXT) | OK |
| varbinary(max) (`photo.image_file`) | Bytes (BLOB) | Type compatible, mais la valeur est NULL sur 2 822 lignes sur 2 822 |
| timestamp / rowversion | — | Aucune colonne de ce type dans les tables du périmètre (seulement dans `tf_anomalies` et `tf_repart_calcul`) |

**Collation.** La collation de la base n'apparaît pas dans l'export. SQL Server est probablement insensible à la casse ; SQLite compare en BINARY par défaut, donc en respectant la casse. Les recherches et unicités suivantes changeront de comportement : thèmes, imprimeurs, transporteurs, `Reference` du BL, recherche à la frappe RG-REC-012. Le profil `tf_prepa_affiche.rpc_theme` montre un mélange de majuscules et minuscules. → Vérification n°11 en §8.

**Accents.** Les accents sont correctement restitués dans l'export (é, è, ô, ²). Un libellé de support contient un guillemet double : à échapper en CSV.

### 2.4 Pas d'utilisateurs, donc pas d'auteurs

Toutes les colonnes d'auteur réelles sont des logins Windows : `user_creation`, `user_maj`, `QuiCreation`, `Decharge_par`, `ate_user`, etc. La table `Utilisateur` V2 n'a aucune source dans l'export. Conséquences :
- `createdById`, `updatedById`, `validationAdminParId`, `controleurId`, `dechargeParId`, `creePar` et `retirePar` restent NULL sur toutes les données reprises ;
- la règle d'auteur tracé (RG-REC-004, RG-REC-006) n'est pas satisfaite pour l'historique.

### 2.5 Données personnelles présentes dans la source

Les colonnes suivantes contiennent des données personnelles :
- `tf_prepa_Broadcast.AssistantCommercial` / `AssistantLogistique` ;
- `livraison.Decharge_par` ;
- `tr_imprimeur` : contact, adresse, téléphone, fax, mail ;
- `tr_plateforme` : mail et téléphone ;
- toutes les colonnes de login.

Remplacer les données de dev par ces données ferait entrer des données réelles dans une base de développement. Or le skill `circe-jdd` impose « sans données personnelles réelles » et `ANALYSE_MODELE_DONNEES.md §5` point 9 renvoie à Q-321 (OUVERTE). **Point bloquant B1** (voir §7).

### 2.6 Champs V2 sans source réelle

Ces champs prendront leur valeur par défaut ou NULL, sauf décision contraire :
- **Communs** : `version` (défaut 1) ; `createdAt` / `updatedAt` quand la table réelle n'a pas de date (livraison, photo d'association).
- **Statuts persistés (Q-300)** : `Reception.statut`, `Affiche.statut`, `ReceptionAttendue.statut` / `etatLigne` / `source`. Ils sont tous à **calculer**, aucune colonne source n'existe.
- **Réception** : `Reception.*` en entier (table nouvelle, Q-307 b), `Mouvement.type` / `auto` / `motif` / `receptionId`.
- **Affiche** : `typeFeuille`, `feuilleARefaire`, `surplusEntretien`, `imprimeurId`, `validationAnnulee`, `themeModifie`, `etiquetteRackAImprimer`, `modeRattachement`, `receptionId`.
- **Ligne attendue** : `themeCle`, `idThemeBandeau`, `idTheme`, `qteBc`, `qtePrepa`, `dateVueBc`, `themeExclu`, `conserverAnnee`, `purgeeLe`, `provisoire`, `fermeeLe`, `nonVueLe`.
- **Copie Broadcast** : `IdSiteCCF`, `IdPreparationChapeau`, `IdSurface`, `IdFormat`, `IdTypePreparation`, `IdTheme`, `EstResteEnPlace`, `date_vue`.
- **Référentiels** : `CategorieSupport.estDeroulant`, `Imprimeur.actif` / `Livreur.actif`, `Destinataire.contactModifie`.

## 3. Référentiels : analyse par table

Pour chaque table : (1) sens métier · (2) modèle Prisma · (3) correspondance des colonnes · (4) qualité · (5) impact sur les RG · (6) verdict.

### 3.1 tr_plateforme (4 lignes)

1. **Sens.** Sites logistiques. `plt_id` 1 = Wissous, 2 = Nîmes, 3 = plateforme partenaire DBG, 4 = plateforme partenaire DBG Lyon (Q-335). Seuls les `plt_id` 1 et 2 apparaissent dans `affiche` et `tf_prepa_affiche`.
2. **Prisma.** `Plateforme`.
3. **Correspondance.**
   - `plt_id` tinyint → `id` (id explicite) ;
   - `plt_nom` → `nom` ;
   - `plt_adr_1/2` → `adresse1/2` ;
   - `plt_postal` char(5) → `codePostal` ;
   - `plt_localite` → `localite` ;
   - `plt_tel` char(14) → `telephone` (trim) ;
   - `plt_mail` varchar(500) → `mail` ;
   - `id_site_ccf` → `idSiteCcf` ;
   - `plt_user` char(8) : pas d'équivalent ;
   - `plt_dat_cre` / `plt_dat_maj` → `createdAt` / `updatedAt` (valeur à copier explicitement).
   - Champs V2 sans source : `version`. Les relations `mailsReception` / `imprimantes` (tables `tr_adresseMail_plateforme`, `tr_atelier_imprimante`) n'ont pas de source dans l'export.
4. **Qualité.** `id_site_ccf` vaut 39 / 40 / 43 / NULL pour la plateforme 4, alors que le paramètre V2 `integration.routagePliage` attend le site 44 pour l'atelier 10. Un téléphone est NULL. Un champ adresse contient un nom de contact (donnée personnelle).
5. **Impact.**
   - RG-REC-001 : le périmètre utilisateur exige un `UtilisateurPerimetre` sur les plateformes 1 et 2 ; l'export n'a pas d'utilisateurs, il faut recréer les utilisateurs de dev avec `pnpm dev:user … 1|2`.
   - RG-COO-081 / RG-REC-202 : l'alimentation par `idSiteCcf` ne trouvera pas le site 44.
   - RG-REC-024 / 025 : la deuxième plateforme est confirmée (deux sites actifs).
6. **Verdict.** TRANSF. (renommage, id explicite, trim). Le site 44 est à décider (Q-335 étendue, QA-13).

### 3.2 tr_atelier (13 lignes)

1. **Sens.** Ateliers de production d'une plateforme. `ate_type` vaut 0 (inconnu), 1 (fixe / pliage) ou 2 (déroulant). Les ateliers 9 et 10 sont rattachés aux plateformes partenaires ; les ateliers 11 et 12 « 4m2 déroulant » ont été créés en 2025.
2. **Prisma.** `Atelier`.
3. **Correspondance.**
   - `ate_id` → `id` ;
   - `plt_id` → `plateformeId` (FK présente dans le réel) ;
   - `ate_lib` → `libelle` ;
   - `ate_code_amt` tinyint (0 à 99) → `codeAmt` ;
   - `ate_type` tinyint → `type` (enum TEXT `FIXE` / `SCROLL`) ;
   - `ate_user`, `ate_dat_cre`, `ate_dat_maj` → audit.
4. **Qualité.** L'atelier 0 « Atelier inconnu » a `ate_type = 0`, valeur absente de l'enum `TypeAtelier` dont le champ est obligatoire. Un libellé contient un double espace.
5. **Impact.** Les paramètres `trains.ateliersExportPrepa` (5;6), `suivi8m2.ateliers`, `colis.ateliersMajoration` (vides) et `integration.*` deviennent cohérents avec le réel. L'atelier 0 ne peut pas être inséré.
6. **Verdict.** TRANSF. La correspondance 1 → FIXE, 2 → SCROLL est sourcée par le commentaire de `schema.prisma:109`. **L'atelier 0 est À DÉCIDER** (QA-8) : soit ne pas le charger, soit ajouter une valeur `INCONNU` à l'enum. Aucune ligne de `tf_prepa_affiche` ne référence `ate_id` 0 (min observé : 1).

### 3.3 tr_categorie_support (24 lignes)

1. **Sens.** Formats et supports d'affiche : 2m2, 4m2, 8m2, 12m2, bandeaux (`sup_bandeaux` = 1, ids 100 à 114), scrolling, venusial, MUI. `sup_id` 0 = « Support inconnu ». `reception` = 1 indique que le support est proposé à la réception. `sup_qte_UM` = quantité par UM ; `sup_poids` = poids unitaire.
2. **Prisma.** `CategorieSupport`.
3. **Correspondance.**
   - `sup_id` → `id` ;
   - `sup_nom` → `nom` ;
   - `sup_bandeaux` → `bandeaux` ;
   - `sup_poids` numeric(7,2) → `poids` Decimal ;
   - `sup_qte_UM` → `qteUm` ;
   - `reception` bit → `reception` (0 NULL).
   - Champ V2 sans source : `estDeroulant`. Il se dérive de la vue legacy `v_support_scrolling` = `sup_id IN (26, 1026, 1027)` (`circe-develop/BDD/DATABASE/DATABASE/dbo/Views/v_support_scrolling.sql:3-4`). La présence de cette vue dans la base réelle n'est pas vérifiable : l'export ne contient que des tables.
4. **Qualité.** 24 valeurs distinctes, aucun NULL. `sup_qte_UM` vaut 0 sur une partie des supports. Le poids de « 6m2 O'ne Collé » (0,10) paraît incohérent avec ses voisins (0,50 à 1,50) : signalé, à confirmer.
5. **Impact.** RG-REC-043 (`apps/api/src/modules/reception/formats.ts`) : les noms réels « 2m2 », « 2m2 Scrolling », « 2m2 Venusial » et « Scrolling MUI Paris » sont reconnus. En revanche « 2m2 Bdx » (bandeau) commence par « 2m2 » et sera proposé dans la recherche de rattachement de la famille 2 m² : à vérifier contre le legacy (`LivraisonAfficheService.cs:458-476`). RG-REC-039 : le support 0 existe, la FK `affiche.sup_id` → 0 est valide.
6. **Verdict.** TRANSF. (id explicite, plus `estDeroulant` dérivé de la vue).

### 3.4 Surface (7 lignes)

1. **Sens.** Surfaces Broadcast : 1 = Non-défini, 2 = 0 m², 3 = 1 m², 4 = 12 m², 5 = 2 m², 6 = 4 m², 7 = 8 m². `Valeur` est en m².
2. **Prisma.** `Surface` (`surface`).
3. **Correspondance.** `IdSurface` (PK non IDENTITY) → `id` ; `Libelle` → `libelle` ; `Valeur` → `valeur` ; `Qui*` / `Date*` → audit ; `ReferenceMigration` (toujours NULL) n'a pas d'équivalent.
4. **Qualité.** RAS.
5. **Impact.** Le paramètre `integration.atelierDeroulant` (surfaces 5, 6, 7) est cohérent.
6. **Verdict.** DIRECT.

### 3.5 Transaco_Surface_Format (28 lignes) et transcoCategSupport (19 lignes)

1. **Sens.**
   - `Transaco_Surface_Format` donne le support Circé (`sup_id`) pour chaque couple surface Broadcast × format Broadcast (`IdFormat` 1 à 4 ; d'après les données, 1 = fixe/collé et 2 = scrolling). Les 7 × 4 = 28 combinaisons sont présentes ; `sup_id = 0` (« inconnu ») sur 19 d'entre elles.
   - `transcoCategSupport` donne la surface et l'indicateur bandeau (`estBandeau`) pour chaque couple support × type de préparation.
2. **Prisma.** `CorrespondanceSupport` pour la première (RG-COO-081, Q-227) ; aucun modèle pour la seconde (ANALYSE §3.3 « Transaco* » non repris, mais la première a ensuite été ajoutée par la migration `20261105140000`).
3. **Correspondance.** `IdSurface` → `idSurface` ; `IdFormat` → `idFormat` (unique composite) ; `sup_id` int NULL → `supportId` Int NOT NULL (0 NULL observé). Le champ `id` technique, `version` et les dates sont propres à la V2.
4. **Qualité.** Les correspondances `sup_id = 0` pointent vers « Support inconnu ». Une ligne attendue alimentée par ces couples aurait un support inconnu.
5. **Impact.** RG-COO-081 : avec ces 28 lignes, l'alimentation V2 produira des lignes de support 0 au lieu de signaler une donnée de référence manquante. Il faut vérifier ce que fait `alimentation-lignes.ts:489` sur `supportId = 0`.
6. **Verdict.** `Transaco_Surface_Format` : TRANSF. (projection) ; décider si `sup_id = 0` signifie « pas de correspondance », c'est-à-dire ne pas charger la ligne. `transcoCategSupport` : À DÉCIDER, sans modèle ni usage V2 constaté.

### 3.6 tr_type_preparation (14 lignes) et TypePreparation (28 lignes) : conflit bloquant

1. **Sens.**
   - `tr_type_preparation` est le type de préparation Circé, `tpr_id` 0 à 13 (0 inconnu, 1 Pliage, 2 Bandeau, …, 10 Scro, 11 vénusial, 12 RX8, 13 Scrolling MUI Paris). C'est la cible des FK legacy `tf_repart_calcul.tpr_id`, `tf_UM.tpr_id`, `instruction_detail.tpr_id`, `instruction_visuels.tpr_id`, `tr_atelier_droit_prepa.tpr_id`, `tr_typ_aff_amt.tpr_id`.
   - `TypePreparation` est le type Broadcast (`IdTypePreparation` 1 à 28, `IdCategoriePreparation` = 1). Chaque ligne a un `tpr_id` de correspondance vers Circé. Par exemple, 23 « Tôle traditionnelle » correspond au `tpr_id` 1 (Pliage), et 17 à 21 ou 28 correspondent aux `tpr_id` 10 à 13. La correspondance va de N types Broadcast vers 1 type Circé : 16 lignes Broadcast ont `tpr_id` = 0.
2. **Prisma.** `TypePreparation` (`type_preparation`) : un seul `id`, plus `libelle` et `idCategoriePreparation` (fusion Q-318).
3. **Correspondance et conflit.** Le code V2 utilise l'**espace Broadcast** :
   - `integration-flux.ts:602-611` écrit `Repartition.typePreparationId = d.idTypePreparation` ;
   - les paramètres `integration.typePreparationPliage` = 23 et `integration.typesDeroulants` = 17;18;19;20;21;28 sont des identifiants Broadcast.

   Les FK legacy reposent au contraire sur l'**espace Circé** (0 à 13). En plus, `seed-ref.ts:28-34` crée 5 libellés applicatifs (2M2FIXE, PLIAGE, DEROULANT, AUTRES, BUS) avec des id auto-incrémentés 1 à 5, qui entrent en collision avec les deux espaces.

   La fusion Q-318 perd la correspondance N→1. Charger `type_preparation` avec les `tpr_id` donne un sens faux à la V2 : l'id 17 n'existe pas, l'id 1 vaut Pliage et non « A codifier ». Charger avec les `IdTypePreparation` rend fausses toutes les FK legacy reprises.
4. **Qualité.** 16 types Broadcast sur 28 sont rattachés à `tpr_id` 0 (« inconnu »).
5. **Impact.**
   - RG-COO-121 / 126 / 128 (routage pliage, fixe, déroulant) ;
   - RG-COO-247, 248, 305 (paramètres `unitaire.typesPliage` / `typesBus`) ;
   - FK de `InstructionDetail`, `InstructionVisuel`, `Repartition`, `UniteManutention`, `AtelierDroitPrepa`.

   Pour la Réception, l'impact est indirect : `Affiche` ne porte pas de type.
6. **Verdict.** **À DÉCIDER : point bloquant B2** (QA-2). Option possible : deux référentiels, ou une colonne de correspondance Broadcast → Circé. Q-318 est à rouvrir.

### 3.7 tr_atelier_support (14 lignes) et tr_atelier_droit_prepa (0 ligne)

1. **Sens.**
   - `tr_atelier_support` liste les supports gérés par un atelier, avec une période de validité. Les 14 lignes portent toutes sur l'atelier 2 (pliage, plateforme 1), toutes actives et sans date de fin.
   - `tr_atelier_droit_prepa` contient les droits ou exclusions de préparation par atelier × type × surface. Elle est **vide** dans le réel.
2. **Prisma.** Aucun modèle pour `tr_atelier_support` (Q-309) ; `AtelierDroitPrepa` pour `tr_atelier_droit_prepa`.
3. **Correspondance.** Pour `tr_atelier_droit_prepa` :
   - `adp_id` → `id` ;
   - `ate_id` → `atelierId` ;
   - `tpr_id` → `typePreparationId` (dépend du choix B2) ;
   - `IdSurface` → `surfaceId` ;
   - `adp_exclusion` → `exclusion` ;
   - `adp_user` / `adp_dat_*` → audit.
4. **Qualité.** Sans objet : table vide.
5. **Impact.** `deblocage.ts:490` lit `atelierDroitPrepa` : avec une table vide, le comportement est identique au legacy (aucune règle).
6. **Verdict.** `tr_atelier_droit_prepa` : DIRECT (rien à charger). `tr_atelier_support` : non repris ; à confirmer côté Coordination.

### 3.8 tr_instruction_plus (5 lignes), tr_jour_depart (7 lignes), tr_parametre_alternance (19 lignes)

**tr_instruction_plus**
- Codes 0 à 4 : Standard, début, fin, fin−1, milieu de train.
- Prisma `InstructionPlus` : `tip_ins_code` → `code`, `tip_ins_lib` → `libelle`. Correspondance DIRECTE.
- Les libellés réels diffèrent du seed sur la casse et la ponctuation (« debut de train », « FIN-1 de train ») : choisir la source à garder.
- Verdict : DIRECT.

**tr_jour_depart**
- Lundi à dimanche (`jour_depart_id` IDENTITY 1 à 7 ; samedi et dimanche ajoutés en 2025).
- Prisma `JourDepart` : `jour_depart_id` → `id`, `libelle`, `qui_*` / `date_*` → audit.
- Verdict : DIRECT.

**tr_parametre_alternance**
- Paramètres de l'alternance des trains : 1 `RefConvention`, 17 `Structures`, 1 `Produit` (`est_inclus` = 0).
- Prisma `ParametreAlternance` : `parametre_id` → `id`, puis `code`, `valeur`, `description` (toujours NULL), `est_inclus`, `est_actif`.
- Verdict : DIRECT.

### 3.9 tr_imprimeur (214 lignes) et tr_transposteur_reception (137 lignes)

1. **Sens.** Ce sont les listes fermées des imprimeurs et des transporteurs livreurs saisis sur le BL (RG-REC-035, RG-REC-179).
2. **Prisma.** `Imprimeur` (`tr_imprimeur`) et `Livreur` (`tr_transposteur_reception`).
3. **Correspondance.**
   - `id` numeric(9,0) IDENTITY → `id` ;
   - `libelle` varchar(150) NULL (0 NULL) → `libelle` NOT NULL ;
   - les 9 colonnes de contact de `tr_imprimeur` (contact, adresse 1 et 2, ville, CP, pays, téléphone, fax, messagerie) n'ont **pas d'équivalent** ; leur abandon supprime aussi des données personnelles ;
   - `actif` et `version` sont des champs V2 (défaut).
4. **Qualité.** Les deux listes ont le **même min (« 1 ») et le même max** de libellé : les listes contiennent probablement des entrées parasites ou partagées. `livraison.Imprimeur` compte 135 valeurs distinctes pour 214 imprimeurs ; `livraison.Expediteur` compte 135 valeurs distinctes pour 137 transporteurs, et les deux colonnes contiennent « ? ». Le taux de correspondance exacte est inconnu (vérification n°8).
5. **Impact.**
   - RG-REC-035 : les listes fermées seront polluées par « 1 ».
   - RG-REC-037 (5) : transporteur et imprimeur obligatoires, la liste doit être exploitable.
   - RG-REC-131 : imprimeur de la fiche affiche.
6. **Verdict.** TRANSF. (projection id + libellé) ; un nettoyage est à décider (QA-9).

### 3.10 tr_activite (8 lignes), Activite (7 582 lignes), Equipe (6 lignes), Machine (27 lignes)

1. **Sens.**
   - `tr_activite` est l'activité commerciale (0 inconnue, Grand format, Malls, Mobilier urbain, Parking, Gares, Bus, Métro). C'est la cible de la FK `tf_repart_calcul.act_id`, pas de la Réception.
   - `Activite` est la saisie de production (pliage / roulage) d'une affiche par équipe × machine, avec quantité et rebut. Chaque saisie crée un **mouvement négatif** de `-(Quantite + Rebus)` (`circe-develop/…/ClearChannel.CIRCE.BLL/ActiviteBll.cs:142-151`).
   - `Equipe` (AM / PM / Journée × plateformes 1 et 2) et `Machine` (16 sur la plateforme 1, 11 sur la plateforme 2) sont les ressources de production.
2. **Prisma.** Aucun modèle (Q-309). `Mouvement.activiteId` conserve un lien logique sans FK.
3. **Correspondance.** `Activite.IdActivite` → `mouvement.IdActivite` (7 582 mouvements, soit exactement le nombre de lignes de `Activite`). Les autres colonnes (équipe, machine, rebut, date de production) n'ont pas d'équivalent.
4. **Qualité.** Les profils indiquent `IdEquipe` dans {1, 2} et `IdMachine` dans 12 valeurs comprises entre 1 et 16 : seule la plateforme 1 a saisi de la production sur la période. `Quantite` va de 0 à 1 100 ; les saisies à 0 existent. `id_affiche_initial` est toujours NULL. Dates de production à partir du 28/02/2025.
5. **Impact.** RG-REC-151 : le type « production » est absent de l'enum `TypeMouvement`, de même que les champs équipe et machine (Q-169 OUVERTE). Sans ce type, 7 582 mouvements (37 % du total) sont inclassables. RG-REC-153 (stock = Σ mouvements) reste juste si ces mouvements sont repris, quel que soit leur type.
6. **Verdict.** `Activite`, `Equipe`, `Machine` et `tr_activite` : AUCUN modèle. **Le typage des mouvements de production est À DÉCIDER** (QA-4, Q-169).

### 3.11 tr_type_entite (4 lignes) et histo_action_applicative (16 lignes)

1. **Sens.** Ce sont les référentiels du journal legacy `histo_historique_entite`, vide dans l'export.
2. **Prisma.** Enums `TypeEntite` et `ActionAudit` (Q-308).
3. **Correspondance.**
   - Types d'entité : 1 Affiche → AFFICHE, 2 Instruction → INSTRUCTION, 3 Train → TRAIN, 4 « Id Dossier » → DOSSIER.
   - Actions : 1 → CREATION_AFFICHE, 2 → MODIFICATION_DOSSIER, 3 → MODIFICATION_SEMAINE, 4 → MODIFICATION_ANNONCEUR, 5 → MODIFICATION_THEME, 6 → MODIFICATION_FORMAT, 7 → MODIFICATION_VALIDATION_ADMIN, 8 → MODIFICATION_A_CONSERVER, 9 → AFFICHE_MISE_EN_REBUS, 10 → AFFICHE_ASSOCIER, 11 → AFFICHE_DISSOCIER, 12 → VIDER_REBUS, 13 → CHANGEMENT_STATUT_INSTRUCTION, 15 → EXPORTER_TRAINS, 16 → DEBLOQUER_PREPARATION.
   - Le code 14 « Changement statut instruction+ » correspond probablement à MODIFICATION_INSTRUCTION_PLUS : à confirmer.
4. **Qualité.** Libellés legacy avec fautes (« assosiée », « dissosiée ») : sans impact.
5. **Impact.** Aucun, faute d'historique à reprendre.
6. **Verdict.** DIRECT (table de correspondance documentaire, rien à insérer).

### 3.12 tr_type_dossier (11 lignes) et tr_societe (1 ligne)

**tr_type_dossier**
- Types de dossier : Temporaire, Communication permanente, Ville, Bailleur, Sous-location, Mur peint, Recouvrement, Digital, Opération spéciale, Service, Permanent. Les codes 9 et au-delà de 12 n'existent pas.
- Référencé par `tf_face_train.IdTypeDossier`.
- Aucun modèle Prisma : hors Réception, à traiter par l'analyse Coordination.

**tr_societe**
- Une seule ligne (raison sociale historique du groupe), FK de `tf_repart_calcul.soc_id`.
- Non reprise (Q-309).
- Verdict : AUCUN.

### 3.13 tr_statut (11 lignes), tr_statut_repart (4 lignes), tr_statut_colis (16 lignes)

**tr_statut**
- Valeurs `rpc_statut` : 0 A traiter, 1 En cours, 2 Instructions ok, 3 Erreur, 4 Annulé, 5 A imprimer, 6 Préparé, 7 A expédier, 8 Terminé, 9 Export prépa, 10 Au roulage.
- Elles correspondent **exactement, dans l'ordre**, à l'enum `StatutProduction` (`schema.prisma:95-107`).
- Pour `StatutInstruction` (0 à 5), le code 5 vaut « A imprimer » dans le réel contre `PRET_A_PRODUIRE` dans l'enum : renommage sémantique à confirmer.
- Ce contenu tranche la partie « contenu de `tr_statut` » de Q-004 et ECART-067 : à reporter par l'agent principal.
- Verdict : DIRECT (correspondance de codes).

**tr_statut_repart**
- Valeurs : 0 NA, 1 En cours, 2 Plateforme, 3 Commerce (statut AMT de `instruction_train.tsr_repart_code`).
- Non repris (RG-COO-276).

**tr_statut_colis**
- 16 états Geodis ordonnés (« * », En cours, Enlèvement…, Livrée, Retourné, Annulation confirmée).
- Aucun modèle : le colis V2 utilise `StatutProduction`. Hors périmètre (Q-310).

## 4. Réception : analyse par table

### 4.1 livraison (1 976 lignes) → `Livraison`, et `Reception` à créer

1. **Sens.** Un bon de livraison (BL) saisi à la réception : date, transporteur (`Expediteur`), imprimeur, n° de BL (`Reference`), nombre de colis, dossier et DA de référence, « déchargé par ». Il n'a ni plateforme, ni statut, ni auteur, ni date de création (Q-307).
2. **Prisma.** `Livraison` (le BL). Il n'existe pas de table réelle pour `Reception` (Q-307 b, palette en deux étapes).
3. **Correspondance.**

| Colonne réelle | Champ Prisma | Note |
|---|---|---|
| `Id` int IDENTITY | `id` | id explicite (332 à 54 092) |
| `DateLivraison` datetime | `dateLivraison` | Toujours à 00:00 ; de 2018-02-15 à 2026-10-07 |
| `Expediteur` varchar(50) | `livreurId` FK | **TRANSF.** : recherche du libellé dans `tr_transposteur_reception` ; texte perdu si absent (pas de colonne texte) |
| `Imprimeur` varchar(50) | `imprimeurId` FK | Même traitement avec `tr_imprimeur` |
| `Commentaire` | `commentaire` | 1 820 NULL |
| `Reference` | `reference` | 1 614 valeurs distinctes pour 1 976 lignes |
| `Nbre_colis` | `nbreColis` | 6 NULL |
| `Ref_dossier` varchar(20) | `refDossier` | 1 654 NULL ; contient des valeurs non numériques (« MULTI », « multi ») |
| `Ref_DA` varchar(20) | `refDa` | 1 968 NULL ; contient des valeurs non numériques |
| `Decharge_par` varchar(50) | `dechargePar` (texte conservé) | `dechargeParId` reste NULL (pas d'utilisateurs) ; donnée personnelle |
| — | `version`, `createdAt`, `updatedAt`, `createdById`, `updatedById` | Sans source ; `createdAt` = `DateLivraison` (HYPOTHÈSE à valider) |

4. **Qualité.**
   - `Reference` en doublon pour ≈ 362 lignes, y compris la valeur « ? ».
   - `Nbre_colis` atteint 5 150 : valeur aberrante, sans doute une quantité saisie à la place du nombre de colis.
   - « ? » apparaît comme transporteur et comme imprimeur.
   - Le « déchargé par » contient « 1 » et des prénoms.
   - 3 livraisons n'ont aucune affiche (1 976 − 1 973 valeurs distinctes de `Id_livraison` dans `asso_livraison_affiche`).
   - 949 livraisons ont des pièces jointes, toutes depuis le 28/02/2025.
5. **Impact.**
   - RG-REC-022 / Q-102 : un BL = une réception, d'où 1 976 `Reception` à créer.
   - RG-REC-024 : un BL ne livre qu'une plateforme ; la plateforme se déduit des `affiche.plt_id` liées (vérification n°4 pour les BL multi-plateformes ; 3 BL sans affiche ont une plateforme indéterminable).
   - RG-REC-036 : les doublons de BL déclencheront l'avertissement `REC_BL_DOUBLON` sur des n° comme « ? ».
   - RG-REC-035 / 037 : imprimeur ou transporteur NULL quand le texte est introuvable. Une réception historique n'est pas re-validée, mais une modification de BL (RG-REC-073) sera refusée tant que les champs obligatoires sont vides.
   - RG-REC-038 / 053 / 055 / 189 : selon le statut choisi pour `Reception` (A_CONTROLER, CONTROLEE ou autre), le sas affichera ou non 1 976 palettes en retard. Il n'existe pas d'étape de contrôle dans le legacy (`ECART` existant, Q-307).
6. **Verdict.** `Livraison` : TRANSF. `Reception` : **À DÉCIDER** (QA-3 : statut des réceptions reprises, plateforme des BL sans affiche, `dateArrivee` = `DateLivraison`, `photoBlId` à choisir parmi environ 3 pièces jointes par BL).

### 4.2 photo (2 822 lignes) et asso_livraison_photo (2 822 lignes)

1. **Sens.** Pièces jointes du BL : 100 % en `application/pdf` / `.pdf`, créées par un seul compte de réception, du 28/02/2025 au 07/10/2026. Les intitulés sont numériques, probablement des n° d'affiche ou de BL (à vérifier). Une photo appartient à exactement une livraison (2 822 = 2 822). `affiche.photo_id` est toujours NULL : aucune photo d'affiche.
2. **Prisma.** `Photo` et `LivraisonPhoto`.
3. **Correspondance.**
   - Pour `photo` :
     - `photo_id` → `id` ;
     - `image_mime_type` → `mimeType` ;
     - `image_file` varbinary(max) → `fichier` Bytes ;
     - `intitule` → `intitule` ;
     - `size` bigint → `taille` Int ;
     - `extension` → `extension` ;
     - `date_creation` → `createdAt` ;
     - `user_creation` → `createdById` impossible ;
     - `user_maj` et `date_maj` (toujours NULL) n'ont pas d'équivalent.
   - Pour `asso_livraison_photo` : `asso_livraison_photo_Id` → `id`, puis `photo_id`, `livraison_Id`, `intitule` (les FK NULL de la source n'ont aucun NULL observé). Unicité (livraison, photo) respectée.
4. **Qualité.** **`image_file` est NULL sur 2 822 lignes sur 2 822**, alors que `size` vaut entre 156 ko et 13,7 Mo. Deux explications : soit l'export a exclu les binaires, soit le legacy stocke les fichiers sur un partage disque (Q-332, `DirectoryFilePieceJointeReception`). À confirmer.
5. **Impact.** RG-REC-026 / 027 : la consultation de la photo du BL sera impossible pour toutes les réceptions reprises (métadonnées seules). RG-REC-030 : la lecture du BL n'aura pas de source.
6. **Verdict.** `asso_livraison_photo` : DIRECT. `photo` : TRANSF., avec un binaire IMPOSSIBLE à reprendre depuis cet export (QA-12, Q-311 / Q-332).

### 4.3 affiche (9 953 lignes) → `Affiche`

1. **Sens.** Le lot d'affiches reçu, stocké en allée / rayon, rattaché à un dossier (`cont_num`) et à un thème.
   - 3 396 affiches sont antérieures à la période (contrôle n°103). Elles ont été exportées parce qu'elles sont référencées ; `date_entree` remonte jusqu'à 2018.
   - Plateformes : 1 et 2 uniquement ; 15 supports utilisés.
2. **Prisma.** `Affiche`.
3. **Correspondance.**

| Colonne réelle | Champ Prisma | Note |
|---|---|---|
| `affiche_id` int IDENTITY | `id` | Id explicite (693 à 205 815) |
| `plt_id` tinyint | `plateformeId` | Valeurs 1 et 2 |
| `sup_id` smallint | `supportId` | 15 valeurs, dont 0 (inconnu) |
| `photo_id` | `photoId` | Toujours NULL |
| `date_entree` date | `dateEntree` | Conversion date → DateTime |
| `commentaire` | `commentaire` | 9 313 NULL |
| `cont_num` **varchar(50)** | `contNum` **Int?** | **TRANSF.** : 345 NULL ; valeurs avec espace en tête et **concaténations « n°+n° »** (plusieurs dossiers). Conversion numérique impossible telle quelle |
| `cont_annonc` | `contAnnonc` | 82 NULL |
| `theme` | `theme` | 221 NULL ; une valeur composée d'un seul espace |
| `repiquage` | `repiquage` | 5 851 NULL ; une chaîne vide |
| `conservation` int | `conservation` | 3 valeurs (de 0 à 365) ; 0 s'affiche 20 (RG-REC-144) |
| `quantite` int | `quantite` (cache) | **À RECALCULER** = Σ mouvements (Q-322) ; min **−10 881**, max 6 042 |
| `date_dernier_depart` date | `dateDernierDepart` | 4 055 NULL ; max 2026-11-27 |
| `allee`, `rayon` | `allee`, `rayon` | 361 et 365 NULL |
| `date_derniere_sortie` | `dateDerniereSortie` | 9 100 NULL |
| `rebus` bit | `rebus` | NULL → false ; **318 à 1** |
| `user_creation`, `user_maj` | `createdById`, `updatedById` | IMPOSSIBLE (logins) → NULL |
| `date_creation`, `date_maj` | `createdAt`, `updatedAt` | DIRECT |
| `validationAdmin` bit | `validationAdmin` (colonne `validation_admin`) | NULL (159) → false ; répartition 0/1 inconnue (vérification n°12) |
| `envoye` bit | `envoye` | 1 ou NULL (775) |
| `zone_Picking` bit | `zonePicking` | 0, 1 ou NULL (182) |
| `a_conserver` bit | `aConserver` | 0, 1 ou NULL (186) |
| `date_rebus` | `dateRebus` | 314 renseignées |
| `semaines` varchar(200) | — | Absente (Q-150) : 9 574 valeurs, de la forme « S25+S52+… » |
| `nombre_semaine` int | — | Absente (calculée) |
| `est_fusionne` bit | `estFusionne` | Toujours NULL → false |
| — | `statut`, `receptionId`, `typeFeuille`, `feuilleARefaire`, `surplusEntretien`, `imprimeurId`, `validationAdminParId/Le`, `validationAnnulee`, `themeModifie`, `etiquetteRackAImprimer`, `modeRattachement`, `version` | Champs V2 (§2.6) |

4. **Qualité.**
   - Quantités négatives : le legacy écrase ou décrémente `quantite` sans contrôle (RG-REC-154, 155).
   - `affiche.quantite` ne peut pas être égale à Σ mouvements pour les affiches ayant une production : `ActiviteBll.cs:142-152` crée le mouvement négatif via `UpdateStock` sans toucher `affiche.quantite`.
   - Le contrôle n°98 garantit que **tous** les mouvements des affiches exportées sont présents : le recalcul Σ mouvements est donc fiable.
   - 14 affiches n'ont pas de livraison (9 953 − 9 939) ; 2 affiches n'ont aucun mouvement (9 953 − 9 951).
   - **≈ 831 affiches n'ont aucune ligne attendue liée** (9 953 − 9 122 valeurs distinctes de `tf_prepa_affiche.affiche_livraison_Id`).
5. **Impact.**
   - RG-REC-115 / X-005 : `statut` = IDENTIFIEE si au moins un lien actif, sinon ORPHELINE. À calculer après la création des liens (§4.7), soit ≈ 831 orphelines.
   - RG-REC-153 / 154 / 080 / 126 : la colonne « En stock » et la feuille de stock reposent sur Σ mouvements ; `quantite` doit être réécrite par la même valeur.
   - RG-REC-155 / 156 / 064 : sur les affiches à stock négatif ou nul, toute sortie ou mise au rebut sera refusée (422 `REC_REBUT_SUPERIEUR_STOCK`).
   - RG-REC-157 / 158 / 159 / Q-118 : 318 affiches portent le drapeau `rebus` legacy sans mouvement négatif correspondant (le legacy ne change pas la quantité). Les convertir en mouvement de rebut relève de Q-155 (OUVERTE).
   - RG-REC-169 : aucune fusion héritée, aucun effet.
   - RG-REC-143 / 081 / 082 (premier départ, dossiers multi-semaines) : les départs ne viennent plus de `semaines` mais de `tf_dossier_semaine_depart` (3 436 affiches couvertes sur 9 953) ou des lignes liées.
   - RG-REC-049 : les dossiers multiples « a+b » ne peuvent pas aller dans `contNum` et doivent devenir des rattachements.
   - RG-X-022 / RG-REC-199 / 200 : `envoye` est conservé.
6. **Verdict.** TRANSF. ; `cont_num` multi-dossiers À DÉCIDER (QA-7) ; drapeau `rebus` À DÉCIDER (QA-11 = Q-155).

### 4.4 asso_livraison_affiche (9 939 lignes) → `LivraisonAffiche`

1. **Sens.** Lien BL ↔ affiche. Chaque affiche apparaît dans au plus une livraison (9 939 valeurs distinctes d'affiche pour 9 939 lignes). `NumeroLivraison` vaut 1 partout : aucun complément n'a été tracé par cette table.
2. **Prisma.** `LivraisonAffiche`.
3. **Correspondance.** `Id` → `id` ; `Id_affiche_livraison` → `afficheId` ; `Id_livraison` → `livraisonId` ; `NumeroLivraison` → `numeroLivraison` ; `id_affiche_initial_livraison` (toujours NULL) → `afficheInitialeId`. Les FK sources sont nullables mais sans aucun NULL. L'unicité (livraison, affiche) est respectée.
4. **Qualité.** RAS (FK vérifiées par l'export, contrôles n°73 à 75).
5. **Impact.** Elle sert à dériver `Affiche.receptionId` et `Mouvement.receptionId` via la réception créée par BL. RG-REC-040 / 128 (tag « Complément ») : aucun complément identifiable par cette table, voir les mouvements en §4.5.
6. **Verdict.** DIRECT.

### 4.5 mouvement (20 578 lignes) → `Mouvement`

1. **Sens.** Le journal des quantités d'une affiche. Sa source se déduit des colonnes :
   - **≈ 9 950 mouvements de réception** (`livraison_id` non NULL). Récépissé = imprimeur, expéditeur = transporteur (`LivraisonAfficheService.cs:833-840`).
   - **7 582 mouvements de production** (`IdActivite` non NULL, négatifs, `ActiviteBll.cs:142-151`).
   - **≈ 3 046 autres mouvements** :
     - ajout manuel, positif, avec récépissé et expéditeur saisis (`ReceptionListeAfficheBll.cs:812-818`) ;
     - sortie manuelle, négative, récépissé « Sortie » (`ReceptionListeAfficheBll.cs:22, 819-826`) ;
     - vidage du rebus, égal à −Σ, récépissé « Vidage du rebus » (`ReceptionListeAfficheBll.cs:23, 315-318`) ;
     - mouvements de zone picking (`ZonePickingBLL.cs:333, 380`).
   - Ces estimations supposent que `livraison_id` et `IdActivite` ne sont jamais renseignés ensemble (vérification n°2).
2. **Prisma.** `Mouvement` (append-only, quantité signée, `type` enum obligatoire).
3. **Correspondance.**
   - `mouvement_id` → `id` ;
   - `affiche_id` → `afficheId` ;
   - `date` date → `date` ;
   - `quantite` → `quantite` ;
   - `recepisse` → `recepisse` ;
   - `expediteur` → `expediteur` ;
   - `comptee` bit (10 629 NULL) → `comptee` (NULL → false) ;
   - `livraison_id` → `livraisonId` ;
   - `IdActivite` → `activiteId` ;
   - `id_affiche_initial` (toujours NULL) → `afficheInitialeId` ;
   - `date_creation` → `createdAt` ;
   - `user_creation` → `createdById` impossible.
   - Champs V2 : `type` (à **inférer**), `auto`, `motif`, `receptionId` (via la livraison).
4. **Qualité.**
   - **Date sentinelle `0001-01-01`** (min observé). Le service de réception legacy ne renseigne jamais `mvt.date` (`LivraisonAfficheService.cs:833-840` ; `LivraisonAfficheRepository.cs:243-261` ne pose que `date_creation`) ; le vidage du rebus non plus (`ReceptionListeAfficheBll.cs:315-320`). DateTime.MinValue est donc probablement présent sur tous les mouvements de réception et de vidage. Cela explique en partie les 13 718 mouvements « hors période » du contrôle n°104.
   - `quantite` va de −3 076 à 12 600.
   - Valeurs « ? » en récépissé et en expéditeur.
5. **Impact.**
   - RG-REC-151 : type obligatoire. Inférence proposée, sourcée par le code legacy :
     - `livraison_id` renseigné → RECEPTION ;
     - `IdActivite` renseigné → **aucune valeur d'enum** (Q-169) ;
     - récépissé « Sortie » → SORTIE_MANUELLE ;
     - « Vidage du rebus » → MISE_AU_REBUT ou DESTRUCTION (à décider, Q-118) ;
     - autres mouvements positifs → AJOUT_MANUEL ;
     - autres mouvements négatifs → à décider.
   - RG-REC-132 (onglet Mouvements) et RG-REC-153 : la date affichée serait 0001-01-01 si elle n'est pas corrigée. Correction proposée : `date := date_creation` (HYPOTHÈSE).
   - RG-REC-041 : le récépissé contient bien l'imprimeur et l'expéditeur le transporteur, ce qui est cohérent avec la V2.
   - RG-REC-040 (complément) : ≈ 11 affiches ont plus d'un mouvement de réception (9 950 − 9 939), probablement des compléments. COMPLEMENT n'est pas inférable sans règle.
6. **Verdict.** TRANSF. ; le **typage et la date sont À DÉCIDER** (QA-4) : point bloquant B3 pour l'invariant « stock = Σ mouvements typés ».

### 4.6 fusion_affiche (0 ligne) → `FusionAffiche`

La table est vide et `affiche.est_fusionne` est toujours NULL. Aucune fusion héritée n'existe sur le périmètre exporté. RG-REC-163 / 165 / 166 / 167 sont sans données et RG-REC-169 est sans effet. Correspondance de colonnes identique (`id_fusion_affiche`, `id_affiche_chapeau`, `id_affiche`, `qui_creation`, `date_creation`). **Verdict : DIRECT (rien à charger).**

### 4.7 tf_prepa_affiche (35 810 lignes) → `ReceptionAttendue` et `AfficheAttendue`

1. **Sens.** Les réceptions attendues, avec une ligne par plateforme × dossier × support × thème × semaine.
   - `FromBroadcast` vaut 1 sur ≈ 12 643 lignes, venues de la copie Broadcast ; les autres viennent de la préparation (`p_Alimentation_tf_prepa_affiche`, RG-REC-202).
   - `affiche_livraison_Id` est le lien legacy 1–1 vers l'affiche, renseigné sur ≈ 22 921 lignes qui pointent vers 9 122 affiches. Une affiche porte donc en moyenne 2,5 lignes : lignes jumelles et multi-semaines (RG-REC-042 legacy).
   - `ARecevoir` = 1 signifie « reçue » (filtre de `Fn_GetPrepaAffiche.sql:101` combiné aux livraisons) ; NULL ou 0 signifie « attendue » (`:159`). Il vaut 1 sur ≈ 25 103 lignes.
   - Semaines de 2018 à 2026 : le legacy ne purge jamais les lignes Broadcast (RG-REC-180).
2. **Prisma.** `ReceptionAttendue` (`tf_prepa_affiche`) et `AfficheAttendue` (`asso_affiche_visuel`, Q-306 a), sans table réelle pour le second.
3. **Correspondance.**

| Colonne réelle | Champ Prisma | Note |
|---|---|---|
| `Id` int IDENTITY | `id` | Jusqu'à 4 971 091 |
| `plt_id` **int NULL** | `plateformeId` **NOT NULL** | **8 119 NULL** : non chargeables tels quels. Dérivation possible par `ate_id` → `tr_atelier.plt_id`, mais `ate_id` est NULL sur 18 305 lignes (vérification n°6) |
| `sup_id` | `supportId` | 15 valeurs |
| `cont_num` int | `contNum` | 5 930 dossiers |
| `Format` | `format` | Texte redondant avec `sup_id` |
| `Description` | `description` | Toujours NULL |
| `rpc_annonceur` | `annonceur` | — |
| `rpc_num_aff_amt` | `numAfficheAmt` | 18 617 NULL |
| `rpc_theme` | `theme` + `themeCle` | 8 080 NULL ; `themeCle` = normalisation V2 (Q-208) à calculer |
| `Statut` varchar(50) | — | Toujours NULL : abandon sans perte |
| `Qte_Theorique` | `qteBc` ou `qtePrepa` | **HYPOTHÈSE** : `FromBroadcast` = 1 → `source` BC et `qteBc`, sinon PREPA et `qtePrepa` (RG-REC-017 : l'attendu vient de BC ou de PREPA) |
| `sem_num`, `sem_annee` | `semNum`, `semAnnee` | 1 à 52 (jamais 53 : Q-314) |
| `affiche_livraison_Id` | → `AfficheAttendue` | **TRANSF.** : un lien par ligne liée ; `quantite` inconnue (Q-213) ; `mode` inconnu (BL ?) |
| `FromBroadcast` bit | `source` | 1 ou NULL |
| `ARecevoir` bit | — | Absente : l'état se recalcule (RG-REC-018) |
| `dateCreated` | `createdAt` | — |
| `dateModified` (10 659 NULL) | `updatedAt` NOT NULL | Repli sur `dateCreated` |
| `repiquage` | `repiquage` | 193 valeurs |
| `IdDAChapeau` | `idDaChapeau` | 95 NULL |
| `ate_id` smallint | `atelierId` | 18 305 NULL ; valeurs de 1 à 12 |
| `affiche_livraison_initial_Id` | — | Toujours NULL |
| — | `idThemeBandeau` | **Absente de la table réelle** → NULL |
| — | `etatLigne`, `statut`, `dateVueBc`, `themeExclu`, `conserverAnnee`, `purgeeLe`, `idTheme`, `provisoire`, `fermeeLe`, `nonVueLe`, `version`, auteurs | Champs V2 |

4. **Qualité.**
   - **Doublons exacts de clé** : l'échantillon montre deux lignes identiques. L'index unique partiel `tf_prepa_affiche_ligne_active_cle_key` (plt, `COALESCE(cont_num,0)`, sup, `COALESCE(theme_cle,'')`, `COALESCE(IdThemeBandeau,0)`, année, semaine) WHERE ACTIVE fera **échouer l'insertion** sans dédoublonnage préalable. `idThemeBandeau` étant toujours NULL et les 8 080 thèmes NULL donnant une clé vide, les collisions seront nombreuses (vérification n°5).
   - **`ARecevoir` incohérent** : au moins ≈ 2 182 lignes ont `ARecevoir` = 1 sans affiche liée (25 103 − 22 921). Le drapeau n'est jamais remis à zéro (Q-213).
   - 8 119 lignes n'ont pas de plateforme. Le legacy filtre sur `plt_id` (`Fn_GetPrepaAffiche.sql:101, 159`) : ces lignes sont invisibles dans l'écran legacy.
5. **Impact.**
   - RG-REC-017 / 018 / X-004 / X-016 : reçu = Σ des quantités de liens actifs. Sans quantité de lien (Q-213), tous les statuts (Attendue, Partielle, Complète, Surplus) sont faux. Avec la quantité de l'affiche copiée sur ses ≈ 2,5 lignes, le reçu est surévalué (Surplus artificiel).
   - RG-REC-019 (colonne Contrôle) : elle dépend du statut des réceptions (QA-3).
   - RG-REC-014 / Q-305 : une seule ligne active par clé, d'où le dédoublonnage obligatoire : garder la ligne qui porte une affiche, reporter les liens, passer les autres en ANNULEE avec `fermeeLe` (ANALYSE §5 point 1).
   - RG-REC-180 / 181 : 2018 à 2026, purge massive au premier passage si `taches.purgeAttendues` est renseigné (aujourd'hui vide, donc désactivée).
   - RG-REC-020 / 015 (période et départ par défaut) : volume important d'anciennes lignes Attendue.
6. **Verdict.** **TRANSF. lourde + À DÉCIDER** : QA-5 (= Q-213 : quantité des liens, dédoublonnage, `ARecevoir`) et QA-6 (lignes sans plateforme). **Points bloquants B4 et B5.**

### 4.8 tf_dossier_semaine_depart (5 313 lignes) → `AfficheSemaineDepart`

1. **Sens.** Les semaines de départ par affiche et dossier. Le legacy les régénère depuis `affiche.cont_num` et `affiche.semaines` (RG-REC-148 legacy, non reprise). Les lignes couvrent 3 436 affiches.
2. **Prisma.** `AfficheSemaineDepart`, unique sur (affiche, dossier, année, semaine).
3. **Correspondance.** `Id` → `id` ; `IdAffiche` → `afficheId` ; `Dossier` int → `dossier` Int? ; `Semaine` → `semaine` NOT NULL ; `Annee` → `annee` NOT NULL (0 NULL dans la source).
4. **Qualité.** `Dossier` min = **0** (dossier inconnu ou sentinelle). Années de 2022 à 2027 ; semaine maximale 52 (calcul non ISO, Q-314). Doublons possibles sur la clé unique Prisma (vérification n°9).
5. **Impact.** RG-REC-081 / 082 (premier départ en gros, fond jaune multi-semaines) et RG-REC-199 (export PEX legacy). Les 6 517 affiches sans ligne dans cette table n'ont de départ que par le texte `semaines` (QA-10).
6. **Verdict.** DIRECT, sous réserve de l'unicité. `Dossier` = 0 → NULL est À DÉCIDER (QA-10).

### 4.9 tf_prepa_Broadcast (9 841 lignes) → `PrepaBroadcast`

1. **Sens.** La copie des réservations Broadcast, côté réceptions attendues (RG-REC-201, RG-COO-081). Elle couvre les semaines 28 à 41 de 2026, 3 884 dossiers de vente et 3 822 DA. `DestinataireEffectif` prend 3 valeurs : « Plateforme Wissous », « Plateforme Nîmes » et « Plateforme Nanterre ».
2. **Prisma.** `PrepaBroadcast` (Q-325).
3. **Correspondance.**
   - Colonnes réelles reprises une à une :
     - `id` numeric(9,0) IDENTITY → `id` ;
     - `DestinataireEffectif` → `destinataireEffectif` ;
     - `IdDossierDeVenteChapeau` et `IdDAChapeau` ;
     - `Annonceur` ;
     - `Surface` (texte, 6 valeurs) et `Format` (texte : Fixe / Scrolling) ;
     - `AssistantCommercial` et `AssistantLogistique` (**données personnelles**) ;
     - `Theme` (615 NULL) ;
     - `Bandeau` et `repiquage` (9 715 NULL ; même contenu, le legacy fait `repiquage = Bandeau`, RG-REC-201) ;
     - `quantite` ;
     - `StatutPreparation` (« Calculé » / « Envoyé » / NULL 670 ; compatible avec `alimentation-lignes.ts:130`) ;
     - `dateCreated` et `dateModified` ;
     - `sem_num` et `sem_annee` ;
     - `sup_id` (7 valeurs, de 0 à 29) ;
     - `IdThemeBandeau`.
   - **Absents du réel** : `IdSiteCCF`, `IdPreparationChapeau`, `IdSurface`, `IdFormat`, `IdTypePreparation`, `IdTheme`, `EstResteEnPlace`, `date_vue`.
4. **Qualité.** « Plateforme Nanterre » n'a pas de `tr_plateforme` (Q-335 : hors périmètre). `sup_id` = 0 est présent.
5. **Impact.** RG-COO-081 / RG-REC-202 : la V2 retrouve la plateforme par `idSiteCcf` (`alimentation-lignes.ts:486-514`). Sans `IdSiteCCF`, il faut le dériver de `DestinataireEffectif` (Wissous → 39, Nîmes → 40, Nanterre → aucun) ; c'est une HYPOTHÈSE, la correspondance n'étant pas sourcée. Sans `IdSurface` / `IdFormat`, `CorrespondanceSupport` n'est pas rejouable, mais `sup_id` est déjà fourni. RG-REC-014 / Q-135 (`EstResteEnPlace`) : la valeur sera fausse partout par défaut.
6. **Verdict.** TRANSF. : `IdSiteCCF` dérivé (QA-13) ; les données personnelles relèvent de B1.

## 5. Tables d'historique vides

Ces tables ont toutes **0 ligne** dans l'export (« sans historique ») :
- `histo_historique_entite` ;
- `histo_preparation` ;
- `th_amt_log_destination`, `th_amt_log_instruction`, `th_amt_log_instruc_det`, `th_amt_log_repart`, `th_amt_log_statut_repart`, `th_amt_log_train` ;
- `th_repart_annule` ;
- `tt_log`.

Les correspondances prévues sont les suivantes :
- `histo_historique_entite` → `JournalAudit` (Q-308) ;
- `th_repart_annule` → `DeblocagePreparation` (ANALYSE §4, migration `20261105200000`) ;
- `th_amt_log_*` : non repris (AMT, Q-329) ;
- `tt_log` : non repris (Q-309 / Q-323).

**Impact.**
- RG-REC-005 / 006 / 007 : l'onglet Historique sera vide pour toutes les affiches reprises.
- CLAUDE.md §6 (« chaque changement de statut écrit un historique ») : les statuts calculés à la reprise (affiche, ligne, réception) n'auront pas d'entrée `StatutHistorique` initiale, et `ActionAudit` n'a pas de valeur « REPRISE » (QA-14).

**Verdict.** Rien à charger.

## 6. Impact sur les RG (récapitulatif)

| RG | Effet d'un remplacement des données de dev par la base réelle | Lien |
|---|---|---|
| RG-REC-001 | Aucun utilisateur ni périmètre dans l'export : recréer les utilisateurs de dev sur les plateformes 1 et 2 | QA-15 |
| RG-REC-004, 006, 007 | Auteurs NULL, historique vide | §2.4, §5 |
| RG-REC-014, Q-305 | Index unique partiel violé par les doublons d'attendues | B4 |
| RG-REC-017, 018, 019, X-004, X-016 | Reçu, statut et contrôle des lignes faux sans quantité de lien ni statut de réception | B3, B4, QA-3 |
| RG-REC-022, 024, 038 | Une `Reception` par BL à créer ; plateforme déduite ; 3 BL sans affiche | QA-3 |
| RG-REC-026, 027, 030 | Photos de BL sans binaire | QA-12 |
| RG-REC-035, 037, 073, 131, 179 | Imprimeur et transporteur texte non retrouvés → NULL ; listes polluées | QA-9 |
| RG-REC-036 | ≈ 362 doublons de n° de BL (dont « ? ») → avertissements | — |
| RG-REC-040, 128 | Compléments non identifiables (≈ 11 cas) | QA-4 |
| RG-REC-041, 151, 153, 154, 080, 126, 132 | Type de mouvement à inférer ; production sans type ; date 0001-01-01 ; `quantite` à recalculer | B3 |
| RG-REC-049 | `cont_num` « a+b » non convertible en entier | QA-7 |
| RG-REC-053, 055, 189 | Si les réceptions reprises sont A_CONTROLER : 1 976 palettes en retard dans le sas | QA-3 |
| RG-REC-064, 155, 156 | Stock négatif → refus 422 systématique sur les affiches concernées | QA-11 |
| RG-REC-081, 082, 143 | Départs partiels (3 436 affiches sur 9 953 dans `tf_dossier_semaine_depart`) | QA-10 |
| RG-REC-115, X-005 | Statut d'affiche à calculer (≈ 831 orphelines) | — |
| RG-REC-144 | `conservation` = 0 → affichage 20 (sans écriture) | — |
| RG-REC-157, 158, 159 | 318 affiches au drapeau `rebus` sans mouvement de rebut | QA-11 |
| RG-REC-163 à 169 | Aucune fusion héritée (table vide) | — |
| RG-REC-180, 181 | Purge massive au premier passage si elle est activée | — |
| RG-REC-043 | Supports réels compatibles ; « 2m2 Bdx » inclus dans la recherche 2 m² (à vérifier) | — |
| RG-COO-081, 121, 126, 128 (via référentiels) | Ids legacy cohérents avec les paramètres seedés si l'insertion se fait à id explicite ; **conflit de types de préparation** ; site 44 manquant | B2, QA-13 |

## 7. Points bloquants et questions candidates

La numérotation définitive est à attribuer par l'agent principal dans `QUESTIONS_OUVERTES.md`.

### Points bloquants pour un chargement des données Réception

- **B1 : données personnelles en base de dev** (§2.5). Q-321 (OUVERTE) et le skill `circe-jdd` l'interdisent. Il faut décider entre une anonymisation à l'import (noms des assistants Broadcast, `Decharge_par`, contacts imprimeurs, mails et téléphones des plateformes, logins non chargés) et une autorisation explicite de l'utilisateur.
- **B2 : espace d'identifiants des types de préparation** (§3.6, QA-2) :
  - `tr_type_preparation` (0 à 13), cible des FK legacy ;
  - `TypePreparation` Broadcast (1 à 28), utilisé par `integration-flux.ts:602-611` et les paramètres `integration.*` ;
  - le seed V2 (5 libellés applicatifs).

  Q-318 est à rouvrir.
- **B3 : typage et date des 20 578 mouvements** (QA-4) : production sans enum (Q-169), « Vidage du rebus », négatifs non étiquetés, date 0001-01-01.
- **B4 : reprise des liens affiche ↔ ligne attendue** (QA-5 = Q-213 OUVERTE) : quantité par lien, dédoublonnage imposé par l'index unique partiel, `ARecevoir` incohérent.
- **B5 : 8 119 lignes attendues sans plateforme** (QA-6) : `plateformeId` est NOT NULL.

### Autres questions (non bloquantes, hypothèse possible)

- **QA-3** : statut et plateforme des 1 976 réceptions créées depuis `livraison` ; choix de la photo du BL.
- **QA-7** : `affiche.cont_num` multi-dossiers.
- **QA-8** : atelier 0 (`ate_type` = 0) et lignes « inconnu ».
- **QA-9** : nettoyage des listes imprimeurs et transporteurs ; perte du texte libre.
- **QA-10** : `semaines` texte et `Dossier` = 0.
- **QA-11** : rebus legacy (= Q-155).
- **QA-12** : binaires des photos (= Q-311 / Q-332).
- **QA-13** : `IdSiteCCF` (site 44, Nanterre, dérivation depuis `DestinataireEffectif`).
- **QA-14** : historique initial de reprise.
- **QA-15** : utilisateurs et périmètres.

Le contenu réel de `tr_statut` est désormais connu (§3.13) : la partie « contenu » de Q-004 et ECART-067 peut être mise à jour.

## 8. Vérifications à exécuter (lecture seule, T-SQL sur l'export)

1. Mouvements à date sentinelle, répartis selon la présence d'une livraison :
   `SELECT COUNT(*), SUM(CASE WHEN livraison_id IS NULL THEN 0 ELSE 1 END) FROM mouvement WHERE [date] = '0001-01-01';`
2. Mouvements portant à la fois une livraison et une activité :
   `SELECT COUNT(*) FROM mouvement WHERE livraison_id IS NOT NULL AND IdActivite IS NOT NULL;`
3. Écart entre `affiche.quantite` et Σ mouvements, et nombre de stocks négatifs :
   `SELECT COUNT(*) FROM affiche a OUTER APPLY (SELECT SUM(quantite) s FROM mouvement m WHERE m.affiche_id = a.affiche_id) x WHERE ISNULL(x.s, 0) <> a.quantite;`, puis la même requête avec `x.s < 0`.
4. BL portant des affiches de plusieurs plateformes :
   `SELECT ala.Id_livraison FROM asso_livraison_affiche ala JOIN affiche a ON a.affiche_id = ala.Id_affiche_livraison GROUP BY ala.Id_livraison HAVING COUNT(DISTINCT a.plt_id) > 1;`
5. Doublons sur la clé V2 des lignes attendues :
   `SELECT plt_id, cont_num, sup_id, LOWER(LTRIM(RTRIM(ISNULL(rpc_theme, '')))), sem_annee, sem_num, COUNT(*) FROM tf_prepa_affiche GROUP BY … HAVING COUNT(*) > 1;`
6. Lignes sans plateforme, selon la présence d'un atelier et l'origine Broadcast :
   `SELECT ate_id, FromBroadcast, COUNT(*) FROM tf_prepa_affiche WHERE plt_id IS NULL GROUP BY ate_id, FromBroadcast;`
7. Lignes « reçues » sans affiche liée :
   `SELECT COUNT(*) FROM tf_prepa_affiche WHERE ARecevoir = 1 AND affiche_livraison_Id IS NULL;`
8. Taux de correspondance exacte, puis sans casse, de `livraison.Imprimeur` avec `tr_imprimeur.libelle` et de `livraison.Expediteur` avec `tr_transposteur_reception.libelle`. Recouvrement entre les deux listes.
9. Unicité et dossier sentinelle des semaines de départ :
   `SELECT IdAffiche, Dossier, Annee, Semaine, COUNT(*) FROM tf_dossier_semaine_depart GROUP BY … HAVING COUNT(*) > 1;` et `SELECT COUNT(*) … WHERE Dossier = 0;`
10. `affiche.cont_num` non numérique ou contenant « + » : `TRY_CONVERT(int, LTRIM(RTRIM(cont_num))) IS NULL`.
11. Collation de la base et des colonnes texte du périmètre : `DATABASEPROPERTYEX(DB_NAME(), 'Collation')` et `sys.columns.collation_name`.
12. Répartitions : `validationAdmin`, `conservation`, valeurs de `recepisse` pour les mouvements sans livraison ni activité.
