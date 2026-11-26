# ADR 0009 — Démarrage local par `npm install` puis `npm start`

- Statut : acceptée (24/11/2026)
- Sources : Q-446 (TRANCHÉE), Q-437, [README.md](../../README.md), `scripts/start.mjs`, `scripts/installer.mjs`,
  `scripts/pnpm-process.mjs`, `docs/PLAN_IMPLEMENTATION.md` (journal du 24/11/2026)

## Contexte

Un clone neuf devait démarrer sur tout poste (Windows compris) sans installation globale de pnpm, ni Docker, ni serveur
de base de données.

## Décision

- `npm install` : `postinstall` (`scripts/installer.mjs`) lance `npx pnpm@12.14.0 install` ; `pnpm-lock.yaml` reste la
  seule référence (le `package-lock.json` créé localement est ignoré).
- `npm start` (`scripts/start.mjs`) : crée `.env` depuis `.env.example`, restaure la base livrée si `dev.db` est absent,
  applique les migrations, génère le client Prisma, prépare référentiels, profils et JDD, puis lance API, web et sondes
  sur des ports libres ; refuse `NODE_ENV=production` et une base autre que `dev.db` ; `Ctrl+C` arrête tout.
- Options : `--user=`, `--no-seed`, `--no-demo`, `--demo`, `--sans-jdd`, `--import=`, `--web-port=`, `--api-port=`,
  `--admin-port=`.

## Conséquences

- Démonstration et développement locaux en deux commandes.
- Vérifié sur un clone vierge sous macOS seulement ; recette native Windows à faire (ECART-128).
- Ce lanceur ne constitue pas un mode de déploiement : la cible repose sur des images et le processus GitOps
  ([EXC-004](../exceptions/EXC-004-conteneurs-ci-gitops.md)).
