import { afterAll, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { Writable } from 'node:stream'
import { metrics } from '@opentelemetry/api'
import { MeterProvider, MetricReader } from '@opentelemetry/sdk-metrics'
import { loadConfig } from '../src/core/config.ts'
import { createDb } from '../src/core/db.ts'
import { ForbiddenError } from '../src/core/errors.ts'
import { registerErrorHandler } from '../src/core/error-handler.ts'
import {
  estOperationSensible,
  evenementMetier,
  registerSecuriteEtIndicateurs,
  routeMetier,
} from '../src/core/observability/securite-metier.ts'

class LecteurTest extends MetricReader {
  protected async onForceFlush() {}
  protected async onShutdown() {}
}
const lecteur = new LecteurTest()
metrics.setGlobalMeterProvider(new MeterProvider({ readers: [lecteur] }))

const db = createDb(loadConfig().DATABASE_URL)
afterAll(async () => {
  await db.$disconnect()
})

/** Application minimale : gestionnaire d'erreurs, journalisation et indicateurs réels, journaux capturés. */
async function appTest() {
  const journaux: Record<string, unknown>[] = []
  const flux = new Writable({
    write(morceau: Buffer, _e, fin) {
      journaux.push(JSON.parse(morceau.toString()) as Record<string, unknown>)
      fin()
    },
  })
  const app = Fastify({ logger: { level: 'info', stream: flux } })
  app.decorateRequest('identity', null)
  app.addHook('onRequest', (request, _reply, done) => {
    request.identity = { userId: 42 } as unknown as NonNullable<typeof request.identity>
    done()
  })
  registerErrorHandler(app)
  registerSecuriteEtIndicateurs(app, db)
  app.post('/v1/admin/parametres/:cle', (_request, reply) => reply.send({ ok: true }))
  app.post('/v1/receptions/:id/controle', (_request, reply) => reply.send({ ok: true }))
  app.post('/v1/coordination/trains/export', () => {
    throw new ForbiddenError('Droit insuffisant', {
      code: 'DROIT_INSUFFISANT',
      regle: 'RG-COO-165',
    })
  })
  await app.ready()
  return { app, journaux }
}

describe('SEC-050 / EXP-030 journalisation de sécurité et indicateurs métier', () => {
  it('SEC-050 classe les opérations sensibles (écritures d’administration, exports, suppressions) et ignore les lectures', () => {
    expect(routeMetier('/v1/admin/parametres/:cle')).toBe('/admin/parametres/:cle')
    expect(routeMetier('/api/receptions')).toBe('/receptions')
    expect(estOperationSensible('PUT', '/admin/parametres/:cle')).toBe(true)
    expect(estOperationSensible('POST', '/coordination/trains/export')).toBe(true)
    expect(estOperationSensible('POST', '/affiches/:id/validation-admin')).toBe(true)
    expect(estOperationSensible('DELETE', '/receptions/:id')).toBe(true)
    expect(estOperationSensible('GET', '/admin/utilisateurs')).toBe(false)
    expect(estOperationSensible('POST', '/receptions')).toBe(false)
  })

  it('EXP-030 ne compte un événement métier que pour une écriture réussie d’une route cataloguée', () => {
    expect(evenementMetier('POST', '/receptions/:id/controle', 200)).toBe('reception_controlee')
    expect(evenementMetier('POST', '/coordination/instruction-ok', 201)).toBe('instruction_ok')
    expect(evenementMetier('POST', '/receptions/:id/controle', 422)).toBeNull()
    expect(evenementMetier('GET', '/receptions', 200)).toBeNull()
  })

  it('SEC-050 journalise un refus (403) avec l’utilisateur, la route et la règle ; SEC-051 sans jeton ni en-tête', async () => {
    const { app, journaux } = await appTest()
    const r = await app.inject({
      method: 'POST',
      url: '/v1/coordination/trains/export',
      headers: { authorization: 'Bearer jeton-secret', cookie: 'session=secret' },
    })
    expect(r.statusCode).toBe(403)
    const refus = journaux.find((j) => j['evenement'] === 'securite.refus')
    expect(refus).toMatchObject({
      utilisateurId: 42,
      methode: 'POST',
      route: '/coordination/trains/export',
      statut: 403,
      code: 'DROIT_INSUFFISANT',
      regle: 'RG-COO-165',
    })
    expect(JSON.stringify(journaux)).not.toMatch(/jeton-secret|session=secret/)
    // Un refus n'est pas une opération sensible réalisée.
    expect(journaux.some((j) => j['evenement'] === 'securite.operation_sensible')).toBe(false)
    await app.close()
  })

  it('SEC-050 journalise une opération sensible réussie ; une écriture ordinaire ne l’est pas', async () => {
    const { app, journaux } = await appTest()
    expect((await app.inject({ method: 'POST', url: '/v1/admin/parametres/x' })).statusCode).toBe(
      200,
    )
    expect(
      (await app.inject({ method: 'POST', url: '/v1/receptions/7/controle' })).statusCode,
    ).toBe(200)
    const sensibles = journaux.filter((j) => j['evenement'] === 'securite.operation_sensible')
    expect(sensibles).toHaveLength(1)
    expect(sensibles[0]).toMatchObject({
      utilisateurId: 42,
      route: '/admin/parametres/:cle',
      statut: 200,
    })
    await app.close()
  })

  it('EXP-030 expose les événements métier et les jauges lues en base (réceptions en attente, instructions par statut)', async () => {
    const { app } = await appTest()
    await app.inject({ method: 'POST', url: '/v1/receptions/7/controle' })
    const attendues = await db.reception.count({ where: { statut: 'A_CONTROLER' } })
    const { resourceMetrics } = await lecteur.collect()
    const toutes = resourceMetrics.scopeMetrics.flatMap((s) => s.metrics)
    const parNom = (nom: string) => toutes.find((m) => m.descriptor.name === nom)
    const evenements = parNom('circe_evenements_metier')
    expect(
      evenements?.dataPoints.find((p) => p.attributes['evenement'] === 'reception_controlee')
        ?.value,
    ).toBeGreaterThanOrEqual(1)
    const receptions = parNom('circe_receptions_en_attente')
    expect(
      receptions?.dataPoints.find((p) => p.attributes['statut'] === 'A_CONTROLER')?.value,
    ).toBe(attendues)
    const totalInstructions = (parNom('circe_instructions')?.dataPoints ?? []).reduce(
      (s, p) => s + Number(p.value),
      0,
    )
    expect(totalInstructions).toBe(await db.instruction.count())
    await app.close()
  })
})
