# ADR 0008 — Reprise des données réelles de Circé dans la base de dev

- Statut : acceptée par l'utilisateur (24/11/2026) ; non conforme au référentiel, soumise au COTECH
- Sources : Q-437, Q-438, Q-445, Q-446 (TRANCHÉES), ECART-126, ECART-127, `docs/_travail/base-reelle-2026-11-24/`,
  `docs/PLAN_IMPLEMENTATION.md` (journal du 24/11/2026),
  [EXC-007](../exceptions/EXC-007-donnees-production-dans-le-depot.md)

## Contexte

Une copie de la base de qualification de Circé (07/07 au 07/10/2026) était disponible en conteneur local. Les JDD
fictifs ne reproduisaient pas le volume réel.

## Décision

- Q-437 : la copie sert de JDD de la base de dev (« le max possible ») ; données fictives là où l'import bloque, en
  respectant les règles métier.
- Q-438 : pas de pseudonymisation pour la base de dev locale ; CSV d'export hors dépôt.
- Procédé : `pnpm --filter @circe/api export:circe` (`SELECT` seuls) puis `import:circe` (rapport de rejets par règle,
  invariants contrôlés) ; JDD fictifs sans source réelle (Bus, J-3, non-conformités) sur des plateformes « … (JDD) ».
- Q-445 : à l'import seulement, acceptation des instructions dont les visuels totalisent 0 % ; la règle RG-COO-043 du
  service reste inchangée (ECART-127).
- Q-446 : la base de dev est versionnée (`apps/api/prisma/donnees/dev.sqlite.gz`) dans le dépôt public, sur décision
  explicite après signalement du risque.

## Conséquences

- Recette sur volume réel possible (≈ 388 000 faces de train) : 10 défauts de volume corrigés (ANO-065 à 074).
- Données personnelles publiées de façon irréversible ; contraire à DOC-024 et FIN-020 :
  [EXC-007](../exceptions/EXC-007-donnees-production-dans-le-depot.md), décision à prendre.
- Les tests automatisés restent sur la base de test et les JDD fictifs.
