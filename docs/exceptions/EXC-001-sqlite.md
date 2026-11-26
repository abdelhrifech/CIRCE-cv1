---
id: EXC-001
titre: Base de données SQLite (fichier local) au lieu de PostgreSQL ; fichiers stockés en base
exigences: [DON-001, DON-003, DON-020, DON-021, DON-022, DON-040]
decision: DEMANDÉE
auteur: Maître d'œuvre CIRCE V2 (à nommer)
date: 2026-11-26
echeance: À COMPLÉTER # fixée par le COTECH ; proposition : bascule PostgreSQL avant le premier déploiement sur Staging
sources: [Q-343, Q-311, Q-346, docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md §2]
---

# EXC-001 — SQLite au lieu de PostgreSQL

## Écart

- **DON-001** : l'application n'utilise aucun service du catalogue. La base est un fichier SQLite local
  (`apps/api/prisma/dev.db`, test : `test.db`) accédé par Prisma et l'adaptateur `better-sqlite3`
  (`apps/api/prisma/schema.prisma`, `provider = "sqlite"` ; `apps/api/src/core/db.ts` ; `apps/api/src/core/config.ts`).
- **DON-003** : le dossier d'architecture ne peut pas déclarer de service PostgreSQL ni de conteneur de stockage objet
  réellement utilisés ; il déclare la cible ([architecture](../architecture/README.md), rubrique Données).
- **DON-020 à DON-022** : pas d'instance PostgreSQL dédiée au tenant, pas d'extension à déclarer, pas de pool de
  connexions configurable par réplica (connexion unique au fichier).
- **DON-040** : les fichiers (photos du bon de livraison et des affiches) sont stockés en base (champ `Photo.fichier`,
  binaire) et non dans l'Object Storage. Ils sont servis par l'API avec contrôle des droits (`GET /photos/:id`),
  sans accès public (RG-REC-026, RG-REC-027, Q-311).

## Justification

Décision de l'utilisateur du 04/11/2026 (Q-343, TRANCHÉE) : « Prisma + SQLite, sans serveur ni Docker », pour un
développement local et des démonstrations sans infrastructure. Le module Réception, qui porte le stockage des photos,
est gelé depuis le 19/11/2026 (`ressources/gel/GEL_RECEPTION_COORDINATION_2026_11_19.json`, `node scripts/verifier-gel.mjs`).
Cette décision interne ne vaut pas dérogation Cityz Media : le présent fichier en fait la demande (CAD-100).

## Alternatives étudiées

1. PostgreSQL local en conteneur (`compose.yaml`) dès le développement : écartée par Q-343 (pas de Docker).
2. PostgreSQL partagé de développement : aucun environnement fourni à ce jour.
3. Conserver SQLite en production : impossible, incompatible avec plusieurs réplicas (PLT-061) et avec le catalogue.
4. Photos dans l'Object Storage dès maintenant : impossible sans modifier le module Réception gelé.

## Risques induits

- **Sécurité** : faible pour la base elle-même (fichier local) ; la base de dev contient des données réelles
  (voir [EXC-007](EXC-007-donnees-production-dans-le-depot.md)).
- **Exploitabilité** : verrouillage d'écriture global, pas de `SELECT … FOR UPDATE`, statistiques du planificateur à
  entretenir (ANO-072, `PRAGMA optimize` au démarrage) ; tests de concurrence non représentatifs de PostgreSQL ;
  index uniques partiels écrits en SQL brut hors schéma Prisma (Q-346) ; enums sans `CHECK` en base.
- **Coût** : migration SQLite → PostgreSQL à réaliser (types, index partiels, agrégations, scénarios de concurrence),
  et migration des photos vers le stockage objet.

## Mesures compensatoires

- Accès aux données exclusivement par Prisma et par les services ; aucune requête SQL propre à SQLite dans les règles
  métier, hors index partiels et `PRAGMA` techniques documentés.
- Verrouillage optimiste par `version`, transactions `prisma.$transaction`, idempotence persistée : comportements
  transposables à PostgreSQL ([AGENTS.md](../../AGENTS.md) §6).
- Migrations Prisma versionnées en ajout seul ([migrations](../operations/migrations.md)).
- Tests d'intégration sur une base de test dédiée, distincte de la base de dev.

## Durée et plan de retour à la conformité

Validité demandée : jusqu'au premier déploiement sur Staging.

1. Introduire la configuration PostgreSQL (fournisseur Prisma, URL et taille de pool par variable, TLS) et porter les
   migrations, y compris les index partiels.
2. Port « Fichiers » et adaptateur Blob (Object Storage) au passage à PostgreSQL : clé = identifiant de la photo,
   lecture et écriture par l'API, sans changement de règle métier ; reprise des binaires existants.
3. Rejouer les tests d'intégration et les tests de concurrence sur PostgreSQL local reproductible.
4. Fournir l'image et la commande du Job de migration (`prisma migrate deploy`).
5. Clore la dérogation par une mise à jour de ce fichier et du dossier d'architecture.
