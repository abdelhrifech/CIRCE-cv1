---
id: EXC-007
titre: Données réelles de Circé (non pseudonymisées) dans la base de dev versionnée et utilisées pour la recette
exigences: [DOC-024, FIN-020, CAD-022]
decision: À DÉCIDER
auteur: Maître d'œuvre CIRCE V2 (à nommer)
date: 2026-11-26
echeance: À COMPLÉTER # à fixer par le COTECH ; au plus tard la fin de garantie (J5, FIN-020)
sources: [Q-437, Q-438, Q-445, Q-446, ECART-126, docs/PLAN_IMPLEMENTATION.md (journal du 24/11/2026)]
---

# EXC-007 — Données de production dans le dépôt

## Écart

- **DOC-024** : les jeux de données de test ne doivent contenir aucune donnée de production. La base de dev versionnée
  `apps/api/prisma/donnees/dev.sqlite.gz` (copie compressée de `dev.db`, environ 38 Mo) contient les données reprises
  de la base de qualification de Circé (07/07 au 07/10/2026, semaines S28 à S41), non pseudonymisées : noms, logins,
  contacts, adresses. Elle est restaurée par `scripts/start.mjs` au premier démarrage.
- La recette du 24/11/2026 a porté sur ces données
  ([compte rendu](../acceptance/campaigns/2026-11-24-recette-donnees-reelles.md)).
- **FIN-020** : toute copie de données de Staging ou de production détenue par le maître d'œuvre doit être détruite à
  la fin de garantie ; la copie dans l'historique Git d'un dépôt public ne peut pas être détruite de façon certaine.
- **CAD-022** : les prototypes n'utilisent aucune donnée de production.

## Décisions de l'utilisateur à l'origine de l'écart

- Q-437 (TRANCHÉE, 24/11/2026) : la copie de la base sert de JDD de la base de dev.
- Q-438 (TRANCHÉE, 24/11/2026) : « oublie le standard DOC-024 » : pas de pseudonymisation pour la base de dev locale ;
  les CSV d'export restent hors dépôt.
- Q-445 (TRANCHÉE, 24/11/2026) : à l'import, acceptation des instructions dont les visuels totalisent 0 % (ECART-127).
- Q-446 (TRANCHÉE, 24/11/2026) : la base de dev est versionnée et poussée sur le dépôt GitHub public
  `abdelhrifech/CIRCE-cv1`, après signalement du risque de publication irréversible.

Ces décisions internes ne valent pas dérogation Cityz Media. Le présent fichier soumet la situation au COTECH ; aucune
décision n'est présumée.

## Justification avancée

Permettre à un clone neuf de démarrer avec `npm install` puis `npm start` sur un volume réel (environ 388 000 faces de
train), et recetter les performances sur ce volume (10 défauts de volume corrigés, ANO-065 à ANO-074).

## Alternatives étudiées

1. Dépôt privé puis base poussée (option (i) de Q-446).
2. Base pseudonymisée (option (ii)).
3. JDD fictifs seulement, éventuellement générés au volume réel par `pnpm jdd --volume=<n>` (option (iii)).
4. Base réelle sur le dépôt public (option (iv), retenue par l'utilisateur).

## Risques induits

- **Sécurité et conformité** : exposition publique de données personnelles et métier ; publication irréversible
  (historique Git, copies, forks). Risque au regard du RGPD à évaluer par Cityz Media.
- **Exploitabilité** : aucun.
- **Coût** : purge de l'historique et rotation éventuelle si la décision est de retirer les données.

## Mesures compensatoires possibles

- Les CSV d'export restent hors dépôt ; l'export n'exécute que des `SELECT` (`apps/api/scripts/export-circe.ts`).
- Les JDD fictifs (Bus, J-3, non-conformités) sont placés sur des plateformes distinctes « … (JDD) ».
- À décider : rendre le dépôt privé, retirer `dev.sqlite.gz` et purger l'historique, remplacer par une base pseudonymisée
  ou par un JDD fictif de même volume.

## Durée et plan de retour à la conformité

1. Décision du COTECH sur la situation actuelle : `[À COMPLÉTER : décision, nom, date]`.
2. Si retrait : remplacer la base livrée par un JDD fictif de volume comparable, purger l'historique, notifier les
   détenteurs de copies.
3. Au plus tard à J5 : destruction des copies détenues et attestation écrite (FIN-020, FIN-021).
