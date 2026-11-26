# ADR 0005 — Administrateur super-utilisateur

- Statut : acceptée comme hypothèse, à valider (06/11/2026)
- Sources : Q-421 (HYPOTHÈSE PRISE, consigne explicite de l'utilisateur du 06/11/2026), Q-136, Q-201, Q-286,
  `apps/api/src/core/permissions/permissions.ts`, `docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md` §4

## Contexte

Les matrices de droits des règles refusent à l'administrateur certaines actions opérationnelles (contrôle de palette
réservé à `recep`, dispatch, bagues et colis à `cheq`…). L'utilisateur a demandé que l'administrateur ait tous les droits
possibles.

## Décision

Le rôle `admin` reçoit toutes les permissions du catalogue côté serveur, donc tous les menus. Le périmètre site et
atelier ainsi que les règles d'état, de quantité et de validation restent appliqués : l'accès global ne rend pas valide
une opération métier invalide.

## Conséquences

- Point à confirmer avec le métier : l'administrateur peut-il accomplir les actions opérationnelles, et avec quel acteur
  journalisé ?
- Le modèle d'autorisation cible (service central) doit représenter cette relation globale, avec contrôle côté serveur.
- Les centres métier (Wissous, Nîmes, Nanterre) restent des périmètres métier et non des tenants techniques.
