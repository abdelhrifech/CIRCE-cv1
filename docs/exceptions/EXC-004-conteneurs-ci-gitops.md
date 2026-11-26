---
id: EXC-004
titre: Absence d'images de conteneur, de chaîne CI imposée et d'entrées GitOps
exigences: [STK-020, STK-021, STK-022, STK-023, STK-030, STK-031, STK-032, STK-033, STK-034, STK-035, SEC-060, SEC-061, SEC-062, CIC-001, CIC-003, CIC-004, CIC-005, CIC-006, CIC-010, CIC-011, CIC-012, CIC-013, CIC-014, CIC-015, CIC-016, CIC-020, CIC-021, CIC-022, CIC-023, CIC-030, CIC-031, CIC-032, CIC-033, CIC-040, CIC-041, CIC-050, CIC-051, CIC-060, CIC-061, CIC-062, CIC-063, CIC-064, CIC-065, CAD-031, CAD-080]
decision: DEMANDÉE
auteur: Maître d'œuvre CIRCE V2 (à nommer)
date: 2026-11-26
echeance: À COMPLÉTER # fixée par le COTECH ; proposition : dès la création des dépôts par Cityz Media
sources: [Q-343, docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md §6 et §8]
---

# EXC-004 — Conteneurs, CI et GitOps

L'en-tête liste toutes les exigences des plages STK-020 à 035, SEC-060 à 062 et CIC-001 à 065 du référentiel
0.2.0-pre, sauf CIC-007 (instructions des agents dans le seul `AGENTS.md`), satisfaite, et STK-024 (choix d'image .NET
chiseled), sans objet pour une application Node.js.

## Écart

- Aucun Dockerfile, image multi-étapes, image de base imposée, ni `.dockerignore` (STK-020 à 035) ; aucun test de
  fonctionnement sous utilisateur non root, racine en lecture seule et profil restricted (SEC-060 à 062).
- Dépôt applicatif personnel (`abdelhrifech/CIRCE-cv1`), non créé par Cityz Media (CIC-001) ; pas de fichier
  `CODEOWNERS` imposant l'approbation de Cityz Media (CIC-004) ; aucun dépôt GitOps ni protection associée (CIC-005,
  CIC-006, CIC-051) ; pas de fichier `VERSION`, manifestes en `0.0.0` (CIC-010) ; pas d'appel au workflow réutilisable
  de Cityz Media ni de jobs de PR (typage, tests, lint, Conventional Commits) ; pas de SBOM ni de scans.
- Aucun artefact produit par la CI de Cityz Media (CAD-031) ni déploiement par le processus GitOps (CAD-080) : aucun
  environnement Staging ni production n'est utilisé.
- Présent : `.github/dependabot.yml` (MNT-022), `.devcontainer/` (MNT-033), contrôle local des messages de commit
  (`pnpm commits:check`).

## Justification

Q-343 (TRANCHÉE, 04/11/2026) : développement sans Docker. Les dépôts, le workflow imposé, le registre, le tenant et le
dépôt GitOps relèvent de Cityz Media et n'ont pas été fournis. Le référentiel interdit d'inventer le workflow de
publication ou de créer un dépôt dans l'organisation (CIC-001, CIC-051).

## Alternatives étudiées

1. Écrire un pipeline de publication personnel : interdit (seul le workflow fourni produit les images déployables).
2. Préparer dès maintenant Dockerfiles et jobs de PR sans le workflow imposé : possible pour les jobs de PR et les
   Dockerfiles, à faire dans le dépôt fourni par Cityz Media.

## Risques induits

- **Sécurité** : aucune analyse SAST, de secrets, d'images ou de licences par la chaîne imposée ; aucune preuve de
  licence (STK-040/041).
- **Exploitabilité** : aucune promotion traçable d'un build entre environnements.
- **Coût** : mise en place après réception des dépôts ; adaptation à la racine en lecture seule (base SQLite
  incompatible, voir [EXC-001](EXC-001-sqlite.md) et [EXC-006](EXC-006-etat-local-ordonnanceur.md)).

## Mesures compensatoires

- Vérifications locales reproductibles : `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:int`, `pnpm test:e2e`,
  `pnpm api:contract:check`.
- Lockfile `pnpm-lock.yaml` et version de pnpm épinglée (`packageManager`).
- Environnement reproductible `.devcontainer/`.

## Durée et plan de retour à la conformité

1. Obtenir les dépôts applicatif et GitOps, l'organisation et les accès (CIC-001, CAD-080).
2. Ajouter `CODEOWNERS` (architecture, exceptions, jalons, spécifications, recette, sécurité, workflow), `VERSION`,
   jobs de PR et appel au workflow réutilisable.
3. Dockerfiles API (Node.js distroless) et front (Caddy), `.dockerignore`, tests sous profil restricted.
4. Renseigner les seules entrées des overlays GitOps (CIC-051).
5. Obtenir SBOM et résultats de scans ; traiter les constats.
