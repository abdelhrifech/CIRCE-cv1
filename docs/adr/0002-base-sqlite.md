# ADR 0002 — Base de données SQLite (fichier local) via Prisma

- Statut : acceptée pour le développement local (04/11/2026) ; dérogation demandée pour la cible
- Sources : Q-343 (TRANCHÉE), Q-346 et Q-311 (HYPOTHÈSES PRISES), [AGENTS.md](../../AGENTS.md) §3,
  `docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md` §2, [EXC-001](../exceptions/EXC-001-sqlite.md)

## Contexte

La mission prévoyait PostgreSQL (`docs/MISSION.md` §2). Le 04/11/2026, l'utilisateur a demandé de travailler sans serveur
de base de données ni Docker.

## Décision

Prisma avec SQLite (fichier local, adaptateur `better-sqlite3`) : base de dev `apps/api/prisma/dev.db`, base de test
dédiée `apps/api/prisma/test.db`. Les règles qui supposent PostgreSQL sont réalisées avec les moyens de SQLite : index
uniques partiels en SQL brut dans les migrations (Q-346), binaire en base pour les photos (Q-311), verrouillage
optimiste par `version`.

## Conséquences

- Démarrage local sans infrastructure.
- Risques acceptés (Q-343) : verrouillage d'écriture global, pas de `SELECT … FOR UPDATE`, types limités, tests de
  concurrence non représentatifs de PostgreSQL, migration future à prévoir.
- Statistiques du planificateur à entretenir sur gros volume (`PRAGMA optimize`, ANO-072).
- Non conforme au catalogue Cityz Media (DON-001) et à l'exécution multi-réplicas (PLT-060, PLT-061) : dérogations
  [EXC-001](../exceptions/EXC-001-sqlite.md) et [EXC-006](../exceptions/EXC-006-etat-local-ordonnanceur.md), plan de
  bascule vers PostgreSQL et Object Storage.
