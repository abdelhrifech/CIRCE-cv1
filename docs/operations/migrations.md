# Migrations de schéma : contrôle et procédure

Contrôle en lecture seule des migrations Prisma de `apps/api/prisma/migrations` au regard des exigences DON-030 à DON-036
du référentiel (annexe C §4.2). Aucune migration ni aucune donnée n'a été modifiée pour ce contrôle (26/11/2026).

## État des 30 migrations

| Exigence | Constat | État |
|---|---|---|
| DON-030 versionnées dans le dépôt | 30 dossiers `AAAAMMJJHHMMSS_nom/migration.sql` + `migration_lock.toml`, du `20261104160802_cree_modele_initial` au `20261121122000_production_delivery_forecast` | Conforme |
| DON-033 ajout seul | Aucune instruction `DROP TABLE`, `DROP INDEX`, `DROP COLUMN` ni `RENAME`. Les deux migrations que Prisma générait en reconstruisant une table (`20261104174337_ajoute_exclusion_purge_attendues`, `20261104195902_ajoute_reception_complete`) ont été réécrites à la main en `ALTER TABLE … ADD COLUMN` (commentaires en tête de fichier). Les index uniques partiels de la migration initiale sont à conserver : `prisma migrate dev` propose de les supprimer, ces lignes sont retirées à la relecture (commentaire l. 878–882). | Conforme |
| DON-032 compatibles avec la version n-1 | Les migrations n'ajoutent que des tables, des colonnes facultatives ou avec valeur par défaut, et des index : une version précédente de l'API continue de fonctionner sur le schéma enrichi. | Conforme (constat statique) |
| DON-034 jamais modifiées une fois appliquées | Historique Git : les dossiers de migration sont créés, jamais réécrits après leur commit. À garantir par revue (CODEOWNERS) et par la CI cible. | Partiel |
| DON-031 idempotentes | `prisma migrate deploy` enregistre chaque migration appliquée dans `_prisma_migrations` et ignore les migrations déjà appliquées ; sur PostgreSQL, il prend un verrou consultatif qui sérialise les exécutions concurrentes. Une migration en échec est marquée « échouée » et bloque les suivantes jusqu'à résolution (procédure ci-dessous). Les scripts SQL eux-mêmes n'utilisent pas `IF NOT EXISTS`. | Partiel |
| DON-036 Job tolérant un schéma plus récent | `prisma migrate deploy` n'applique que ses propres migrations manquantes ; le comportement face à des migrations plus récentes déjà appliquées est à vérifier sur Staging avant le premier retour arrière. | À vérifier |
| DON-020 à 022 PostgreSQL | La base actuelle est SQLite (Q-343) : dérogation `docs/exceptions/EXC-001-sqlite.md`. Le passage à PostgreSQL demandera une nouvelle ligne de base de migrations, à prévoir avec la dérogation. | Dérogation |

## Règles pour toute nouvelle migration

1. Générer avec `pnpm --filter @circe/api exec prisma migrate dev --name <nom>` sur la base de dev, puis **relire le SQL** :
   aucune suppression, aucun renommage, aucune reconstruction de table ; retirer les `DROP INDEX` des index uniques partiels.
2. Toute suppression ou tout renommage passe par une dérogation (DON-033) et n'est livré que dans une version postérieure à
   celle qui cesse d'utiliser l'objet.
3. Ne jamais modifier ni supprimer une migration déjà appliquée sur Staging ou en production : livrer une nouvelle migration.
4. Vérifier sur la base de test : `pnpm db:test:up` puis `pnpm test:int` (dont `test/modele-donnees.int.test.ts`).

## Traitement d'un échec de migration (DON-035)

| Étape | Action |
|---|---|
| Détection | Le Job de migration se termine en erreur ; les réplicas de la nouvelle version ne démarrent pas ; `_prisma_migrations` porte la migration avec `finished_at` vide et un journal d'erreur. |
| Diagnostic | Journal du Job (Loki), contenu de `_prisma_migrations`, état réel des objets créés par la migration. |
| Reprise | Si la migration n'a rien appliqué (transaction annulée) : corriger par une **nouvelle** migration, marquer l'échec résolu (`prisma migrate resolve --rolled-back <nom>`), redéployer. Si elle a appliqué une partie : compléter à la main l'état attendu, puis `prisma migrate resolve --applied <nom>`. |
| Retour arrière | La version précédente reste compatible (DON-032) : revert du tag dans l'overlay GitOps (CIC-064) sans intervention sur le schéma. |
| Données à restaurer | Uniquement en cas de perte avérée : restauration de la base depuis la sauvegarde de la plateforme, selon les capacités communiquées par Cityz Media (DON-050). |

Les commandes `prisma migrate resolve` sont exécutées par Cityz Media avec ses propres accès (CAD-070 : le maître d'œuvre n'a
qu'un accès en lecture seule à la base de production).
