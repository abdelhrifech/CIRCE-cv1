# Registre des dérogations

Une dérogation approuvée doit précéder tout écart à une exigence de niveau DOIT ou NE DOIT PAS du référentiel Cityz Media
« Cadre de développement des applications métiers » (0.2.0-pre, version de travail non contractuelle) (CAD-100).
Chaque dérogation est un fichier Markdown de ce répertoire (CAD-101) :

- en-tête YAML : `exigences`, `decision`, `auteur`, `date`, `echeance` ;
- corps : écart, justification, alternatives étudiées, risques induits (sécurité, exploitabilité, coût), mesures
  compensatoires, durée de validité et plan de retour à la conformité (section 8.2 du cadre).

Valeurs de `decision` : `DEMANDÉE` (soumise au COTECH), `À DÉCIDER` (choix non arrêté par le maître d'œuvre ou
l'utilisateur, soumis pour arbitrage), `APPROUVÉE`, `REFUSÉE`, `LEVÉE`. Le COTECH, présidé par le Responsable Cloud &
Infrastructure, instruit les demandes (section 8.3). Une dérogation est accordée pour une durée limitée et réexaminée à
son échéance (section 8.4).

**État au 26/11/2026 : aucune dérogation n'est approuvée.** Les décisions internes du projet (questions tranchées
`Q-nnn`) ne valent pas dérogation Cityz Media. Ce répertoire doit être protégé par une règle CODEOWNERS imposant
l'approbation de Cityz Media (CAD-102) : règle absente à ce jour (voir [EXC-004](EXC-004-conteneurs-ci-gitops.md)).

## Registre

| Id | Objet | Exigences | Décision | Échéance | Origine |
|---|---|---|---|---|---|
| [EXC-001](EXC-001-sqlite.md) | SQLite au lieu de PostgreSQL ; photos en base au lieu de l'Object Storage | DON-001, DON-003, DON-020 à 022, DON-040 | DEMANDÉE | À COMPLÉTER | Q-343, Q-311 |
| [EXC-002](EXC-002-identite-developpement.md) | Identité de développement (en-tête signé HMAC) au lieu du SSO et des jetons Bearer | SEC-010 à 013 | DEMANDÉE | À COMPLÉTER | Q-001 |
| [EXC-003](EXC-003-front-serveur-node.md) | Front servi par un serveur Node (TanStack Start / Nitro) avec relais `/api`, sans CSP | STK-002, STK-030 à 035, SEC-040 à 043 | DEMANDÉE | À COMPLÉTER | AGENTS.md §3 |
| [EXC-004](EXC-004-conteneurs-ci-gitops.md) | Pas d'images, de CI imposée, de CODEOWNERS ni d'entrées GitOps | STK-020 à 035 (sauf STK-024, sans objet), SEC-060 à 062, CIC-001 à 065 (sauf CIC-007), CAD-031, CAD-080 | DEMANDÉE | À COMPLÉTER | Q-343 |
| [EXC-005](EXC-005-code-en-francais.md) | Code (identifiants, commentaires, commits) en français | DOC-002 | À DÉCIDER | À COMPLÉTER | Audit 0.2.0-pre §9 |
| [EXC-006](EXC-006-etat-local-ordonnanceur.md) | État local et ordonnanceur interne ; composants hors périmètre (tâches planifiées, Broadcast, mails) | PLT-060, PLT-061, CAD-001 | DEMANDÉE | À COMPLÉTER | Q-343, Q-410, Q-005 |
| [EXC-007](EXC-007-donnees-production-dans-le-depot.md) | Données réelles non pseudonymisées dans la base de dev versionnée et dans la recette | DOC-024, FIN-020, CAD-022 | À DÉCIDER | À COMPLÉTER | Q-437, Q-438, Q-445, Q-446 |

## Ajouter une dérogation

1. Créer `EXC-<nnn>-<objet>.md` (numéro suivant, jamais réutilisé) à partir d'un fichier existant.
2. Renseigner l'en-tête YAML et toutes les rubriques du corps.
3. Ajouter la ligne au registre ci-dessus et la citer dans la rubrique Dérogations du
   [dossier d'architecture](../architecture/README.md).
4. Soumettre par pull request ; Cityz Media approuve après validation du COTECH.
