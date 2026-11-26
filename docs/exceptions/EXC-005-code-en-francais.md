---
id: EXC-005
titre: Code (identifiants, commentaires, messages de commit) rédigé en français
exigences: [DOC-002]
decision: À DÉCIDER
auteur: Maître d'œuvre CIRCE V2 (à nommer)
date: 2026-11-26
echeance: À COMPLÉTER # à fixer selon la décision : dérogation durable ou plan de traduction
sources: [docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md §9, CONTRIBUTING.md]
---

# EXC-005 — Code en français

## Écart

DOC-002 (J2) demande un code rédigé en anglais : identifiants, commentaires et messages de commit. Le code de CIRCE V2
utilise des identifiants et commentaires français (`validerReception`, `receptionAttendue`, `quantite`,
`apps/api/src/modules/reception/validation.ts`…), et les messages de commit sont en français (au format Conventional
Commits).

## Justification

- Le domaine métier, les spécifications, les maquettes et le code historique sont en français ; les identifiants
  français réduisent les erreurs de traduction des concepts métier (affiche, dossier, réception attendue, UM, colis).
- Les identifiants de règles (`RG-REC-012`…) et les libellés destinés aux utilisateurs restent en français dans tous
  les cas.
- Le module Réception et le module Coordination sont gelés depuis le 19/11/2026 : leur renommage casserait le contrôle
  de gel (`node scripts/verifier-gel.mjs`).

La décision n'est pas prise : le présent fichier soumet le choix au COTECH.

## Alternatives étudiées

1. **Dérogation durable** : garder le code en français ; les messages de commit restent en français.
2. **Traduction progressive** : nouveaux modules et commentaires en anglais ; renommage des symboles internes au fil
   des évolutions ; contrats JSON publics et colonnes physiques conservés par des correspondances (mappings), toute
   rupture de contrat étant versionnée (`/v2`).
3. **Traduction complète immédiate** : coût élevé, risque de régression, rupture du gel ; non recommandée.

## Risques induits

- **Exploitabilité** : maintenance par une équipe non francophone plus difficile (option 1).
- **Coût** : renommage et revue (options 2 et 3) ; risque de régression sur les contrats publics.
- **Sécurité** : aucun.

## Mesures compensatoires

- Glossaire métier (`docs/_travail/synth/tra-fonc-2-glossaire.md`) et conventions de nommage documentées
  ([CONTRIBUTING.md](../../CONTRIBUTING.md)).
- Identifiants de règles stables dans le code et les tests.

## Durée et plan de retour à la conformité

- Option 1 : durée à fixer par le COTECH ; revue à la fin de garantie (J5).
- Option 2 : traduction des commentaires et nouveaux identifiants en anglais à partir de la décision ; renommage des
  symboles internes des modules gelés après levée du gel.

Décision : `[À COMPLÉTER : option retenue, nom, date]`.
