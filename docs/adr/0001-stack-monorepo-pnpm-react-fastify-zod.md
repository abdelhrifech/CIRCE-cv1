# ADR 0001 — Stack : monorepo pnpm, React et TanStack, Fastify, Prisma, Zod

- Statut : acceptée (04/11/2026)
- Sources : `docs/MISSION.md` §2 (architecture technique obligatoire), [AGENTS.md](../../AGENTS.md) §3, Q-338 (TRANCHÉE),
  Q-342 (HYPOTHÈSE PRISE), `docs/PLAN_IMPLEMENTATION.md` (journal du 04/11/2026, étape 2)

## Contexte

La mission impose une reconstruction de CIRCE sur une nouvelle stack : front TanStack Start et Router, React,
TypeScript, Tailwind, Radix UI, Vite, Nitro en mode Node.js relayant `/api` ; API Node.js, TypeScript, REST, Prisma ;
TypeScript strict, ESLint, Prettier ; PDF générés dans le navigateur ; LLM éventuel derrière une interface. Les choix
non imposés (framework HTTP, journalisation, validation) devaient être validés (« ne rien ajouter sans question
validée »).

## Décision

- Monorepo pnpm : `apps/web`, `apps/api`, `packages/shared`.
- API : Fastify 5, pino, `fastify-type-provider-zod`, Prisma ; versions épinglées (Q-338, décision de l'utilisateur du
  04/11/2026).
- Validation : schémas Zod dans `packages/shared`, réutilisés par le front et l'API.
- Runtime : Node.js 24 LTS (`engines` `>=24`, `.nvmrc`) (Q-342) ; pnpm 12.14.0 (`packageManager`).
- Tests : Vitest (unitaires et intégration), Playwright (E2E).

## Conséquences

- Fastify sur Node.js et React sont admis par le référentiel Cityz Media (STK-001, STK-002 pour le langage).
- Le mode de service du front (serveur Nitro et relais `/api`) n'est pas une SPA statique : écart déclaré dans
  [EXC-003](../exceptions/EXC-003-front-serveur-node.md).
- Les tests d'intégration utilisent `fastify.inject()` ; les schémas partagés évitent la divergence front/API.
- Le choix de la base est traité par l'[ADR 0002](0002-base-sqlite.md).
