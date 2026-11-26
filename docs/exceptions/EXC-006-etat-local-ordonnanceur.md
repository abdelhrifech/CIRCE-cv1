---
id: EXC-006
titre: État local (fichier SQLite) et ordonnanceur interne dans le processus de l'API
exigences: [PLT-060, PLT-061, CAD-001]
decision: DEMANDÉE
auteur: Maître d'œuvre CIRCE V2 (à nommer)
date: 2026-11-26
echeance: À COMPLÉTER # fixée par le COTECH ; proposition : avec la bascule PostgreSQL (EXC-001)
sources: [Q-343, Q-410, Q-005, docs/AUDIT_STANDARDS_CITYZ_0_2_0_PRE.md §6]
---

# EXC-006 — État local et ordonnanceur interne

## Écart

- **PLT-060** : l'API n'est pas sans état : l'état persistant est un fichier SQLite local (`apps/api/prisma/dev.db`),
  non porté par un service de données du catalogue.
- **PLT-061** : plusieurs réplicas ne peuvent pas partager ce fichier ; l'exécution simultanée de plusieurs réplicas
  n'est pas supportée en l'état.
- **CAD-001** : des composants relevant du hors périmètre du cadre (tâches planifiées, intégrations entre systèmes)
  existent dans l'API et doivent être identifiés :
  - ordonnanceur interne des traitements planifiés (D-20, Q-410), démarré dans le processus de l'API si
    `ORDONNANCEUR_ACTIF=true` (`apps/api/src/server-runtime.ts`, `apps/api/src/modules/taches/service.ts`) :
    fin de journée des colis (RG-COO-269), purge des réceptions attendues (RG-REC-180), Instruction OK automatique de
    rattrapage (RG-COO-042) ; horaires vides = aucune exécution ; commande `pnpm --filter @circe/api taches:executer` ;
  - planificateur d'intégration Broadcast (RG-COO-103), qui ne démarre qu'avec une source Broadcast configurée ;
    aucune source réelle à ce jour (Q-005, `BroadcastNonConfigure`) ;
  - envoi de mails (D-19, Q-409) : boîte de développement par défaut, SMTP seulement si configuré
    (`apps/api/src/core/ports/mail.ts`, `apps/api/src/modules/mails/`).

## Justification

Choix de SQLite (Q-343) et besoin métier de traitements planifiés (RG-COO-269, RG-REC-180, RG-COO-042) sans
infrastructure dédiée. Le cadre exclut les tâches planifiées et intégrations de son périmètre (§2.2) : elles doivent
être identifiées et cadrées avec Cityz Media, sans obligation imposée de les réécrire.

## Alternatives étudiées

1. CronJobs Kubernetes appelant la commande `taches:executer` : possible dans la cible, à cadrer avec Cityz Media.
2. Ordonnanceur interne conservé avec PostgreSQL : le verrou persisté (`tache_execution.verrou` UNIQUE) empêche déjà
   une double exécution ; à vérifier en multi-réplicas sur PostgreSQL.
3. Service d'intégration externe pour Broadcast : dépend des contrats Broadcast, non fournis.

## Risques induits

- **Exploitabilité** : un seul réplica possible tant que l'état est local ; pas de remplacement de nœud sans perte du
  fichier si le volume n'est pas persistant.
- **Sécurité** : faible.
- **Coût** : adaptation lors de la bascule PostgreSQL ; décision sur le mode d'ordonnancement.

## Mesures compensatoires

- Verrou anti double exécution persisté et libération des verrous périmés (`apps/api/src/modules/taches/service.ts`).
- Ordonnanceur désactivable (`ORDONNANCEUR_ACTIF=false`) et sans effet sans horaire configuré.
- Arrêt propre sur SIGTERM : sondes non prêtes, arrêt de l'ordonnanceur et du planificateur, fermeture de la base.
- Mails en mode développement par défaut : aucun envoi réel sans configuration explicite.

## Durée et plan de retour à la conformité

1. Bascule PostgreSQL ([EXC-001](EXC-001-sqlite.md)) : l'API devient sans état.
2. Tests multi-réplicas des tâches planifiées (verrou) et du drainage à l'arrêt.
3. Décider avec Cityz Media : ordonnanceur interne avec verrou, ou CronJob ; cadrer Broadcast et SMTP (flux sortants,
   [architecture](../architecture/README.md), rubriques Périmètre et Réseau).
