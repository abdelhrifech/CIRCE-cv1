# Anomalies connues non corrigées

Liste due à la fin de garantie (FIN-010), tenue dès maintenant. Chaque anomalie porte une description, son impact, le
contournement éventuel et une piste de correction. Aucune piste ne vaut décision : les pistes qui changent un
comportement visible ou un contrat attendent l'arbitrage de la question citée.

Sources : `docs/RAPPORT_TESTS.md` (section 6, ANO-065 à ANO-080), `docs/ECARTS_EXISTANT_VS_CIBLE.md` (ECART-128),
`docs/QUESTIONS_OUVERTES.md` (Q-444, Q-447 à Q-449), recette du 24/11/2026
([compte rendu](../acceptance/campaigns/2026-11-24-recette-donnees-reelles.md)). État au 26/11/2026.

| Id | Titre | Gravité constatée | Question / écart |
|---|---|---|---|
| ANO-075 | Écrans de suivi lents sans semaine | Performance | Q-447 |
| ANO-076 | Erreur 431 sur « Suivi déroulant » filtré | Bloquant pour ce filtre | ECART-128 |
| ANO-077 | « Déroulant › Liste des colis » en erreur | Bloquant pour cette entrée de menu | Q-448 |
| ANO-079 | 403 et listes vides pour les profils chef d'équipe et commerce | Fonctionnel partiel | Q-449 |
| ANO-080 | Badge « Alertes » coûteux | Performance | ECART-128 |
| — | Photos reprises sans contenu | Données | ECART-128, Q-311 |
| Q-444 | Validation admin en 2 m² fixe / pliage depuis « À traiter » | Fonctionnel | Q-444 |
| — | Écrans « semaine courante » vides sur les données reprises | Ergonomie | Q-443, Q-447 |
| ANO-063 | UM non mise à jour après modification d'une ligne colisée | Fonctionnel | Q-418 |
| ANO-064 | Lien actif de 1 sur une affiche au stock 0 | Fonctionnel | Q-416 |

## ANO-075 — Écrans de suivi lents sans semaine

- **Description** : « Suivi 2 m² fixe / pliage / déroulant » et « Suivi de prod » ouvert sur un dossier appellent
  `GET /pilotage/dashboard` sans semaine : toutes les faces de toutes les semaines sont matérialisées (6 à 15 s, 1 à
  30 Mo sur les données reprises).
- **Impact** : attente longue ; l'API, mono-fil, retarde les autres requêtes pendant ce temps.
- **Contournement** : choisir une semaine dans les filtres (1,5 s sur une semaine).
- **Piste de correction** : semaine par défaut (comme `ProductionDashboard`) ou lectures restreintes dans
  `facesDesTrains` ; choix fonctionnel à arbitrer (Q-447).

## ANO-076 — Erreur 431 sur « Suivi déroulant » filtré par avancement

- **Description** : la sélection envoie des milliers d'identifiants `visualIds` dans l'URL (environ 40 Ko) ; le relais
  web et l'API répondent 431 (en-têtes trop grands).
- **Impact** : le filtre par avancement est inutilisable sur gros volume.
- **Contournement** : restreindre d'abord par semaine ou dossier.
- **Piste de correction** : passer la sélection dans le corps d'un POST ou en filtre serveur ; changement de contrat
  d'API à valider (nouvelle opération versionnée).

## ANO-077 — « Déroulant › Liste des colis » en erreur

- **Description** : l'entrée de menu ouvre `/expedition/colis?type=deroulant` ; la route n'accepte que `fixe` et
  `pliage` (erreur 500) et l'API n'a pas de filtre déroulant.
- **Impact** : page en erreur depuis le menu.
- **Contournement** : utiliser la liste des colis sans filtre de type.
- **Piste de correction** : retirer l'entrée, créer le filtre déroulant côté API, ou rediriger vers la liste sans
  filtre (Q-448, ECR-EXP-02, Q-197).

## ANO-079 — Profils chef d'équipe et commerce : 403 et listes vides

- **Description** : les écrans Affiches et la fiche affiche appellent `/reception/referentiels` (droit
  `reception.saisir`) et `/non-conformites` ; les profils `cheq` et `com` reçoivent 403 et les listes d'imprimeurs sont
  vides.
