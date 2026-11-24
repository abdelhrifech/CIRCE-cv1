# Correction des erreurs de pages avec la base hybride — 23 novembre 2026

## Problème corrigé

« Analyse Production » retournait HTTP 500 avec `RangeError: Maximum call stack size exceeded` dans `apps/api/src/core/paquets.ts`.

Les requêtes limitent leurs identifiants à 400 par lot, mais un lot d’ateliers peut renvoyer plusieurs centaines de milliers de faces. L’ancienne instruction `res.push(...lignes)` convertissait tous ces résultats en arguments d’un seul appel JavaScript, dépassant la limite du moteur.

La concaténation passe maintenant par une boucle. Toutes les lignes sont conservées, dans le même ordre, sans changement des lots, des requêtes, des filtres, des permissions, des calculs ou des transitions métier. Aucun plafonnement ni échantillonnage ne masque le volume réel.

## Fichiers

- `apps/api/src/core/paquets.ts` : correction technique minimale de l’utilitaire partagé.
- `apps/api/src/core/paquets.test.ts` : trois tests de régression, dont un lot retournant 200 001 lignes, suivi d’un autre lot ; vérification des références, de l’ordre, des doublons et du cas vide.

Aucun fichier Réception/Coordination ni aucun modèle Prisma existant n’est modifié. Les données de recette et Docker ne sont pas corrigées pour contourner les erreurs.

## Vérifications

- TypeScript : contrôles du projet réussis.
- Lint et formatage : réussis après correction de la forme des mocks du nouveau test.
- Tests unitaires du monorepo : **357 réussis**, dont les trois nouveaux tests de régression.
- Intégration ciblée : **37 réussis** sur cinq fichiers Pilotage, Stocks et Administration, exclusivement sur `test.db`.
- Build API et web : réussi. Les avertissements de directives `use client` de dépendances Radix restent présents ; ils ne font pas échouer le build.
- Gel historique : 152 fichiers inchangés ; gel de mission : 228 fichiers et 95 blocs Prisma inchangés.
- Lecture manuelle de **16 endpoints distincts**, en 17 requêtes avec deux périodes d’Analyse : HTTP 200. Périmètre : administration Fin de campagne, statuts, machines, configurations ateliers, transport, boucles, distributions, journal ; Analyse et Suivi Pilotage ; colis et départs Transport ; référentiel et lignes Bus ; NC ; Stocks filtrés.
- Analyse historique, Nîmes, du 01/10/2026 au 08/10/2026 : l’API renvoie **3 932 trains** sans filtrer d’atelier. Vérification navigateur sur l’atelier « 2m2 Déroulant » : **2 341 trains et 19 rouleurs**, sans erreur serveur.
- Administration / Fin de campagne : formulaire chargé dans le navigateur, sans soumettre de modification des paramètres.

Les vérifications manuelles du serveur actif sont des lectures. Les tests qui écrivent utilisent uniquement la base de test dédiée. La suite E2E automatisée complète n’est pas rejouée ; les deux pages concernées sont contrôlées visuellement sur la base hybride réelle.

## Captures privées

- Analyse corrigée : `/Users/hrifech/Documents/ChatGPT/CIRCE-CLAUDE-GV1/reprise-circe-20261123/captures/analyse-production-corrigee.jpg`.
- Fin de campagne vérifiée : `/Users/hrifech/Documents/ChatGPT/CIRCE-CLAUDE-GV1/reprise-circe-20261123/captures/admin-fin-campagne-verifiee.jpg`.

## Limites maintenues

La correction traite le dépassement de pile dû au volume des résultats. Elle ne change aucune règle métier. Les écarts de données de la reprise hybride et les lenteurs déjà documentées sur certaines lectures globales restent à traiter dans leur périmètre propre. Aucun module gelé ni aucune validation ne sont contournés.
