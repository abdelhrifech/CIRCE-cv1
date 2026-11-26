# Matrice de traçabilité exigences ↔ cas de test

Cette matrice est générée à partir des cas de test de `docs/acceptance/test-cases/` (DOC-023). Elle relie chaque
exigence (`EX-`), règle (`RG-`) ou écran (`ECR-`) cité par un cas au(x) cas qui le couvrent et aux tests automatisés
associés. Elle ne remplace pas la matrice complète exigence → code → tests,
[`docs/MATRICE_TRACABILITE_SPECIFICATIONS.md`](../MATRICE_TRACABILITE_SPECIFICATIONS.md), qui reste la référence des
statuts (FAIT, PARTIEL, BLOQUÉ, NON REPRIS) ; la colonne « Statut » ci-dessous en est une copie à la date de génération.

Régénération : après modification d'un cas, relancer le générateur utilisé pour produire ces fichiers (script hors dépôt
qui relit les cas, la matrice et les titres des tests) ou mettre à jour la ligne à la main ; vérifier que chaque
identifiant cité existe dans `docs/specifications/` ou dans la matrice (`grep -rn "<ID>" docs/specifications docs/MATRICE_TRACABILITE_SPECIFICATIONS.md`).

Génération du 2026-11-26 : 25 fichiers de cas, 111 cas, 259 identifiants couverts.

## Synthèse par parcours

| Fichier | Parcours | Cas | Identifiants cités |
|---|---|---|---|
| [TC-REC-P01](test-cases/TC-REC-P01.md) | Socle Réception : entités, droits, traçabilité, historique, concurrence | 4 | 12 |
| [TC-REC-P02](test-cases/TC-REC-P02.md) | Réceptions attendues : recherche, filtres, reçu / attendu / reste, statut de ligne | 5 | 11 |
| [TC-REC-P03](test-cases/TC-REC-P03.md) | Panier et saisie du bon de livraison : photo, lecture du BL, contrôles de saisie | 5 | 12 |
| [TC-REC-P04](test-cases/TC-REC-P04.md) | Valider la réception : création de la réception « À contrôler », affiches, mouvements | 4 | 11 |
| [TC-REC-P05](test-cases/TC-REC-P05.md) | Sas et contrôle de la palette : comptage, écarts, rebut, emplacement, validation du contrôle | 5 | 16 |
| [TC-REC-P06](test-cases/TC-REC-P06.md) | Feuille de stock (étiquette rack) et impressions | 4 | 11 |
| [TC-REC-P07](test-cases/TC-REC-P07.md) | Réceptions inconnues : création, identification, rattachement, signalement | 5 | 19 |
| [TC-REC-P08](test-cases/TC-REC-P08.md) | Liste des affiches et fiche de l'affiche : filtres, tags, rattachements, thème, conservation | 5 | 18 |
| [TC-REC-P09](test-cases/TC-REC-P09.md) | Rebut, mouvements manuels de stock et fonctions legacy sans écran cible | 4 | 6 |
| [TC-REC-P10](test-cases/TC-REC-P10.md) | Alertes Réception, paramètres, référentiels, dashboard et interfaces de retour | 5 | 11 |
| [TC-COO-P01](test-cases/TC-COO-P01.md) | Socle Coordination : droits, périmètre, statuts d'instruction, intégration, historique | 4 | 7 |
| [TC-COO-P02](test-cases/TC-COO-P02.md) | Liste des instructions et Instruction OK (automatique, manuelle), écart Broadcast, correction | 5 | 12 |
| [TC-COO-P03](test-cases/TC-COO-P03.md) | Validation admin : proposition de rattachement, cas sûrs, affiches à doute | 4 | 12 |
| [TC-COO-P04](test-cases/TC-COO-P04.md) | Validation admin : confirmer, valider en lot, annuler, effets et traçabilité | 5 | 12 |
| [TC-COO-P05](test-cases/TC-COO-P05.md) | Lignes attendues : règles de vie, rapprochement, provisoire, annulation, sources | 4 | 8 |
| [TC-COO-P06](test-cases/TC-COO-P06.md) | Intégration Broadcast : copie de l'état des réservations et flux | 4 | 6 |
| [TC-COO-P07](test-cases/TC-COO-P07.md) | Alertes Pré-Prod et vérification des thèmes | 5 | 8 |
| [TC-COO-P08](test-cases/TC-COO-P08.md) | Déblocage des préparations et « Rendre la main » | 3 | 5 |
| [TC-COO-P09](test-cases/TC-COO-P09.md) | Trains : identifiant, positions, faces, couverture, fractionnement, liste (ECR-COO-05) | 4 | 9 |
| [TC-COO-P10](test-cases/TC-COO-P10.md) | Export des trains et préparation du déroulant (suivi par thème, rouleur) | 5 | 14 |
| [TC-COO-P11](test-cases/TC-COO-P11.md) | Roulage : suivi 8 m², dispatch des rouleurs, bagues et étiquettes | 4 | 13 |
| [TC-COO-P12](test-cases/TC-COO-P12.md) | Préparation 2 m² fixe, pliage et bus : libération, rendre la main, comptage, quantités à encoller | 5 | 12 |
| [TC-COO-P13](test-cases/TC-COO-P13.md) | Unités de manutention, colis, expédition et intégration AMT | 4 | 11 |
| [TC-TRA](test-cases/TC-TRA.md) | Transverse : coque de navigation, profil, erreurs normalisées, santé de l'API | 4 | 3 |
| [TC-NEW](test-cases/TC-NEW.md) | Nouvelles spécifications du 12/11/2026 et maquette du 16-20/11 : Bus, non-conformités, pilotage, stocks, administration | 5 | 11 |

