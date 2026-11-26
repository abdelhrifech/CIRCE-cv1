# Décisions d'architecture (ADR)

Chaque choix structurant fait l'objet d'un ADR : un fichier numéroté par décision, avec le contexte, la décision et ses
conséquences (MNT-031). Les ADR reprennent des décisions déjà prises dans le projet ; ils citent toujours leur source
(question `Q-nnn` de [QUESTIONS_OUVERTES.md](../QUESTIONS_OUVERTES.md), [AGENTS.md](../../AGENTS.md) ou document daté).
Un ADR ne crée ni ne modifie aucune règle métier.

## Index

| N° | Décision | Statut | Sources |
|---|---|---|---|
| [0001](0001-stack-monorepo-pnpm-react-fastify-zod.md) | Monorepo pnpm, React et TanStack, Fastify, Prisma, Zod, Node.js 24 LTS | Acceptée | MISSION §2, Q-338, Q-342 |
| [0002](0002-base-sqlite.md) | Base SQLite (fichier local) via Prisma | Acceptée en local ; dérogation demandée (EXC-001) | Q-343, Q-346, Q-311 |
| [0003](0003-identite-de-developpement.md) | Identité de développement signée HMAC | Hypothèse provisoire ; dérogation demandée (EXC-002) | Q-001 |
| [0004](0004-roles-provisoires.md) | Six rôles provisoires de la maquette | Hypothèse provisoire | Q-003, Q-136 |
| [0005](0005-administrateur-super-utilisateur.md) | Administrateur super-utilisateur | Hypothèse à valider | Q-421 |
| [0006](0006-api-v1-openapi-opentelemetry.md) | Routes `/v1`, contrats OpenAPI, OpenTelemetry et sondes | Acceptée | EVOLUTION_API_OBSERVABILITE_2026_11_12 |
| [0007](0007-conventions-erreurs-etats-verrou-idempotence.md) | Erreurs, machines d'états, transactions, verrou optimiste, idempotence | Acceptée | AGENTS.md §6, ECART-001, ECART-009, Q-308 |
| [0008](0008-reprise-donnees-reelles.md) | Reprise des données réelles dans la base de dev | Acceptée par l'utilisateur ; soumise au COTECH (EXC-007) | Q-437, Q-438, Q-445, Q-446 |
| [0009](0009-demarrage-npm-install-npm-start.md) | Démarrage local `npm install` puis `npm start` | Acceptée | Q-446, README.md |
| [0010](0010-gel-reception-coordination.md) | Gel des modules Réception et Coordination | Acceptée ; suite à décider | IMPLEMENTATION_MAQUETTE_NEW_2026_11_19 |

## Ajouter un ADR

1. Créer `<nnnn>-<objet>.md` avec le numéro suivant (jamais réutilisé).
2. Rubriques : statut et date, sources, contexte, décision, conséquences.
3. Une décision qui en remplace une autre crée un nouvel ADR ; l'ancien passe au statut « remplacée par nnnn ».
4. Une décision qui modifie l'architecture repasse par le jalon J1 (CAD-061) et met à jour le
   [dossier d'architecture](../architecture/README.md).
