# Transfert de compétences

Le maître d'œuvre assure un transfert de compétences aux équipes Cityz Media avant la reprise de l'application (CAD-051,
jalon J4). Chaque session fait l'objet d'un support versionné dans ce répertoire (CAD-053). Une revue de code de sortie
est conduite par Cityz Media avant la reprise (CAD-052). La session Code vérifie qu'un développeur de Cityz Media
construit, exécute et teste l'application en local sans assistance (MNT-034).

**État au 26/11/2026 : plan préparatoire ; aucune session planifiée.** Les supports seront rédigés à partir de la version
en production (CAD-050).

| Session | Support (à créer) | Date | Animateur | Participants Cityz Media | État |
|---|---|---|---|---|---|
| 1. Architecture | `01-architecture.md` | `[À COMPLÉTER]` | `[À COMPLÉTER]` | `[À COMPLÉTER]` | À préparer |
| 2. Code | `02-code.md` | `[À COMPLÉTER]` | `[À COMPLÉTER]` | `[À COMPLÉTER]` | À préparer |
| 3. Exploitation | `03-exploitation.md` | `[À COMPLÉTER]` | `[À COMPLÉTER]` | `[À COMPLÉTER]` | À préparer |

## Session 1 — Architecture

Contenu minimal (CAD-051) : composants, flux, dépendances, choix structurants et dérogations accordées.

- Composants et flux, état actuel et cible : [dossier d'architecture](../architecture/README.md) §1 et schémas Mermaid.
- Périmètre et composants hors cadre (ordonnanceur interne, Broadcast, mails) : architecture §2,
  [EXC-006](../exceptions/EXC-006-etat-local-ordonnanceur.md).
- Choix structurants : [ADR 0001 à 0010](../adr/README.md).
- Dérogations et leur plan de retour à la conformité : [registre](../exceptions/README.md).
- Modèle d'autorisation : rôles (Q-003), administrateur global (Q-421), `apps/api/authz/`.
- Domaine métier : Réception, Coordination, parcours `REC-Pnn` et `COO-Pnn`
  ([spécifications](../specifications/README.md)).

## Session 2 — Code

Contenu minimal (CAD-051) : organisation du dépôt, conventions, build local, tests, points de complexité connus.

- Organisation et conventions : [CONTRIBUTING.md](../../CONTRIBUTING.md), [AGENTS.md](../../AGENTS.md) §5 et §6
  ([ADR 0007](../adr/0007-conventions-erreurs-etats-verrou-idempotence.md)).
- Build et exécution locale : [README.md](../../README.md) (`npm install`, `npm start`), `pnpm build`.
- Tests : `pnpm test`, `pnpm test:int` (base de test), `pnpm test:e2e` ; JDD reproductibles (`pnpm jdd`) ; traçabilité
  ([../acceptance/traceability.md](../acceptance/traceability.md), `docs/MATRICE_TRACABILITE_SPECIFICATIONS.md`).
- Contrats d'API : `pnpm api:contract`, `pnpm api:contract:check` ([../api/README.md](../api/README.md)).
- Points de complexité connus `[À COMPLÉTER au moment de la session]` ; pistes : machines d'états de la Réception et de
  la Coordination, calculs de validation admin et d'Instruction OK, trains et faces, reprise `import-circe.ts`,
  performances sur volume réel (ANO-065 à ANO-080), gel Réception/Coordination
  ([ADR 0010](../adr/0010-gel-reception-coordination.md)).
- Exercice MNT-034 : un développeur de Cityz Media clone, installe, lance et teste sans aide ; résultat consigné dans
  le support.

## Session 3 — Exploitation

Contenu minimal (CAD-051) : déploiement, observabilité, procédures du dossier d'exploitation, incidents connus.

- Déploiement (cible GitOps), démarrage, arrêt, vérification, retour au build précédent :
  [dossier d'exploitation](../operations/README.md) §1.
- Observabilité : [observabilite.md](../operations/observabilite.md), [indicateurs-metier.md](../operations/indicateurs-metier.md).
- Migrations et échec de migration : [migrations.md](../operations/migrations.md).
- Runbooks, reprise et rejeu : dossier d'exploitation §2 et §3.
- Incidents et anomalies connus : [known-issues.md](../operations/known-issues.md).

## Compte rendu de chaque session

À consigner dans le support de la session : date, participants, contenu présenté, questions et réponses, actions
ouvertes, validation de Cityz Media `[À COMPLÉTER]`.