## Exigences et règles → cas de test

| Identifiant | Statut (matrice) | Cas de test | Tests automatisés |
|---|---|---|---|
| ECR-ADM-04 | PARTIEL | TC-REC-P10-04 | `api/test/admin/regles-alerte.int.test.ts`, `e2e/admin-lot3.spec.ts` |
| ECR-ADM-05 | PARTIEL | TC-REC-P10-02 | `api/test/reception/stock-alertes-admin.int.test.ts`, `e2e/admin-parametres.spec.ts` |
| ECR-ADM-07 | PARTIEL | TC-REC-P10-03 | `api/test/admin/referentiels-reception.int.test.ts`, `e2e/admin-lot3.spec.ts` |
| ECR-COO-01 | PARTIEL | TC-COO-P03-02 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts` |
| ECR-COO-02 | PARTIEL | TC-COO-P02-02, TC-COO-P07-02 | `api/test/coordination/instruction-ok.int.test.ts`, `e2e/coordination-alertes.spec.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| ECR-COO-03 | FAIT | TC-COO-P03-04 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts` |
| ECR-COO-04 | PARTIEL | TC-COO-P02-04 | `api/test/coordination/instruction-ok-complement.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| ECR-COO-05 | PARTIEL | TC-COO-P09-01 | `api/test/coordination/trains.int.test.ts`, `e2e/coordination-trains.spec.ts` |
| ECR-COO-06 | PARTIEL | TC-COO-P10-03 | `e2e/coordination-export-trains.spec.ts` |
| ECR-COO-07 | PARTIEL | TC-COO-P10-04 | `api/test/coordination/export-trains.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| ECR-COO-08 | PARTIEL | TC-COO-P11-04 | `api/test/coordination/roulage-8m2-rouleurs.int.test.ts`, `e2e/roulage.spec.ts` |
| ECR-COO-09 | PARTIEL | TC-COO-P12-01 | `api/test/coordination/unitaire.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| ECR-COO-10 | FAIT | TC-COO-P11-01 | `api/test/coordination/roulage-dispatch.int.test.ts`, `e2e/roulage.spec.ts` |
| ECR-COO-11 | PARTIEL | TC-COO-P11-03 | `api/test/coordination/roulage-bagues.int.test.ts`, `e2e/roulage.spec.ts` |
| ECR-EXP-01 | PARTIEL | TC-COO-P13-02 | `api/test/coordination/colis.int.test.ts`, `e2e/roulage-expedition.spec.ts` |
| ECR-EXP-02 | PARTIEL | TC-COO-P13-04 | `api/test/coordination/expedition-departs-complement.int.test.ts`, `e2e/roulage-expedition.spec.ts` |
| ECR-EXP-03 | PARTIEL | TC-COO-P13-04 | `api/test/coordination/expedition-departs-complement.int.test.ts`, `e2e/roulage-expedition.spec.ts` |
| ECR-GEN-01 | PARTIEL | TC-COO-P10-05 | `api/test/coordination/suivi-generation.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| ECR-GEN-03 | PARTIEL | TC-COO-P10-05 | `api/test/coordination/suivi-generation.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| ECR-NAV-01 | PARTIEL | TC-TRA-01, TC-TRA-03 | `e2e/navigation.spec.ts`, `e2e/socle.spec.ts` |
| ECR-PIL-03 | PARTIEL | TC-COO-P05-02 | `e2e/coordination-etat-reservations.spec.ts` |
| ECR-REC-01 | PARTIEL | TC-REC-P02-01 | `api/test/reception/attendues.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| ECR-REC-02 | FAIT | TC-REC-P05-01 | `api/test/reception/controle.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| ECR-REC-03 | PARTIEL | TC-REC-P08-01 | `api/test/reception/affiches.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| ECR-REC-04 | PARTIEL | TC-REC-P07-02 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| ECR-REC-05 | FAIT | TC-REC-P08-02 | `api/test/reception/affiches.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| ECR-REC-08 | FAIT | TC-REC-P07-01 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| ECR-REC-09 | FAIT | TC-REC-P06-01 | `api/test/reception/impressions.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| ECR-REC-10 | PARTIEL | TC-REC-P06-03 | `api/test/reception/impressions.int.test.ts` |
| ECR-REC-12 | PARTIEL | TC-REC-P03-04 | `e2e/reception-panier.spec.ts` |
| ECR-THM-01 | PARTIEL | TC-COO-P07-03 | `api/test/coordination/alertes-preprod-complement.int.test.ts`, `e2e/coordination-alertes.spec.ts` |
| ECR-THM-03 | PARTIEL | TC-COO-P07-01 | `api/test/coordination/alertes-preprod.int.test.ts`, `e2e/coordination-alertes.spec.ts` |
| ECR-TRA-01 | PARTIEL | TC-REC-P10-01, TC-COO-P07-01 | `api/test/coordination/alertes-preprod.int.test.ts`, `api/test/reception/stock-alertes-admin.int.test.ts`, `e2e/coordination-alertes.spec.ts`, `e2e/reception-parcours.spec.ts` |
| EX-ADM-NEW-001 | PARTIEL : raccordement moteurs, machines/ateliers et ordonnancement | TC-NEW-05 | `api/test/stocks/fin-campagne.int.test.ts`, `e2e/admin-maquette-new.spec.ts` |
| EX-NEW-ADM-001 | Réalisé, voir précisions | TC-NEW-02 | `api/test/nonconformite/parcours.int.test.ts`, `e2e/admin-nouvelles-specs.spec.ts` |
| EX-NEW-BUS-001 | Réalisé, voir précisions | TC-NEW-03 | `api/test/bus/parcours.int.test.ts`, `e2e/admin-nouvelles-specs.spec.ts` |
| EX-NEW-NAV-001 | Réalisé, voir précisions | TC-NEW-03 | `api/test/bus/parcours.int.test.ts`, `e2e/admin-nouvelles-specs.spec.ts` |
| EX-NEW-NC-001 | Réalisé, voir précisions | TC-NEW-01 | `api/test/nonconformite/parcours.int.test.ts`, `e2e/admin-nouvelles-specs.spec.ts` |
| EX-NEW-PIL-001 | Réalisé, voir précisions | TC-NEW-04 | `api/test/pilotage/nouveautes.int.test.ts`, `e2e/admin-nouvelles-specs.spec.ts` |
| EX-PIL-NEW-001 | PARTIEL : activité/équipe et graphiques globaux | TC-NEW-05 | `api/test/stocks/fin-campagne.int.test.ts`, `e2e/admin-maquette-new.spec.ts` |
| EX-STK-NEW-001 | IMPLÉMENTÉ, limites de volume tracées | TC-NEW-05 | `api/test/stocks/fin-campagne.int.test.ts`, `e2e/admin-maquette-new.spec.ts` |
| EX-TRA-006 | PARTIEL | TC-TRA-02 | `api/test/me-sites.int.test.ts`, `e2e/navigation.spec.ts` |
| EX-TRA-008 | PARTIEL | TC-TRA-01 | `e2e/navigation.spec.ts` |
| RG-COO-005 | FAIT | TC-COO-P03-01 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/interactions.spec.ts` |
| RG-COO-006 | PARTIEL | TC-COO-P03-04 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts` |
| RG-COO-008 | FAIT | TC-COO-P04-01 | `api/test/coordination/effets-validation.int.test.ts`, `e2e/coordination-effets-validation.spec.ts` |
| RG-COO-009 | FAIT | TC-COO-P04-03 | `api/test/coordination/effets-validation.int.test.ts`, `api/test/coordination/validation-admin.int.test.ts` |
| RG-COO-011 | FAIT | TC-COO-P03-02 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts` |
| RG-COO-012 | FAIT | TC-COO-P03-04 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts` |
| RG-COO-013 | FAIT | TC-COO-P03-03 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts` |
| RG-COO-014 | FAIT | TC-COO-P04-01 | `api/test/coordination/effets-validation.int.test.ts`, `e2e/coordination-effets-validation.spec.ts` |
| RG-COO-015 | PARTIEL | TC-COO-P04-01 | `api/test/coordination/effets-validation.int.test.ts`, `e2e/coordination-effets-validation.spec.ts` |
| RG-COO-017 | FAIT | TC-REC-P07-04, TC-COO-P04-05 | `api/test/coordination/effets-validation-complement.int.test.ts`, `api/test/reception/inconnues.int.test.ts`, `e2e/coordination-effets-validation.spec.ts` |
| RG-COO-019 | FAIT | TC-COO-P03-02 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts` |
| RG-COO-021 | PARTIEL | TC-COO-P04-02 | `api/test/coordination/effets-validation-complement.int.test.ts`, `api/test/coordination/effets-validation.int.test.ts` |
| RG-COO-023 | FAIT | TC-COO-P04-02 | `api/test/coordination/effets-validation-complement.int.test.ts`, `api/test/coordination/effets-validation.int.test.ts` |
| RG-COO-025 | FAIT | TC-COO-P04-02 | `api/test/coordination/effets-validation-complement.int.test.ts`, `api/test/coordination/effets-validation.int.test.ts` |
| RG-COO-040 | PARTIEL | TC-COO-P01-01, TC-COO-P01-02 | `api/test/coordination/socle.int.test.ts`, `e2e/coordination-socle.spec.ts` |
| RG-COO-042 | FAIT | TC-COO-P02-05 | `api/test/coordination/instruction-ok.int.test.ts` |
| RG-COO-043 | FAIT | TC-COO-P02-03 | `api/test/coordination/instruction-ok.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-044 | FAIT | TC-COO-P02-02 | `api/test/coordination/instruction-ok.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-045 | FAIT | TC-COO-P01-03 | `api/test/coordination/socle.int.test.ts`, `e2e/coordination-socle.spec.ts` |
| RG-COO-046 | FAIT | TC-COO-P01-03 | `api/test/coordination/socle.int.test.ts`, `e2e/coordination-socle.spec.ts` |
| RG-COO-048 | PARTIEL | TC-COO-P02-02 | `api/test/coordination/instruction-ok.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-052 | FAIT | TC-COO-P02-03 | `api/test/coordination/instruction-ok.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-055 | PARTIEL | TC-COO-P02-01 | `api/test/coordination/instruction-ok.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-056 | PARTIEL | TC-COO-P02-04 | `api/test/coordination/instruction-ok-complement.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-057 | PARTIEL | TC-COO-P02-04 | `api/test/coordination/instruction-ok-complement.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-059 | FAIT | TC-COO-P02-02 | `api/test/coordination/instruction-ok.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-060 | PARTIEL | TC-COO-P02-01 | `api/test/coordination/instruction-ok.int.test.ts`, `e2e/coordination-instruction-ok.spec.ts` |
| RG-COO-062 | PARTIEL | TC-COO-P01-01 | `api/test/coordination/socle.int.test.ts`, `e2e/coordination-socle.spec.ts` |
| RG-COO-063 | FAIT | TC-COO-P01-01 | `api/test/coordination/socle.int.test.ts`, `e2e/coordination-socle.spec.ts` |
| RG-COO-066 | FAIT | TC-COO-P07-05 | `api/test/coordination/alertes-preprod-complement.int.test.ts`, `api/test/coordination/alertes-preprod.int.test.ts` |
| RG-COO-067 | FAIT | TC-COO-P07-05 | `api/test/coordination/alertes-preprod-complement.int.test.ts`, `api/test/coordination/alertes-preprod.int.test.ts` |
| RG-COO-068 | PARTIEL | TC-COO-P07-01, TC-COO-P07-02 | `api/test/coordination/alertes-preprod.int.test.ts`, `e2e/coordination-alertes.spec.ts` |
| RG-COO-069 | PARTIEL | TC-COO-P07-02, TC-COO-P07-03, TC-COO-P07-04 | `api/test/coordination/alertes-preprod-complement.int.test.ts`, `e2e/coordination-alertes.spec.ts` |
| RG-COO-080 | FAIT | TC-COO-P05-03 | `api/test/coordination/lignes-attendues-complement.int.test.ts`, `api/test/coordination/lignes-attendues.int.test.ts` |
| RG-COO-084 | FAIT | TC-COO-P05-01 | `api/test/coordination/lignes-attendues.int.test.ts`, `e2e/coordination-etat-reservations.spec.ts` |
| RG-COO-087 | FAIT | TC-COO-P05-03 | `api/test/coordination/lignes-attendues-complement.int.test.ts`, `api/test/coordination/lignes-attendues.int.test.ts` |
| RG-COO-089 | FAIT | TC-COO-P05-03 | `api/test/coordination/lignes-attendues-complement.int.test.ts`, `api/test/coordination/lignes-attendues.int.test.ts` |
| RG-COO-101 | FAIT | TC-COO-P05-01 | `api/test/coordination/lignes-attendues.int.test.ts`, `e2e/coordination-etat-reservations.spec.ts` |
| RG-COO-103 | PARTIEL | TC-COO-P06-02 | `api/test/coordination/integration-broadcast.int.test.ts`, `e2e/coordination-integration.spec.ts` |
| RG-COO-104 | PARTIEL | TC-COO-P06-01 | `api/test/coordination/integration-broadcast.int.test.ts`, `e2e/coordination-integration.spec.ts` |
| RG-COO-105 | PARTIEL | TC-COO-P05-04 | `api/test/coordination/lignes-attendues.int.test.ts`, `api/test/massif/volume-reel.int.test.ts` |
| RG-COO-107 | PARTIEL | TC-COO-P05-01, TC-COO-P05-02 | `api/test/coordination/lignes-attendues.int.test.ts`, `e2e/coordination-etat-reservations.spec.ts` |
| RG-COO-116 | PARTIEL | TC-COO-P06-01, TC-COO-P06-04 | `api/test/coordination/integration-broadcast-complement.int.test.ts`, `api/test/coordination/integration-broadcast.int.test.ts`, `e2e/coordination-integration.spec.ts` |
| RG-COO-122 | FAIT | TC-COO-P06-04 | `api/test/coordination/integration-broadcast-complement.int.test.ts`, `api/test/coordination/integration-broadcast.int.test.ts` |
| RG-COO-132 | PARTIEL | TC-COO-P06-03 | `api/test/coordination/integration-broadcast.int.test.ts`, `e2e/coordination-integration.spec.ts` |
| RG-COO-134 | PARTIEL | TC-COO-P06-04 | `api/test/coordination/integration-broadcast-complement.int.test.ts`, `api/test/coordination/integration-broadcast.int.test.ts` |
| RG-COO-140 | FAIT | TC-COO-P08-01 | `api/test/coordination/deblocage.int.test.ts`, `e2e/coordination-deblocage.spec.ts` |
| RG-COO-143 | FAIT | TC-COO-P08-02 | `api/test/coordination/deblocage.int.test.ts`, `e2e/coordination-deblocage.spec.ts` |
| RG-COO-145 | PARTIEL | TC-COO-P08-03 | `api/test/coordination/deblocage-complement.int.test.ts`, `e2e/coordination-deblocage.spec.ts` |
| RG-COO-149 | FAIT | TC-COO-P08-03 | `api/test/coordination/deblocage-complement.int.test.ts`, `e2e/coordination-deblocage.spec.ts` |
| RG-COO-151 | FAIT | TC-COO-P08-03 | `api/test/coordination/deblocage-complement.int.test.ts`, `e2e/coordination-deblocage.spec.ts` |
| RG-COO-165 | PARTIEL | TC-COO-P01-04 | `api/test/coordination/socle-complement.int.test.ts`, `api/test/coordination/socle.int.test.ts` |
| RG-COO-168 | FAIT | TC-COO-P01-04 | `api/test/coordination/socle-complement.int.test.ts`, `api/test/coordination/socle.int.test.ts` |
| RG-COO-208 | PARTIEL | TC-COO-P09-01 | `api/test/coordination/trains.int.test.ts`, `e2e/coordination-trains.spec.ts` |
| RG-COO-210 | FAIT | TC-COO-P10-01 | `api/test/coordination/export-trains.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| RG-COO-211 | FAIT | TC-COO-P10-01 | `api/test/coordination/export-trains.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| RG-COO-212 | FAIT | TC-COO-P10-02 | `api/test/coordination/export-trains.int.test.ts` |
| RG-COO-213 | PARTIEL | TC-COO-P10-01 | `api/test/coordination/export-trains.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| RG-COO-215 | PARTIEL | TC-COO-P10-04 | `api/test/coordination/export-trains.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| RG-COO-216 | FAIT | TC-COO-P10-04 | `api/test/coordination/export-trains.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| RG-COO-221 | FAIT | TC-COO-P09-02 | `api/test/coordination/trains.int.test.ts`, `e2e/coordination-trains.spec.ts` |
| RG-COO-222 | FAIT | TC-COO-P09-02 | `api/test/coordination/trains.int.test.ts`, `e2e/coordination-trains.spec.ts` |
| RG-COO-223 | FAIT | TC-COO-P09-04 | `api/test/coordination/trains-complement.int.test.ts`, `api/test/coordination/trains.int.test.ts` |
| RG-COO-224 | FAIT | TC-COO-P09-03 | `api/test/coordination/trains.int.test.ts`, `e2e/coordination-trains.spec.ts` |
| RG-COO-225 | FAIT | TC-COO-P09-03 | `api/test/coordination/trains.int.test.ts`, `e2e/coordination-trains.spec.ts` |
| RG-COO-228 | PARTIEL | TC-COO-P09-01 | `api/test/coordination/trains.int.test.ts`, `e2e/coordination-trains.spec.ts` |
| RG-COO-230 | FAIT | TC-COO-P10-03 | `e2e/coordination-export-trains.spec.ts` |
| RG-COO-233 | FAIT | TC-COO-P10-03 | `e2e/coordination-export-trains.spec.ts` |
| RG-COO-235 | PARTIEL | TC-COO-P10-04 | `api/test/coordination/export-trains.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| RG-COO-236 | FAIT | TC-COO-P10-04 | `api/test/coordination/export-trains.int.test.ts`, `e2e/coordination-export-trains.spec.ts` |
| RG-COO-237 | PARTIEL | TC-COO-P11-04 | `api/test/coordination/roulage-8m2-rouleurs.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-238 | PARTIEL | TC-COO-P12-01 | `api/test/coordination/unitaire.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-239 | PARTIEL | TC-COO-P12-01 | `api/test/coordination/unitaire.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-240 | PARTIEL | TC-COO-P12-02 | `api/test/coordination/liberation-colisage.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-241 | PARTIEL | TC-COO-P12-02 | `api/test/coordination/liberation-colisage.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-243 | PARTIEL | TC-COO-P12-03 | `api/test/coordination/unitaire.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-244 | PARTIEL | TC-COO-P12-03 | `api/test/coordination/unitaire.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-246 | PARTIEL | TC-COO-P12-05 | `api/test/coordination/unitaire-complement.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-249 | FAIT | TC-COO-P12-04 | `api/test/coordination/unitaire.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-250 | PARTIEL | TC-COO-P12-04 | `api/test/coordination/unitaire.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-260 | PARTIEL | TC-COO-P13-01 | `api/test/coordination/liberation-colisage.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-261 | PARTIEL | TC-COO-P13-01 | `api/test/coordination/liberation-colisage.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-262 | PARTIEL | TC-COO-P13-01 | `api/test/coordination/liberation-colisage.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-265 | FAIT | TC-COO-P13-02 | `api/test/coordination/colis.int.test.ts`, `e2e/roulage-expedition.spec.ts` |
| RG-COO-267 | FAIT | TC-COO-P13-02 | `api/test/coordination/colis.int.test.ts`, `e2e/roulage-expedition.spec.ts` |
| RG-COO-268 | PARTIEL | TC-COO-P13-03 | `api/test/coordination/colis.int.test.ts`, `e2e/roulage-expedition.spec.ts` |
| RG-COO-269 | PARTIEL | TC-COO-P13-03 | `api/test/coordination/colis.int.test.ts`, `e2e/roulage-expedition.spec.ts` |
| RG-COO-291 | FAIT | TC-COO-P11-01 | `api/test/coordination/roulage-dispatch.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-293 | PARTIEL | TC-COO-P11-02 | `api/test/coordination/roulage-dispatch.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-294 | FAIT | TC-COO-P11-01, TC-COO-P11-02 | `api/test/coordination/roulage-dispatch.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-296 | FAIT | TC-COO-P11-01 | `api/test/coordination/roulage-dispatch.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-298 | PARTIEL | TC-COO-P11-03 | `api/test/coordination/roulage-bagues.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-299 | PARTIEL | TC-COO-P11-03 | `api/test/coordination/roulage-bagues.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-300 | PARTIEL | TC-COO-P11-03 | `api/test/coordination/roulage-bagues.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-301 | FAIT | TC-COO-P11-03 | `api/test/coordination/roulage-bagues.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-302 | PARTIEL | TC-COO-P11-03 | `api/test/coordination/roulage-bagues.int.test.ts`, `e2e/roulage.spec.ts` |
| RG-COO-304 | PARTIEL | TC-COO-P12-05 | `api/test/coordination/unitaire-complement.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-305 | PARTIEL | TC-COO-P12-05 | `api/test/coordination/unitaire-complement.int.test.ts`, `e2e/coordination-unitaire.spec.ts` |
| RG-COO-308 | PARTIEL | TC-COO-P09-04 | `api/test/coordination/trains-complement.int.test.ts`, `api/test/coordination/trains.int.test.ts` |
| RG-NEW-BUS-002 | Réalisé, voir précisions | TC-NEW-03 | `api/test/bus/parcours.int.test.ts`, `e2e/admin-nouvelles-specs.spec.ts` |
| RG-NEW-NC-002 | Réalisé, voir précisions | TC-NEW-01 | `api/test/nonconformite/parcours.int.test.ts`, `e2e/admin-nouvelles-specs.spec.ts` |
| RG-NEW-REC-001 | Réalisé, vérifié | TC-REC-P04-04 | `api/test/reception/validation.int.test.ts` |
| RG-NEW-REC-002 | Réalisé, voir précisions | TC-REC-P03-01 | `api/test/reception/bon-livraison.int.test.ts`, `e2e/reception-panier.spec.ts` |
| RG-NEW-REC-004 | Réalisé, voir précisions | TC-COO-P03-04 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts` |
| RG-NEW-REC-005 | hors matrice, voir REGLES_METIER_NOUVELLES_SPECS | TC-REC-P07-02 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-NEW-REC-006 | hors matrice, voir REGLES_METIER_NOUVELLES_SPECS | TC-REC-P08-02 | `api/test/reception/affiches.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-001 | PARTIEL | TC-REC-P01-02 | `api/test/reception/socle-audit.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-002 | PARTIEL | TC-REC-P01-01, TC-REC-P01-02 | `api/test/reception/socle-audit.int.test.ts`, `api/test/reception/socle-complement.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-004 | PARTIEL | TC-REC-P01-01 | `api/test/reception/socle-complement.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-005 | PARTIEL | TC-REC-P01-01 | `api/test/reception/socle-complement.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-006 | PARTIEL | TC-REC-P01-01 | `api/test/reception/socle-complement.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-008 | FAIT | TC-REC-P01-03 | `api/test/reception/socle-complement.int.test.ts`, `api/test/socle.int.test.ts` |
| RG-REC-009 | FAIT | TC-REC-P01-03, TC-REC-P08-04 | `api/test/coordination/effets-validation.int.test.ts`, `api/test/reception/affiches.int.test.ts`, `api/test/reception/socle-complement.int.test.ts`, `api/test/socle.int.test.ts` |
| RG-REC-010 | PARTIEL | TC-REC-P05-05 | `api/test/reception/controle-complement.int.test.ts`, `api/test/reception/stock-alertes-complement.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-011 | PARTIEL | TC-REC-P02-02 | `e2e/reception-attendues.spec.ts` |
| RG-REC-012 | PARTIEL | TC-REC-P02-02 | `e2e/reception-attendues.spec.ts` |
| RG-REC-014 | PARTIEL | TC-REC-P02-01 | `api/test/reception/attendues.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-015 | FAIT | TC-REC-P02-01 | `api/test/reception/attendues.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-016 | PARTIEL | TC-REC-P02-01, TC-REC-P02-04 | `api/test/reception/attendues.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-017 | PARTIEL | TC-REC-P02-03 | `api/test/reception/attendues-complement.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-018 | FAIT | TC-REC-P02-03 | `api/test/reception/attendues-complement.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-019 | FAIT | TC-REC-P02-03 | `api/test/reception/attendues-complement.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-021 | FAIT | TC-REC-P03-01 | `api/test/reception/bon-livraison.int.test.ts`, `e2e/reception-panier.spec.ts` |
| RG-REC-022 | FAIT | TC-REC-P03-01 | `api/test/reception/bon-livraison.int.test.ts`, `e2e/reception-panier.spec.ts` |
| RG-REC-023 | PARTIEL | TC-REC-P03-01 | `api/test/reception/bon-livraison.int.test.ts`, `e2e/reception-panier.spec.ts` |
| RG-REC-024 | FAIT | TC-REC-P03-03 | `api/test/reception/bon-livraison-complement.int.test.ts`, `api/test/reception/bon-livraison.int.test.ts` |
| RG-REC-026 | FAIT | TC-REC-P03-02 | `api/test/reception/bon-livraison.int.test.ts`, `e2e/reception-panier.spec.ts` |
| RG-REC-028 | BLOQUÉ | TC-REC-P03-05 | — |
| RG-REC-031 | BLOQUÉ | TC-REC-P03-05 | — |
| RG-REC-033 | FAIT | TC-REC-P04-01 | `api/test/reception/validation.int.test.ts`, `e2e/reception-panier.spec.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-035 | FAIT | TC-REC-P03-03 | `api/test/reception/bon-livraison-complement.int.test.ts`, `api/test/reception/bon-livraison.int.test.ts` |
| RG-REC-036 | FAIT | TC-REC-P03-03 | `api/test/reception/bon-livraison-complement.int.test.ts`, `api/test/reception/bon-livraison.int.test.ts` |
| RG-REC-037 | FAIT | TC-REC-P04-02 | `api/test/interactions/atomicite.int.test.ts`, `api/test/reception/validation-complement.int.test.ts` |
| RG-REC-038 | FAIT | TC-REC-P04-01 | `api/test/reception/validation.int.test.ts`, `e2e/reception-panier.spec.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-040 | FAIT | TC-REC-P04-03 | `api/test/reception/validation-complement.int.test.ts`, `api/test/reception/validation.int.test.ts` |
| RG-REC-045 | FAIT | TC-REC-P04-01 | `api/test/reception/validation.int.test.ts`, `e2e/reception-panier.spec.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-046 | FAIT | TC-REC-P04-02 | `api/test/interactions/atomicite.int.test.ts`, `api/test/reception/validation-complement.int.test.ts` |
| RG-REC-047 | FAIT | TC-REC-P04-04 | `api/test/reception/validation.int.test.ts` |
| RG-REC-050 | FAIT | TC-REC-P04-03 | `api/test/reception/validation-complement.int.test.ts`, `api/test/reception/validation.int.test.ts` |
| RG-REC-051 | FAIT | TC-REC-P04-03 | `api/test/reception/validation-complement.int.test.ts`, `api/test/reception/validation.int.test.ts` |
| RG-REC-052 | FAIT | TC-REC-P02-05 | `api/test/admin/taches.int.test.ts`, `api/test/reception/attendues.int.test.ts` |
| RG-REC-053 | FAIT | TC-REC-P05-01 | `api/test/reception/controle.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-054 | FAIT | TC-REC-P05-05 | `api/test/reception/controle-complement.int.test.ts`, `api/test/reception/stock-alertes-complement.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-055 | FAIT | TC-REC-P05-05 | `api/test/reception/controle-complement.int.test.ts`, `api/test/reception/stock-alertes-complement.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-056 | FAIT | TC-REC-P05-01 | `api/test/reception/controle.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-058 | FAIT | TC-REC-P05-03 | `api/test/massif/non-regression.int.test.ts`, `api/test/reception/controle-complement.int.test.ts` |
| RG-REC-061 | FAIT | TC-REC-P05-01, TC-REC-P05-02 | `api/test/reception/audit-rec-2.int.test.ts`, `api/test/reception/controle.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-063 | FAIT | TC-REC-P05-01 | `api/test/reception/controle.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-064 | FAIT | TC-REC-P05-03 | `api/test/massif/non-regression.int.test.ts`, `api/test/reception/controle-complement.int.test.ts` |
| RG-REC-067 | FAIT | TC-REC-P05-02 | `api/test/reception/audit-rec-2.int.test.ts`, `api/test/reception/controle.int.test.ts` |
| RG-REC-069 | FAIT | TC-REC-P05-01 | `api/test/reception/controle.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-070 | FAIT | TC-REC-P05-04 | `api/test/reception/controle-complement.int.test.ts`, `api/test/reception/controle.int.test.ts` |
| RG-REC-071 | FAIT | TC-REC-P05-04 | `api/test/reception/controle-complement.int.test.ts`, `api/test/reception/controle.int.test.ts` |
| RG-REC-072 | FAIT | TC-REC-P05-04 | `api/test/reception/controle-complement.int.test.ts`, `api/test/reception/controle.int.test.ts` |
| RG-REC-074 | FAIT | TC-REC-P01-04 | `api/test/reception/audit-rec.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-076 | FAIT | TC-REC-P06-04 | — |
| RG-REC-083 | FAIT | TC-REC-P07-01 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-084 | FAIT | TC-REC-P06-01 | `api/test/reception/impressions.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-085 | FAIT | TC-REC-P06-01 | `api/test/reception/impressions.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-086 | FAIT | TC-REC-P06-02 | `api/test/reception/impressions.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-087 | FAIT | TC-REC-P06-02 | `api/test/reception/impressions.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-088 | FAIT | TC-REC-P06-03 | `api/test/reception/impressions.int.test.ts` |
| RG-REC-090 | FAIT | TC-REC-P06-02 | `api/test/reception/impressions.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-092 | BLOQUÉ | TC-REC-P06-04 | — |
| RG-REC-095 | FAIT | TC-REC-P07-01 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-096 | FAIT | TC-REC-P07-01 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-099 | FAIT | TC-REC-P07-01 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-101 | FAIT | TC-REC-P07-02 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-107 | FAIT | TC-REC-P07-03 | `api/test/reception/inconnues-complement.int.test.ts`, `api/test/reception/inconnues.int.test.ts` |
| RG-REC-108 | FAIT | TC-REC-P07-03 | `api/test/reception/inconnues-complement.int.test.ts`, `api/test/reception/inconnues.int.test.ts` |
| RG-REC-109 | FAIT | TC-REC-P07-02 | `api/test/reception/inconnues.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-111 | FAIT | TC-REC-P07-04 | `api/test/reception/inconnues.int.test.ts`, `e2e/coordination-effets-validation.spec.ts` |
| RG-REC-112 | FAIT | TC-REC-P07-05 | `api/test/reception/inconnues.int.test.ts`, `e2e/interactions.spec.ts` |
| RG-REC-114 | FAIT | TC-REC-P07-05 | `api/test/reception/inconnues.int.test.ts`, `e2e/interactions.spec.ts` |
| RG-REC-121 | FAIT | TC-REC-P08-01 | `api/test/reception/affiches.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-122 | FAIT | TC-REC-P08-01 | `api/test/reception/affiches.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-125 | FAIT | TC-REC-P08-01 | `api/test/reception/affiches.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-126 | FAIT | TC-REC-P08-01 | `api/test/reception/affiches.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-129 | FAIT | TC-REC-P06-01 | `api/test/reception/impressions.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-131 | FAIT | TC-REC-P08-02 | `api/test/reception/affiches.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-135 | FAIT | TC-REC-P08-03 | `api/test/interactions/reception-vers-coordination.int.test.ts`, `api/test/reception/affiches.int.test.ts` |
| RG-REC-136 | FAIT | TC-REC-P08-04 | `api/test/coordination/effets-validation.int.test.ts`, `api/test/reception/affiches.int.test.ts` |
| RG-REC-150 | FAIT | TC-REC-P08-03 | `api/test/interactions/reception-vers-coordination.int.test.ts`, `api/test/reception/affiches.int.test.ts` |
| RG-REC-151 | PARTIEL | TC-REC-P01-04, TC-REC-P09-02 | `api/test/massif/non-regression.int.test.ts`, `api/test/reception/audit-rec.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-153 | FAIT | TC-REC-P01-04 | `api/test/reception/audit-rec.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-156 | FAIT | TC-REC-P09-01 | `api/test/reception/stock-alertes-admin.int.test.ts`, `api/test/stocks/fin-campagne.int.test.ts` |
| RG-REC-157 | NON REPRIS — décision à valider (Q-100/101/118/155) | TC-REC-P09-04 | — |
| RG-REC-163 | NON REPRIS — décision à valider (Q-100/101/118/155) | TC-REC-P09-04 | — |
| RG-REC-169 | FAIT | TC-REC-P09-03 | `api/test/reception/affiches.int.test.ts` |
| RG-REC-176 | FAIT | TC-REC-P01-04 | `api/test/reception/audit-rec.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-REC-178 | FAIT | TC-REC-P10-02 | `api/test/reception/stock-alertes-admin.int.test.ts`, `e2e/admin-parametres.spec.ts` |
| RG-REC-179 | PARTIEL | TC-REC-P10-03 | `api/test/admin/referentiels-reception.int.test.ts`, `e2e/admin-lot3.spec.ts` |
| RG-REC-180 | PARTIEL | TC-REC-P02-05 | `api/test/admin/taches.int.test.ts`, `api/test/reception/attendues.int.test.ts` |
| RG-REC-187 | FAIT | TC-REC-P10-01 | `api/test/reception/stock-alertes-admin.int.test.ts`, `e2e/reception-parcours.spec.ts` |
| RG-REC-189 | FAIT | TC-REC-P05-05 | `api/test/reception/controle-complement.int.test.ts`, `api/test/reception/stock-alertes-complement.int.test.ts`, `e2e/reception-attendues.spec.ts` |
| RG-REC-190 | PARTIEL | TC-REC-P10-04 | `api/test/admin/regles-alerte.int.test.ts`, `e2e/admin-lot3.spec.ts` |
| RG-REC-194 | BLOQUÉ | TC-REC-P10-05 | — |
| RG-REC-195 | BLOQUÉ | TC-REC-P10-05 | — |
| RG-REC-199 | BLOQUÉ | TC-REC-P10-05 | — |
| RG-REC-203 | PARTIEL | TC-REC-P03-04 | `e2e/reception-panier.spec.ts` |
| RG-STK-NEW-001 | IMPLÉMENTÉ | TC-REC-P09-01 | `api/test/reception/stock-alertes-admin.int.test.ts`, `api/test/stocks/fin-campagne.int.test.ts` |
| RG-STK-NEW-002 | IMPLÉMENTÉ, recette complète à poursuivre | TC-NEW-05 | `api/test/stocks/fin-campagne.int.test.ts`, `e2e/admin-maquette-new.spec.ts` |
| RG-X-001 | FAIT | TC-COO-P03-01 | `api/test/coordination/validation-admin.int.test.ts`, `e2e/interactions.spec.ts` |
| RG-X-005 | FAIT | TC-REC-P04-01, TC-COO-P03-01 | `api/test/coordination/validation-admin.int.test.ts`, `api/test/reception/validation.int.test.ts`, `e2e/interactions.spec.ts`, `e2e/reception-panier.spec.ts`, `e2e/reception-parcours.spec.ts` |
| RG-X-012 | FAIT | TC-REC-P08-03 | `api/test/interactions/reception-vers-coordination.int.test.ts`, `api/test/reception/affiches.int.test.ts` |
| RG-X-013 | FAIT | TC-REC-P08-05 | `e2e/interactions.spec.ts` |
| RG-X-015 | FAIT | TC-REC-P08-05, TC-COO-P04-05 | `api/test/coordination/effets-validation-complement.int.test.ts`, `e2e/coordination-effets-validation.spec.ts`, `e2e/interactions.spec.ts` |
| RG-X-016 | PARTIEL | TC-REC-P01-04 | `api/test/reception/audit-rec.int.test.ts`, `api/test/reception/socle.int.test.ts` |
| RG-X-050 | FAIT | TC-COO-P04-04 | `api/test/coordination/effets-validation.int.test.ts`, `e2e/interactions.spec.ts` |
| RG-X-051 | FAIT | TC-REC-P07-04, TC-COO-P04-05 | `api/test/coordination/effets-validation-complement.int.test.ts`, `api/test/reception/inconnues.int.test.ts`, `e2e/coordination-effets-validation.spec.ts` |
| RG-X-052 | FAIT | TC-REC-P08-04 | `api/test/coordination/effets-validation.int.test.ts`, `api/test/reception/affiches.int.test.ts` |
| RG-X-053 | FAIT | TC-COO-P03-04, TC-COO-P04-04 | `api/test/coordination/effets-validation.int.test.ts`, `api/test/coordination/validation-admin.int.test.ts`, `e2e/coordination-validation-admin.spec.ts`, `e2e/interactions.spec.ts` |
| RG-X-054 | PARTIEL | TC-REC-P07-05 | `api/test/reception/inconnues.int.test.ts`, `e2e/interactions.spec.ts` |
| RG-X-058 | FAIT | TC-REC-P07-05, TC-REC-P08-05 | `api/test/reception/inconnues.int.test.ts`, `e2e/interactions.spec.ts` |
| RG-X-063 | FAIT | TC-REC-P07-04, TC-REC-P08-05 | `api/test/reception/inconnues.int.test.ts`, `e2e/coordination-effets-validation.spec.ts`, `e2e/interactions.spec.ts` |
| RG-X-087 | PARTIEL | TC-COO-P13-03 | `api/test/coordination/colis.int.test.ts`, `e2e/roulage-expedition.spec.ts` |

`api/test/` désigne `apps/api/test/`.

## Limites

- Les cas couvrent le comportement nominal et les rejets principaux de chaque parcours, pas l'intégralité des RG : une RG
  absente de ce tableau peut être testée (voir la colonne « Tests » de la matrice complète) sans faire l'objet d'un cas de recette.
- Les cas marqués « Bloqué » ou « Non repris » décrivent le comportement cible documenté et ne sont pas exécutables à ce jour.
