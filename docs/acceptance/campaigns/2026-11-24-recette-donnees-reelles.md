# Campagne du 24/11/2026 — recette technique sur données réelles reprises de Circé

> **Nature de la campagne.** Il s'agit d'une recette technique de lecture et de tenue en volume, menée par l'équipe de
> réalisation. Elle ne vaut pas recette utilisateur (UAT) formelle : aucun Responsable Métier n'a exécuté les cas ni
> prononcé de décision à ce jour. Elle a porté sur des **données réelles** reprises de la base de qualification de Circé,
> non pseudonymisées, ce qui s'écarte de DOC-024 (données de test fictives). Cet écart est déclaré dans
> [EXC-007](../../exceptions/EXC-007-donnees-production-dans-le-depot.md) (décisions Q-438 et Q-446).

## 1. Identification

| Élément | Valeur |
|---|---|
| Identifiant | CAMP-2026-11-24 |
| Version testée | commit `3cb8d5e` sur `main` (« feat: base réelle de Circé comme JDD, recette sur volume réel, démarrage npm install + npm start ») ; branche `sync-gv1` fusionnée dans `main` le même jour |
| Date | 24 novembre 2026 |
| Exécutant | équipe de réalisation (exécution automatisée Playwright et mesures sur l'API) |
| Sources du compte rendu | [`RAPPORT_TESTS.md`](../../RAPPORT_TESTS.md) §6 (ANO-065 à ANO-080) ; [`PLAN_IMPLEMENTATION.md`](../../PLAN_IMPLEMENTATION.md), journaux du 24/11 |

## 2. Environnement

| Élément | Valeur |
|---|---|
| Poste | poste de développement local sous macOS ; aucun environnement Staging ou de recette Cityz Media |
| Application | API Fastify et web (TanStack Start / Nitro) lancés en local par `pnpm start:all` ; API mono-processus |
| Base | base de dev SQLite `apps/api/prisma/dev.db` alimentée par la reprise de Circé (`export-circe.ts`, SELECT seuls, puis `import-circe.ts`, Q-437) ; JDD fictifs Bus, J-3 et non-conformités sur les plateformes « … (JDD) » |
| Identité | identités de développement `dev.coord`, `dev.recep`, `dev.cheq`, `dev.expe`, `dev.admin`, `dev.com` (Q-001), sans SSO |
| Volume (base source, `docs/_travail/base-reelle-2026-11-24/`) | ≈ 388 800 faces de train (388 429 après import), ≈ 357 300 détails d'instruction, ≈ 39 200 UM en colis, ≈ 12 900 colis, ≈ 9 950 affiches à la source (≈ 9 400 après rejets à l'import) |
| Règles à l'import | lignes violant une règle cible rejetées avec leurs dépendances (ECART-126) ; instructions validées à 0 % acceptées (Q-445, ECART-127) |

## 3. Périmètre et méthode

- 98 routes `GET` appelées pour les 6 profils, sur plusieurs sites et semaines ; 268 pages parcourues par profil
  (Playwright), avec relevé des erreurs HTTP, des erreurs de console et des temps de réponse.
- Aucune écriture métier n'a été rejouée sur les données reprises pendant cette campagne : la campagne vérifie l'affichage,
  les droits de lecture et la tenue en volume, pas les transitions métier.
- Les cas de test de `docs/acceptance/test-cases/` n'existaient pas encore : les résultats ne sont pas consignés par
  cas. Le tableau du §5 rattache chaque anomalie aux fichiers de cas concernés pour les campagnes suivantes.

## 4. Résultats globaux

| Contrôle | Résultat |
|---|---|
| Lecture des 98 routes × 6 profils | 10 défauts de volume corrigés pendant la campagne (ANO-065 à ANO-074), 1 défaut d'affichage corrigé (ANO-078), 5 anomalies laissées ouvertes (ANO-075, 076, 077, 079, 080) |
| Typecheck, lint | réussis |
| Tests unitaires | 386 réussis |
| Tests d'intégration (base de test) | 3 778 réussis, dont `apps/api/test/massif/volume-reel.int.test.ts` ajouté pour les corrections de volume |
| E2E Playwright | dernier passage consigné le 24/11 (avant import) : 113 / 117, 1 échec (`e2e/coordination-validation-admin.spec.ts:18`) et 3 tests non lancés, liés à la question ouverte Q-444 ; pas de nouveau passage complet consigné après l'import |
| Installation neuve | clone vierge testé sous macOS (`npm install`, `npm start`) ; recette native Windows non faite (pas de poste Windows) |

## 5. Anomalies relevées

### 5.1 Corrigées pendant la campagne

