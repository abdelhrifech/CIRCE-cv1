# ADR 0003 — Identité de développement signée (HMAC)

- Statut : acceptée comme hypothèse provisoire (04/11/2026), à remplacer
- Sources : Q-001 (HYPOTHÈSE PRISE), ECART-065, `apps/api/src/core/identity.ts`, `apps/api/src/core/config.ts`,
  [EXC-002](../exceptions/EXC-002-identite-developpement.md)

## Contexte

Le mode d'authentification cible (APIM, Entra ID, SSO de la plateforme) n'était pas connu au démarrage. Les droits
devaient pourtant être vérifiés côté serveur dès les premiers parcours.

## Décision

Fournisseur d'identité de développement : le relais web signe l'utilisateur choisi (`DEV_IDENTITY_USER`, sélecteur
« Profil (dev) ») dans l'en-tête `x-dev-identity` (HMAC, `DEV_IDENTITY_SECRET`) ; l'API vérifie la signature et charge
l'utilisateur, ses rôles et ses plateformes. L'API refuse de démarrer si `NODE_ENV=production`. Utilisateurs de dev par
rôle créés par `pnpm dev:user` et par le lanceur (`dev.coord`, `dev.recep`, `dev.cheq`, `dev.expe`, `dev.admin`,
`dev.com`).

## Conséquences

- Les permissions et périmètres sont testables sans fournisseur réel.
- Aucune authentification réelle : interdiction de tout déploiement en l'état ; dérogation demandée
  ([EXC-002](../exceptions/EXC-002-identite-developpement.md)).
- La résolution d'identité étant centralisée, la cible (jeton Bearer validé par JWKS, SSO oauth2-proxy) se limite à un
  nouvel adaptateur et à l'adaptation du client HTTP.
