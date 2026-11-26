# Contribuer à CIRCE V2

Ce guide décrit les conventions de code, l'organisation du dépôt et la procédure d'ajout d'une fonctionnalité (MNT-032).
Les règles de travail des agents de code sont dans [AGENTS.md](AGENTS.md) ; le démarrage local dans [README.md](README.md).

## Prérequis

- Node.js 24 LTS (`.nvmrc`) ; pnpm 12.14.0 (champ `packageManager`, installé par `npm install` si absent).
- Environnement reproductible : `.devcontainer/` (VS Code, GitHub Codespaces).

## Organisation du dépôt

| Emplacement       | Contenu                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Interface React (TanStack Router), écrans par module, composants partagés                                                                 |
| `apps/api`        | API Fastify : `src/modules/<module>/{routes,service,repository,schemas,permissions}.ts`, socle `src/core`, schéma et migrations `prisma/` |
| `packages/shared` | Schémas Zod, codes de droits et rôles partagés par le web et l'API                                                                        |
| `e2e`             | Tests de bout en bout Playwright                                                                                                          |
| `docs`            | Documentation en Markdown (architecture, spécifications, recette, exploitation, ADR, dérogations, jalons)                                 |
| `scripts`         | Lanceur local, installation, contrôles                                                                                                    |

## Conventions de code

- TypeScript strict, `allowJs` désactivé ; JavaScript réservé aux fichiers de configuration et aux scripts d'outillage (STK-003).
- ESLint et Prettier (MNT-010) : `pnpm lint`, `pnpm format`.
- Les routes ne portent aucune logique métier ; le service porte les règles. Chaque fonction qui implémente une règle porte
  son identifiant en commentaire (`// RG-REC-012`) et chaque test l'identifiant de la règle testée dans son nom.
- Erreurs au format unique `{ code, message, details?, regle? }` ; HTTP 400, 401, 403, 404, 409, 422.
- Une machine d'états par entité (transition non listée = 409) ; toute opération multi-écritures dans une transaction ;
  verrouillage optimiste par `version` ; en-tête `Idempotency-Key` sur les POST de création et de transition.
- Permissions vérifiées dans le service. Aucune donnée en dur dans le front ; états chargement / vide / erreur.
- Aucune règle métier sans source : sinon une question `Q-nnn` dans `docs/QUESTIONS_OUVERTES.md`.
- Langue : documentation en français (DOC-001) ; code en français à ce jour, écart déclaré
  (`docs/exceptions/EXC-005-code-en-francais.md`).

## Messages de commit

Format [Conventional Commits 1.0.0](https://www.conventionalcommits.org/fr/v1.0.0/) (MNT-012) :
`<type>(<portée facultative>): <description>` avec `type` parmi `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, `revert` (`!` pour une rupture). Contrôle : `pnpm commits:check` (par défaut sur les
commits absents de `origin/main`).

## Ajouter une fonctionnalité

1. Identifier les exigences (`EX-…`) et règles (`RG-…`) concernées dans `docs/specifications/` ; ouvrir une question si
   une règle manque.
2. Créer une branche depuis `main`.
3. API : schémas Zod dans `packages/shared`, service avec les règles, route sans logique, permissions dans le service.
4. Front : écran branché sur l'API, conforme à la maquette, avec ses états.
5. Tests : intégration sur la base de test (nominal, rejet, transitions interdites, permissions), E2E du parcours nominal.
6. Contrat : `pnpm api:contract` si l'API change.
7. Vérifier : `pnpm typecheck && pnpm lint && pnpm test && pnpm test:int` puis `pnpm test:e2e`.
8. Mettre à jour la traçabilité (`docs/acceptance/traceability.md`, matrice), les écarts et les questions.
9. Ouvrir une pull request vers `main` ; une revue par une personne distincte de l'auteur est requise.

## Base de données

- Migrations Prisma versionnées dans `apps/api/prisma/migrations`, en ajout seul, compatibles avec la version précédente ;
  une migration appliquée n'est jamais modifiée (DON-030 à 036, `docs/operations/migrations.md`).
- Les tests ne s'exécutent que sur la base de test (`apps/api/prisma/test.db`).