| Anomalie | Écran ou route | Avant → après correction | Règle ou exigence | Cas de test liés |
|---|---|---|---|---|
| ANO-065 | `GET /coordination/suivi-production` | API bloquée plus de 15 min → corrigé (index en une passe) | RG-COO-105, RG-COO-106 | [TC-COO-P05](../test-cases/TC-COO-P05.md) |
| ANO-066 | `GET /stocks/fin-campagne` | 32 s → 1,2 s | RG-STK-NEW-002 | [TC-NEW](../test-cases/TC-NEW.md) |
| ANO-067 | `GET /pilotage/dashboard` sans semaine | 50 s → 6 à 10 s (1,5 s sur une semaine) ; correction partielle, voir ANO-075 | EX-NEW-PIL-001 | [TC-NEW](../test-cases/TC-NEW.md) |
| ANO-068 | `GET /coordination/rouleurs` | 15 s → 0,35 s | RG-COO-297 | [TC-COO-P11](../test-cases/TC-COO-P11.md) |
| ANO-069 | `GET /pilotage/tableau` | 45 s → 2,0 s (un site), 3,5 s (tous sites) | EX-NEW-PIL-001, RG-REC-121, RG-COO-025 | [TC-NEW](../test-cases/TC-NEW.md), [TC-REC-P08](../test-cases/TC-REC-P08.md) |
| ANO-070 | `GET /coordination/unitaire` et `/synthese` | 12 s → 0,6 s | RG-COO-290 | [TC-COO-P12](../test-cases/TC-COO-P12.md) |
| ANO-071 | `GET /alertes` | 5,5 s → 1,2 à 1,8 s | RG-COO-075, RG-COO-055, RG-COO-067 | [TC-COO-P07](../test-cases/TC-COO-P07.md) |
| ANO-072 | plans de requête SQLite (toutes lectures) | statistiques du planificateur absentes → `PRAGMA optimize` au démarrage et en fin d'import | technique (Q-343) | — |
| ANO-073 | `GET /coordination/trains/options-creation` | 19 s → 0,2 s | RG-COO-224 | [TC-COO-P09](../test-cases/TC-COO-P09.md) |
| ANO-074 | `GET /pilotage/analyse` (période vide) | 4 s → 0,2 s | EX-NEW16-REP-001 (cité par le rapport de tests) | [TC-NEW](../test-cases/TC-NEW.md) |
| ANO-078 | tableaux avec total (Bus › Préparation) | erreur d'hydratation React → corrigé | technique | — |

### 5.2 Ouvertes à la clôture

| Anomalie | Description | Règle ou exigence | Arbitrage attendu | Cas de test liés |
|---|---|---|---|---|
| ANO-075 | Suivis 2 m² fixe / pliage / déroulant et « Suivi de prod » sur un dossier : `GET /pilotage/dashboard` sans semaine, 6 à 15 s, 1 à 30 Mo | EX-NEW-PIL-001 | Q-447 (semaine par défaut) | [TC-NEW](../test-cases/TC-NEW.md) |
| ANO-076 | « Suivi déroulant » filtré par avancement : milliers d'identifiants dans l'URL, erreur 431 | EX-NEW-PIL-001 | changement de contrat (corps POST), ECART-128 | [TC-NEW](../test-cases/TC-NEW.md) |
| ANO-077 | « Déroulant › Liste des colis » : `type=deroulant` refusé, page en erreur | ECR-EXP-02 (Q-197) | Q-448 | [TC-COO-P13](../test-cases/TC-COO-P13.md) |
| ANO-079 | Profils chef d'équipe et commerce : 403 sur les référentiels Réception et les non-conformités depuis les écrans Affiches | RG-REC-002 | Q-449 (matrice de droits) | [TC-REC-P08](../test-cases/TC-REC-P08.md) |
| ANO-080 | Badge « Alertes » : liste complète des alertes ouvertes chargée pour un nombre, deux fois par page | RG-COO-075 | compteur dédié à arbitrer, ECART-128 | [TC-COO-P07](../test-cases/TC-COO-P07.md) |

Autres points laissés ouverts le 24/11 (ECART-128, journal du 24/11) : photos reprises sans contenu de fichier, écrans
filtrés par défaut sur la semaine courante vides sur les données passées (S28 à S41 2026, Q-443), recette Windows,
question Q-444 (validation admin en 2 m² fixe / pliage) et passage de `spec-auditor` sur le périmètre repris.

## 6. Mesures de temps de réponse

Les mesures ci-dessus sont des temps observés sur le poste local, API mono-processus, base SQLite, sur le volume réel.
Elles ne valent pas engagement de performance sur la cible (PostgreSQL, plusieurs réplicas). Les mesures reproductibles
sur JDD fictifs (2 000 et 6 000 dossiers, seuil 3 000 ms) sont dans [`RAPPORT_TESTS.md`](../../RAPPORT_TESTS.md) §5.

## 7. Décision du Responsable Métier

| Élément | Valeur |
|---|---|
| Responsable Métier | [À COMPLÉTER : nom] |
| Date de la décision | [À COMPLÉTER : date] |
| Décision | [À COMPLÉTER : acceptée / acceptée avec réserves / refusée] |
| Réserves | [À COMPLÉTER : par exemple les anomalies ouvertes du §5.2] |
| Signature ou trace de validation | [À COMPLÉTER] |

Tant que ce tableau n'est pas renseigné, cette campagne reste un compte rendu technique sans valeur de recette.
