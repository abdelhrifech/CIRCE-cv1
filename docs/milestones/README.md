# Comptes rendus de jalons

Le maître d'œuvre verse ici un compte rendu pour chaque jalon franchi (CAD-090) : un pour chacun des jalons J1, J4 et
J5, un par nouvelle version pour J2 et J3. Nom du fichier : `J<n>.md` ou `J<n>-<version>.md`.

Chaque compte rendu contient :

- la checklist du jalon renseignée (exigences du cadre et des annexes portant ce jalon, section 7.2 du cadre) ;
- les réserves éventuelles ;
- la décision de chaque partie qui valide, avec son nom et la date.

Il est soumis par pull request ; son approbation par Cityz Media, imposée par la règle CODEOWNERS du répertoire
(CIC-004), prononce le jalon. **La règle CODEOWNERS n'existe pas encore** (voir
[EXC-004](../exceptions/EXC-004-conteneurs-ci-gitops.md)).

| Jalon | Objet | Validation consignée | Fichier | État au 26/11/2026 |
|---|---|---|---|---|
| J1 | Onboarding et cadrage : architecture validée | Cityz Media, après approbation du dossier d'architecture | [J1.md](J1.md) | Modèle renseigné, non soumis, non prononcé |
| J2 | Recette | Recette technique Cityz Media, renvoi au compte rendu de campagne portant la décision du Responsable Métier (DOC-025) | `J2-<version>.md` | Non commencé |
| J3 | Mise en production | Cityz Media, au vu de la mise en production de la version | `J3-<version>.md` | Non commencé |
| J4 | Reprise de l'application | Cityz Media | `J4.md` | Non commencé ; sessions de transfert prévues : [../knowledge-transfer/](../knowledge-transfer/README.md) |
| J5 | Fin de garantie | Cityz Media (annexe H) | `J5.md` | Non commencé ; anomalies connues : [../operations/known-issues.md](../operations/known-issues.md) |

Légende des états utilisés dans les checklists : **Conforme** (preuve dans le dépôt), **Partiel** (base existante
insuffisante), **Écart** (non satisfait, sans dérogation propre), **Dérogation EXC-nnn** (écart couvert par une demande
de dérogation, non encore approuvée), **Sans objet** (justifié), **À COMPLÉTER** (information détenue par Cityz Media ou
le maître d'œuvre, absente du dépôt).

Remarque : CIRCE V2 a été développé avant toute validation du dossier d'architecture (écart à CAD-022, voir
[J1.md](J1.md)). Le jalon J1 est donc présenté a posteriori, sur l'architecture cible.
