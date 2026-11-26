# ADR 0010 — Gel des modules Réception et Coordination

- Statut : acceptée (19/11/2026, consigne explicite de l'utilisateur)
- Sources : `docs/IMPLEMENTATION_MAQUETTE_NEW_2026_11_19.md`, `scripts/verifier-gel.mjs`,
  `ressources/gel/GEL_RECEPTION_COORDINATION_2026_11_19.json`, `docs/PLAN_IMPLEMENTATION.md` (journaux du 20 au 24/11/2026)

## Contexte

Après la livraison de la maquette du 16/11/2026, l'utilisateur a demandé de ne plus modifier les routes, composants,
services et contrats Réception et Coordination ni les composants d'interface partagés, pendant les travaux sur les autres
modules.

## Décision

- Empreintes SHA-256 des fichiers gelés dans `ressources/gel/GEL_RECEPTION_COORDINATION_2026_11_19.json` (déplacé
  depuis `docs/` le 26/11/2026, contenu identique).
- Contrôle : `node scripts/verifier-gel.mjs` (code de sortie 1 et liste des fichiers modifiés si le gel n'est pas
  respecté).

## Conséquences

- Les évolutions qui toucheraient ces moteurs sont reportées ou tracées en écart (par exemple le stockage des photos,
  [EXC-001](../exceptions/EXC-001-sqlite.md), et la traduction du code, [EXC-005](../exceptions/EXC-005-code-en-francais.md)).
- Au 26/11/2026, `node scripts/verifier-gel.mjs` signale 16 fichiers différents des empreintes du 19/11 ; la reprise de
  la référence `circe-tested` du 24/11/2026 (34 fichiers repris) en est la cause probable, à confirmer. Le maintien, la mise à jour des empreintes ou la levée du gel est à décider : `[À COMPLÉTER]`.
