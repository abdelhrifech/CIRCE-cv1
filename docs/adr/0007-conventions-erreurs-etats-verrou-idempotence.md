# ADR 0007 — Conventions d'API : erreurs, machines d'états, transactions, verrou optimiste, idempotence

- Statut : acceptée (04/11/2026)
- Sources : [AGENTS.md](../../AGENTS.md) §6, ECART-001, ECART-009, Q-308 (HYPOTHÈSE PRISE),
  `apps/api/src/core/` (`errors.ts`, `state-machine.ts`, `transaction.ts`, `versioning.ts`, `idempotency.ts`)

## Contexte

Le code historique ne contrôlait les droits que dans l'interface (ECART-001) et n'avait ni idempotence ni contrôle de
version (ECART-009). La reconstruction devait garantir des règles serveur cohérentes et testables.

## Décision

- Organisation : `apps/api/src/modules/<module>/{routes,service,repository,schemas,permissions}.ts` ; les routes ne
  contiennent aucune logique métier ; le service porte les règles et vérifie les permissions.
- Erreurs : format unique `{ code, message, details?, regle? }` ; HTTP 400 validation, 401, 403 permission, 404,
  409 conflit, version ou transition interdite, 422 règle métier.
- Statuts : une machine d'états par entité, table de transitions explicite ; transition non listée = 409 ; chaque
  changement de statut écrit un historique (Q-308).
- Atomicité : toute opération à plusieurs écritures dans `prisma.$transaction`.
- Concurrence : verrouillage optimiste par champ `version` (`updateMany where version`, 409 si aucune ligne).
- Doubles soumissions : en-tête `Idempotency-Key` sur les POST de création et de transition, réponse rejouée.

## Conséquences

- Comportement prévisible pour le front et pour les tests (nominal, rejet, transitions interdites, permissions).
- Indépendant de la base : transposable à PostgreSQL ([ADR 0002](0002-base-sqlite.md)).
- Écarts connus tracés : ECART-105 (idempotence sans rejeu sur deux routes d'administration), ECART-108 (verrou de
  version trivial sur certaines écritures Réception).
