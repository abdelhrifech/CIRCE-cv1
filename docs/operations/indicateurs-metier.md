# Catalogue des indicateurs métier

Indicateurs émis par l'API sous forme de métriques OpenTelemetry préfixées par le nom de l'application (EXP-030), décrits
selon EXP-031. Implémentation : `apps/api/src/core/observability/securite-metier.ts` ; test :
`apps/api/test/securite-indicateurs.int.test.ts`. Les indicateurs sont calculés au niveau HTTP ou par des lectures seules :
ils ne modifient aucune règle ni aucune donnée. Attributs à faible cardinalité uniquement (EXP-006) : aucun identifiant
d'utilisateur, de dossier ou de plateforme.

Les métriques ne sont exportées que si un collecteur est configuré (`OTEL_EXPORTER_OTLP_ENDPOINT`, voir
[observabilite.md](observabilite.md)). Sans lecteur de métriques, les jauges ne déclenchent aucune lecture en base.

**Les seuils sont des propositions** à valider avec le Responsable Métier et l'exploitation (aucune source ne les fixe).

## Indicateurs

| Métrique | Type, unité | Signification | Seuil d'alerte proposé | Action attendue |
|---|---|---|---|---|
| `circe_evenements_metier{evenement="reception_enregistree"}` | Compteur, `{evenement}` | Réceptions (BL) enregistrées avec succès (`POST /v1/receptions`) | Aucune réception un jour ouvré entre 8 h et 18 h sur l'environnement de production | Vérifier l'accès des agents de réception à l'application et les erreurs 4xx/5xx de la route |
| `circe_evenements_metier{evenement="reception_controlee"}` | Compteur | Contrôles de réception réussis | Taux nettement inférieur aux réceptions enregistrées sur une semaine | Croiser avec `circe_receptions_en_attente{statut="A_CONTROLER"}` |
| `circe_evenements_metier{evenement="reception_inconnue_declaree"}` | Compteur | Réceptions inconnues déclarées | Hausse brutale (×3 sur la moyenne de 4 semaines) | Contrôler l'alimentation des réceptions attendues (intégration Broadcast) |
| `circe_evenements_metier{evenement="reception_inconnue_rattachee"}` | Compteur | Réceptions inconnues rattachées à une affiche | — | Suivi de la résorption des inconnues |
| `circe_evenements_metier{evenement="validation_admin"}` | Compteur | Validations administratives réussies (affiche ou lot) | — | Suivi d'activité de la coordination |
| `circe_evenements_metier{evenement="instruction_ok"}` | Compteur | Instructions OK réussies | — | Suivi d'activité de la coordination |
| `circe_evenements_metier{evenement="train_cree"}` | Compteur | Trains créés | — | Suivi de préparation |
| `circe_evenements_metier{evenement="trains_exportes"}` | Compteur | Exports de trains réussis | Aucun export un jour de départ | Vérifier les machines et les erreurs de la route d'export |
| `circe_evenements_metier{evenement="colis_expedie"}` | Compteur | Colis expédiés | — | Suivi d'expédition |
| `circe_evenements_metier{evenement="fin_campagne_executee"}` | Compteur | Exécutions de fin de campagne | — | Contrôle des opérations sensibles (journal `securite.operation_sensible`) |
| `circe_receptions_en_attente{statut}` | Jauge, `{reception}` | Réceptions `A_IDENTIFIER` ou `A_CONTROLER`, toutes plateformes | `A_CONTROLER` > 50 pendant plus de 24 h (le délai de contrôle de 24 h est un paramètre de Réception) | Relancer le contrôle sur les plateformes concernées (écran Réception › Palettes à contrôler) |
| `circe_instructions{statut}` | Jauge, `{instruction}` | Instructions par statut (`A_TRAITER`, `EN_COURS`, `INSTRUCTION_OK`, `ERREUR`, `ANNULE`, `PRET_A_PRODUIRE`) | `ERREUR` > 0 pendant plus de 4 h | Analyser les instructions en erreur (Coordination › Liste des instructions) |

## Indicateurs techniques associés

| Métrique | Type | Usage |
|---|---|---|
| `http.server.request.duration{http.route, http.request.method, http.response.status_code}` | Histogramme, s | Temps de réponse par route (convention sémantique OpenTelemetry) ; alerte proposée : p95 > 3 s sur une route `/v1` pendant 15 min |
| `circe_api_requests{…}` | Compteur | Volume de requêtes par route et statut ; alerte proposée : part des 5xx > 1 % sur 15 min |

## Journaux de sécurité associés (SEC-050)

| Événement (`evenement`) | Niveau | Contenu |
|---|---|---|
| `securite.refus` | `warn` | Refus 401 ou 403 : `utilisateurId`, `methode`, `route` (modèle), `statut`, `code`, `regle` |
| `securite.operation_sensible` | `info` | Écriture réussie d'administration, de paramétrage, de référentiel, validation admin, déblocage, export ou suppression de train, rebut, mouvement manuel, fin de campagne, et toute suppression |

Les journaux ne contiennent ni jeton, ni cookie, ni en-tête d'identité, ni corps de requête (SEC-051 ; `redact` de la
configuration pino, `apps/api/src/app.ts`).
