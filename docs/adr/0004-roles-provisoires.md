# ADR 0004 — Six rôles provisoires issus de la maquette

- Statut : acceptée comme hypothèse provisoire (04/11/2026)
- Sources : Q-003 (HYPOTHÈSE PRISE), Q-136, [AGENTS.md](../../AGENTS.md) §8,
  `docs/specifications/ANALYSE_FONCTIONNELLE_COMPLETE.md` §1

## Contexte

Le code historique n'a aucun rôle nommé exploité : le profil d'un utilisateur est la somme de ses droits de menu
(`tr_utilisateur_menu`, 27 valeurs) et de son périmètre (`tr_utilisateur_data`). La maquette cible définit six rôles.

## Décision

Profils provisoires = les six rôles de la maquette : `coord` (coordination), `cheq` (chef d'équipe), `recep`
(réception), `expe` (expédition), `admin` (administration), `com` (commerce), mappés sur les droits historiques. Les
droits sont un catalogue de permissions côté serveur (`apps/api/src/core/permissions/`) ; le périmètre est la liste des
plateformes de l'utilisateur.

## Conséquences

- Les tests de permissions (autorisé et refusé) sont écrits sur ces six rôles et seront à refaire si l'équipe retient
  d'autres profils.
- Les profils du SSO cible devront être mis en correspondance avec ces rôles (voir
  [ADR 0003](0003-identite-de-developpement.md)).
- Le modèle d'autorisation versionné (`apps/api/authz/modele.fga`, `relations-roles.json`) est généré depuis ce
  catalogue.
