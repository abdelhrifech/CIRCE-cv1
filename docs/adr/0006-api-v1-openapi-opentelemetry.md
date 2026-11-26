# ADR 0006 — Routes versionnées /v1, contrats OpenAPI et OpenTelemetry

- Statut : acceptée (12/11/2026)
- Sources : `docs/EVOLUTION_API_OBSERVABILITE_2026_11_12.md`, `docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md`
  (« Traitement ciblé ultérieur »), [docs/api/README.md](../api/README.md),
  [docs/operations/observabilite.md](../operations/observabilite.md)

## Contexte

L'audit du référentiel 0.2.0-pre a relevé l'absence de version majeure dans les chemins, de contrats OpenAPI,
d'instrumentation OpenTelemetry et de sondes séparées. L'utilisateur a autorisé ces seuls sujets, avec conservation du
comportement et de toutes les règles métier.

## Décision

- Routes `/v1/...` enregistrées par le même plugin que les routes historiques `/api/...`, conservées pour l'interface ;
  mêmes services, transactions, validateurs et format d'erreur.
- Contrats OpenAPI 3.1 générés depuis les schémas Zod : `docs/api/circe-v1.openapi.json` (API métier) et
  `docs/api/circe-admin.openapi.json` (sondes) ; `pnpm api:contract` et contrôle de fraîcheur `pnpm api:contract:check`.
- SDK officiel OpenTelemetry initialisé avant Fastify, Pino et Prisma ; export OTLP configuré uniquement par les
  variables `OTEL_*` ; aucun collecteur requis en local.
- Pino JSON sur stdout comme canal unique de logs, corrélé aux traces.
- Serveur d'administration séparé (port 9180 par défaut) : `/healthz/live` sans dépendance, `/healthz/ready` avec la
  base et un délai maximum, 503 pendant l'arrêt.

## Conséquences

- PLT-050, PLT-052, EXP-001 à 013 et EXP-020/021 sont traités dans le dépôt ; le branchement au collecteur Cityz et la
  non-exposition du port 9180 restent à vérifier au déploiement.
- Le préfixe `/api` reste transitoire tant que le front utilise le relais ([EXC-003](../exceptions/EXC-003-front-serveur-node.md)).
- Tout changement d'API impose de régénérer le contrat.
