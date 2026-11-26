import type { FastifyInstance, FastifyRequest } from 'fastify'
import { metrics, type ObservableResult } from '@opentelemetry/api'
import type { Db } from '../db.ts'

// Journalisation de sécurité (SEC-050, SEC-051) et indicateurs métier (EXP-030, EXP-031), posés au niveau HTTP et en
// lecture seule : aucun service métier n'est modifié, aucune règle n'est déclenchée ni contournée. Catalogue :
// docs/operations/indicateurs-metier.md.

/** Modèle de route sans préfixe de version (`/v1/receptions/:id` → `/receptions/:id`). */
export function routeMetier(url: string | undefined): string {
  return (url ?? '').replace(/^\/(v1|api)(?=\/)/, '')
}

// Opérations sensibles (SEC-050) : écritures d'administration, de paramétrage et de référentiels, validation admin,
// déblocages, exports et suppressions de trains, rebut, mouvements manuels, fin de campagne, et toute suppression.
const SENSIBLES: RegExp[] = [
  /^\/admin\//,
  /^\/parametres\//,
  /^\/referentiels\//,
  /validation-admin$/,
  /^\/coordination\/deblocage\//,
  /^\/coordination\/trains\/(debloquer-semaine|export|export-preparation|supprimer-theme-export|:trainId\/suppression)$/,
  /^\/affiches\/:id\/(rebut|mouvements-manuels)$/,
  /^\/mouvements\/:id$/,
  /^\/stocks\/(rebut|conserver|fin-campagne\/decision|fin-campagne\/executer)$/,
]

export function estOperationSensible(methode: string, route: string): boolean {
  if (methode === 'GET' || methode === 'HEAD' || methode === 'OPTIONS') return false
  return methode === 'DELETE' || SENSIBLES.some((r) => r.test(route))
}

// Événements métier (EXP-030) : une écriture réussie sur ces routes compte un événement ; jeu de valeurs fermé (faible
// cardinalité, EXP-006).
const EVENEMENTS: Record<string, string> = {
  'POST /receptions': 'reception_enregistree',
  'POST /receptions/:id/controle': 'reception_controlee',
  'POST /receptions-inconnues': 'reception_inconnue_declaree',
  'POST /affiches/:id/rattacher-inconnue': 'reception_inconnue_rattachee',
  'POST /affiches/:id/validation-admin': 'validation_admin',
  'POST /coordination/validation-admin': 'validation_admin',
  'POST /coordination/affiches/:id/validation-admin': 'validation_admin',
  'POST /coordination/instruction-ok': 'instruction_ok',
  'POST /coordination/trains': 'train_cree',
  'POST /coordination/trains/export': 'trains_exportes',
  'POST /coordination/colis/:id/expedier': 'colis_expedie',
  'POST /stocks/fin-campagne/executer': 'fin_campagne_executee',
}

export function evenementMetier(methode: string, route: string, statut: number): string | null {
  if (statut < 200 || statut >= 300) return null
  return EVENEMENTS[`${methode} ${route}`] ?? null
}

function trace(request: FastifyRequest, statut?: number) {
  return {
    utilisateurId: request.identity?.userId ?? null,
    methode: request.method,
    route: routeMetier(request.routeOptions.url),
    ...(statut === undefined ? {} : { statut }),
  }
}

/** SEC-050 : refus d'authentification ou d'autorisation (401, 403), journalisé sans jeton ni donnée de requête. */
export function journaliserRefus(
  request: FastifyRequest,
  statut: number,
  erreur: { code: string; regle?: string | undefined },
): void {
  if (statut !== 401 && statut !== 403) return
  request.log.warn(
    {
      evenement: 'securite.refus',
      ...trace(request, statut),
      code: erreur.code,
      ...(erreur.regle ? { regle: erreur.regle } : {}),
    },
    'Accès refusé',
  )
}

export function registerSecuriteEtIndicateurs(app: FastifyInstance, db: Db): void {
  const meter = metrics.getMeter('circe.api')
  const evenements = meter.createCounter('circe_evenements_metier', {
    unit: '{evenement}',
    description: 'Écritures métier réussies, par type d’événement',
  })

  app.addHook('onResponse', async (request, reply) => {
    const route = routeMetier(request.routeOptions.url)
    const evenement = evenementMetier(request.method, route, reply.statusCode)
    if (evenement) evenements.add(1, { evenement })
    if (reply.statusCode < 400 && estOperationSensible(request.method, route)) {
      request.log.info(
        { evenement: 'securite.operation_sensible', ...trace(request, reply.statusCode) },
        'Opération sensible',
      )
    }
  })

  // Jauges calculées par des lectures seules, uniquement quand un lecteur de métriques les collecte.
  const receptions = meter.createObservableGauge('circe_receptions_en_attente', {
    unit: '{reception}',
    description: 'Réceptions à identifier ou à contrôler',
  })
  const instructions = meter.createObservableGauge('circe_instructions', {
    unit: '{instruction}',
    description: 'Instructions par statut',
  })
  const lireReceptions = async (r: ObservableResult) => {
    const lignes = await db.reception.groupBy({
      by: ['statut'],
      where: { statut: { in: ['A_IDENTIFIER', 'A_CONTROLER'] } },
      _count: { _all: true },
    })
    for (const statut of ['A_IDENTIFIER', 'A_CONTROLER'] as const)
      r.observe(lignes.find((l) => l.statut === statut)?._count._all ?? 0, { statut })
  }
  const lireInstructions = async (r: ObservableResult) => {
    const lignes = await db.instruction.groupBy({ by: ['statut'], _count: { _all: true } })
    for (const l of lignes) r.observe(l._count._all, { statut: l.statut })
  }
  receptions.addCallback(lireReceptions)
  instructions.addCallback(lireInstructions)
  app.addHook('onClose', (_instance, done) => {
    receptions.removeCallback(lireReceptions)
    instructions.removeCallback(lireInstructions)
    done()
  })
}
