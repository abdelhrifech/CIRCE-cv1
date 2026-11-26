---
id: EXC-002
titre: Fournisseur d'identité de développement (en-tête signé HMAC) au lieu du SSO et des jetons Bearer
exigences: [SEC-010, SEC-011, SEC-012, SEC-013]
decision: DEMANDÉE
auteur: Maître d'œuvre CIRCE V2 (à nommer)
date: 2026-11-26
echeance: À COMPLÉTER # fixée par le COTECH ; proposition : avant tout déploiement sur Staging
sources: [Q-001, ECART-065, docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md §3]
---

# EXC-002 — Identité de développement

## Écart

- L'API ne reconnaît qu'une identité de développement : en-tête `x-dev-identity` signé HMAC avec
  `DEV_IDENTITY_SECRET` (`apps/api/src/core/identity.ts`). Le relais web (`apps/web/src/routes/api/$.ts`) signe
  l'identité choisie par `DEV_IDENTITY_USER` ou le sélecteur « Profil (dev) ».
- Aucun validateur de jeton Bearer (signature, émetteur, audience, expiration, JWKS) : SEC-012 et SEC-013 non satisfaites.
- SEC-011 : le relais et le sélecteur de profil constituent un mécanisme d'authentification propre à l'application,
  réservé au développement.
- SEC-010 : aucune bibliothèque propre à un fournisseur d'identité n'est utilisée ; l'exigence est respectée
  aujourd'hui et doit le rester dans la cible. Elle est citée ici pour que le futur validateur reste générique (OIDC/JWKS).

## Justification

Q-001 (HYPOTHÈSE PRISE, 04/11/2026) : le mode d'authentification (APIM, Entra ID) n'était pas connu ; délégation de
l'utilisateur pour un fournisseur d'identité de développement, sans authentification réelle, à remplacer quand le mode
sera connu. Garde-fou : `loadConfig` refuse de démarrer si `NODE_ENV=production`
(`apps/api/src/core/config.ts`), et `scripts/start.mjs` refuse également ce cas.

## Alternatives étudiées

1. Intégrer dès maintenant oauth2-proxy et un validateur JWKS : impossible sans fournisseur, audience ni middleware
   fournis par Cityz Media.
2. Bibliothèque d'un fournisseur (MSAL) : interdite par SEC-010.
3. Authentification locale par mot de passe : interdite par SEC-011 et hors besoin.

## Risques induits

- **Sécurité** : élevé si l'application était exposée avec ce mécanisme ; réduit par le refus de démarrer en
  production et par l'absence de tout déploiement hors poste local.
- **Exploitabilité** : les acteurs journalisés sont des utilisateurs de dev (`dev.coord`, `dev.recep`, …) ; la
  correspondance avec les comptes SSO reste à définir.
- **Coût** : validateur Bearer, récupération du jeton par `GET /oauth2/auth` côté SPA, tests négatifs à écrire.

## Mesures compensatoires

- Permissions vérifiées côté serveur dans chaque service, indépendamment du mode d'identité
  (`apps/api/src/core/permissions/`) ; modèle d'autorisation versionné (`apps/api/authz/modele.fga`).
- Identité résolue en un point unique (`identity.ts`), ce qui limite le remplacement à un adaptateur.
- Journalisation des refus et des opérations sensibles (`securite.refus`, `securite.operation_sensible`,
  `apps/api/src/core/observability/securite-metier.ts`).

## Durée et plan de retour à la conformité

1. Obtenir de Cityz Media l'émetteur, l'audience par API et le parcours oauth2-proxy.
2. Ajouter un validateur de jeton générique (OIDC/JWKS) derrière l'interface d'identité ; conserver l'identité de dev
   uniquement pour `NODE_ENV=development` et les tests.
3. Côté SPA : jeton en mémoire seulement, renouvellement après 401 (SEC-015).
4. Tests : signature invalide, émetteur, audience, expiration, absence de jeton, accès aux fichiers protégés.
5. Définir la correspondance des comptes SSO avec les utilisateurs, rôles et périmètres existants (Q-003, Q-421).