- **Impact** : filtres incomplets et erreurs en console pour ces profils ; pas de perte de données.
- **Contournement** : aucun pour ces profils ; un profil disposant du droit voit les listes.
- **Piste de correction** : droit de lecture des référentiels Réception pour `cheq` et `com`, ou appel conditionné au
  profil (Q-449, RG-REC-002).

## ANO-080 — Badge « Alertes » coûteux

- **Description** : le badge du bandeau appelle `GET /alertes?etat=OUVERTES`, qui renvoie la liste complète (plusieurs
  Mo, 1,2 à 1,8 s de calcul) pour n'afficher qu'un nombre, et part deux fois au chargement (site `null` au rendu serveur
  puis site choisi).
- **Impact** : chaque page est retardée.
- **Contournement** : aucun côté utilisateur.
- **Piste de correction** : compteur dédié côté API ou clé stable au premier rendu ; à arbitrer (RG-COO-075).

## Photos reprises sans contenu

- **Description** : 2 816 photos reprises de Circé n'ont pas de contenu binaire ; `GET /photos/:id` répond 404.
- **Impact** : aperçus de bon de livraison et d'affiche absents pour ces enregistrements repris.
- **Contournement** : aucun ; les nouvelles photos saisies dans CIRCE V2 sont stockées normalement.
- **Piste de correction** : reprendre les binaires depuis la source si elle les contient, ou marquer ces photos comme
  absentes dans l'interface ; à traiter avec la migration des fichiers vers l'Object Storage
  ([EXC-001](../exceptions/EXC-001-sqlite.md), Q-311).

## Q-444 — Validation admin en 2 m² fixe / pliage depuis « À traiter »

- **Description** : depuis la reprise de la référence `circe-tested` (23/11/2026), l'écran « À traiter » liste une
  ligne par répartition et n'offre plus « Valider la sélection », « Cocher les cas sûrs » ni le pré-cochage
  (RG-COO-010 à 013, 019) ; les dossiers à affiches à confirmer sans répartition ne sont visibles dans aucune liste.
  Le test E2E `e2e/coordination-validation-admin.spec.ts:18` échoue.
- **Impact** : validation admin de ces dossiers impossible depuis cet écran en 2 m² fixe et pliage.
- **Contournement** : `[À VÉRIFIER]` validation depuis la fiche affiche (Réception), qui porte le même droit
  `validation_admin.valider` (Q-186).
- **Piste de correction** : rétablir l'accès dans « À traiter », déplacer la validation, ou acter le retrait par un
  écart et réécrire le test (Q-444, bloquante pour RG-COO-010 à 013 en fixe et pliage).

## Écrans « semaine courante » vides

- **Description** : plusieurs écrans s'ouvrent sur la semaine courante ; les données reprises couvrent S28 à S41 de
  2026, d'où des listes vides au premier affichage.
- **Impact** : impression d'application vide lors d'une démonstration.
- **Contournement** : choisir une semaine entre S28 et S41 de 2026 dans les filtres ([README.md](../../README.md)).
- **Piste de correction** : aucune côté code tant que la semaine par défaut n'est pas arbitrée (Q-443 dates passées,
  Q-447).

## ANO-063 — UM non mise à jour après modification d'une ligne colisée

- **Description** : la quantité d'une ligne modifiée après le Colisage (ligne « En cours » dans une UM) ne met pas l'UM
  à jour (exemple : UM 12, somme des lignes 13).
- **Impact** : écart de quantité entre l'UM et ses lignes.
- **Contournement** : `[À COMPLÉTER]`.
- **Piste de correction** : selon l'arbitrage de Q-418.

## ANO-064 — Lien actif de 1 sur une affiche au stock 0

- **Description** : un comptage à zéro laisse un lien actif de 1 sur une affiche au stock 0 (`Math.max(1, …)`, Q-178).
- **Impact** : quantité liée surestimée d'une unité.
- **Contournement** : aucun.
- **Piste de correction** : selon l'arbitrage de Q-416 (hypothèse actuelle conservée, test `it.todo` NR-064).

## Autres limites connues (non anomalies)

Lectures sans filtre encore lentes sur volume réel (`pilotage/analyse` sur tout l'historique 4 à 6,5 s,
`pilotage/suivi` tous sites ≈ 4 s, `pilotage/tableau` tous sites 3,3 s) ; démarrage Windows non recetté sur un poste
réel ; `npm install` crée un `package-lock.json` local ignoré (ECART-128).
