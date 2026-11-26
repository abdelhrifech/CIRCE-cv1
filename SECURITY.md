# Politique de sécurité de CIRCE V2

Procédure de signalement d'une vulnérabilité (MNT-035). Les modifications de ce fichier sont soumises à l'approbation de
Cityz Media (CIC-004).

## Signaler une vulnérabilité

Ne publiez **jamais** une vulnérabilité dans une issue, une pull request, un commit ou un canal public.

Signalez-la de façon privée :

1. par l'alerte de sécurité privée du dépôt (GitHub › Security › Report a vulnerability), si elle est activée ;
2. sinon par courriel aux deux contacts ci-dessous.

| Rôle                                | Nom           | Contact       |
| ----------------------------------- | ------------- | ------------- |
| Référent projet (Cityz Media)       | [À COMPLÉTER] | [À COMPLÉTER] |
| Référent technique (maître d'œuvre) | [À COMPLÉTER] | [À COMPLÉTER] |

## Informations attendues

- Composant concerné (`apps/web`, `apps/api`, `packages/shared`, chaîne de livraison) et version ou commit.
- Description de la vulnérabilité et impact estimé (confidentialité, intégrité, disponibilité).
- Étapes de reproduction, sans données de production ni secret réel.
- Correctif ou contournement envisagé, le cas échéant.

## Traitement

1. Accusé de réception au signalant.
2. Qualification de la sévérité (critique, haute, moyenne, faible) par le référent technique, avec Cityz Media.
3. Correction sur une branche dédiée, revue, puis mise en production dans le délai fixé par le contrat selon la sévérité
   (SEC-004).
4. Information du signalant et, si nécessaire, rotation des secrets concernés par Cityz Media.

Tout secret publié dans un dépôt de l'application, même supprimé depuis, est signalé à Cityz Media dès sa détection
(SEC-003).
