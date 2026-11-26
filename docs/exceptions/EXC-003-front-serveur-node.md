---
id: EXC-003
titre: Front servi par un serveur Node (TanStack Start / Nitro) avec relais /api, au lieu d'une SPA statique servie par Caddy
exigences: [STK-002, STK-030, STK-031, STK-032, STK-033, STK-034, STK-035, SEC-040, SEC-041, SEC-042, SEC-043]
decision: DEMANDÉE
auteur: Maître d'œuvre CIRCE V2 (à nommer)
date: 2026-11-26
echeance: À COMPLÉTER # fixée par le COTECH ; proposition : avant le premier déploiement sur Staging
sources: [AGENTS.md §3, docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md §1]
---

# EXC-003 — Front avec serveur Node

## Écart

- **STK-002** : le front est développé en React et TypeScript (conforme) mais produit par TanStack Start avec Nitro
  (preset `node-server`, `apps/web/vite.config.ts`) : la sortie est un serveur Node (`.output/server/index.mjs`) et non
  un ensemble de fichiers statiques.
- **STK-030 à STK-035** : aucun Caddyfile, aucun Dockerfile de référence, aucun `.dockerignore`, aucune configuration
  publique lue à l'exécution depuis `/config.json`.
- Le serveur web relaie `/api/*` vers l'API (`apps/web/src/routes/api/$.ts`) et y signe l'identité de développement
  (voir [EXC-002](EXC-002-identite-developpement.md)) : l'API métier est servie sur l'origine du front, contrairement
  à PLT-056.
- **SEC-040 à SEC-043** : aucune politique de sécurité du contenu (CSP) n'est appliquée par le serveur actuel. Le rendu
  serveur de TanStack Start injecte des scripts inline, incompatibles avec `script-src` sans `'unsafe-inline'`.

## Justification

La stack du projet a été fixée au démarrage ([AGENTS.md](../../AGENTS.md) §3 : TanStack Start, Nitro preset node, relais
`/api/*`), avant la prise en compte du référentiel 0.2.0-pre. Le relais permet aujourd'hui un démarrage local en une
commande, sans passerelle ni SSO.

## Alternatives étudiées

1. Garder TanStack Start et ajouter une CSP avec `'unsafe-inline'` : contraire à l'objectif de SEC-040 à 043.
2. Passer à une SPA statique (TanStack Router seul, build Vite) servie par Caddy : retenue pour la cible ; demande de
   retirer le rendu serveur et le relais, et d'adapter le client HTTP (URL de l'API lue dans `/config.json`, jeton
   Bearer en mémoire).
3. Passer à Angular : non nécessaire, React est autorisé.

## Politique CSP cible

Fournie par la variable `CSP` de Caddy (overlay de déploiement), à vérifier sur les aperçus, impressions, exports et
PDF générés dans le navigateur :

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' <hôte de l'API Gateway>; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

L'hôte de l'API Gateway est attribué par Cityz Media : `[À COMPLÉTER]`.

## Risques induits

- **Sécurité** : absence de CSP et serveur Node exposé si l'application était déployée en l'état ; aujourd'hui limité
  au poste local.
- **Exploitabilité** : un serveur Node à exploiter au lieu d'un serveur de fichiers standard.
- **Coût** : refonte du point d'entrée du front, du client HTTP et du relais ; tests E2E à adapter.

## Mesures compensatoires

- Aucun secret ni accès à la base dans le front ; toutes les données viennent de l'API.
- Routes API versionnées `/v1` et contrats OpenAPI disponibles (`docs/api/`), ce qui facilite le passage à un appel
  direct de l'API Gateway.

## Durée et plan de retour à la conformité

1. Produire une SPA statique (build Vite, TanStack Router) ; supprimer la dépendance à Nitro du livrable.
2. Lire l'URL de l'API et les paramètres publics dans `/config.json` au démarrage.
3. Fournir Caddyfile, Dockerfile de référence et `.dockerignore` (STK-030 à 035) ; CSP par la variable `CSP`.
4. Appeler l'API métier sur la Gateway avec jeton Bearer (selon [EXC-002](EXC-002-identite-developpement.md)).
5. Rejouer les E2E et vérifier l'absence de violation CSP dans la console.
