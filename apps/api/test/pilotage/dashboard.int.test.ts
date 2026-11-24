import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DashboardSchema, DeliveryForecastSchema } from '@circe/shared'
import * as f from '../factories/index.ts'
import { autre, contexteReception, get, idem, post, site } from '../support/reception.ts'

const ctx = contexteReception()
beforeAll(() => ctx.demarrer())
afterAll(() => ctx.arreter())

describe('EX-MISSION-PIL-001 dashboard réel en lecture seule', () => {
  it('déduplique les trains multi-thèmes, ignore la validation admin pour B et ne compte pas les répartitions comme UM', async () => {
    const own = await site(ctx, ['coord'])
    const scroll = await f.createAtelier(ctx.db, {
      plateformeId: own.plateforme.id,
      type: 'SCROLL',
    })
    const fixed = await f.createAtelier(ctx.db, { plateformeId: own.plateforme.id, type: 'FIXE' })
    const instruction = await f.createInstruction(ctx.db, {
      atelierId: scroll.id,
      statut: 'INSTRUCTION_OK',
    })
    const dossier = await f.createDossier(ctx.db)
    const trainId = `dashboard-${instruction.code}`
    for (const theme of ['Visuel A', 'Visuel B']) {
      const expected = await f.createReceptionAttendue(ctx.db, {
        plateformeId: own.plateforme.id,
        supportId: own.support.id,
        atelierId: scroll.id,
        contNum: dossier.contNum,
        theme,
        semAnnee: 2026,
        semNum: 48,
        qteBc: 1,
      })
      const affiche = await f.createAffiche(ctx.db, {
        plateformeId: own.plateforme.id,
        supportId: own.support.id,
        validationAdmin: false,
        theme,
      })
      await f.createRattachement(ctx.db, {
        afficheId: affiche.id,
        ligneAttendueId: expected.id,
        quantite: 1,
      })
      await f.createFaceTrain(ctx.db, {
        instructionCode: instruction.code,
        atelierId: scroll.id,
        supportId: own.support.id,
        contNum: dossier.contNum,
        theme,
        trainId,
        statut: 'INSTRUCTION_OK',
        depAnbas: 2026,
        depSembas: 48,
      })
    }
    const um = await f.createUniteManutention(ctx.db, {
      atelierId: fixed.id,
      statut: 'A_EXPEDIER',
      semAnnee: 2026,
      semNum: 48,
      contNum: dossier.contNum,
      theme: 'UM sans attendu',
    })
    await f.createRepartition(ctx.db, {
      atelierId: fixed.id,
      contNum: dossier.contNum,
      semAnnee: 2026,
      semNum: 48,
      theme: 'Préparation sans UM',
    })
    const response = await get(ctx, '/api/pilotage/dashboard?depart=2026-W48', own.headers)
    expect(response.statusCode).toBe(200)
    const result = DashboardSchema.parse(response.json())
    expect(result.kpis).toMatchObject({
      total: 2,
      ready: 1,
      waiting: 1,
      completed: 1,
      progress: 0.5,
      expected: 2,
      received: 2,
      remaining: 0,
      unknownCoverage: 1,
    })
    expect(result.gaps).toMatchObject({ unmaterializedPreparations: 1, withoutDeparture: 2 })
    expect(
      (await ctx.db.uniteManutention.findUniqueOrThrow({ where: { id: um.id } })).version,
    ).toBe(1)
    expect(await ctx.db.faceTrain.count({ where: { trainId, statut: 'INSTRUCTION_OK' } })).toBe(2)
    expect(
      await ctx.db.affiche.count({
        where: { plateformeId: own.plateforme.id, validationAdmin: false },
      }),
    ).toBe(2)
  })
  it('applique plateforme, atelier, année et validation des filtres côté serveur', async () => {
    const own = await site(ctx, ['coord'])
    const foreign = await site(ctx, ['coord'])
    const workshop = await f.createAtelier(ctx.db, { plateformeId: foreign.plateforme.id })
    await f.createUniteManutention(ctx.db, {
      atelierId: workshop.id,
      statut: 'TERMINE',
      semAnnee: 2026,
      semNum: 48,
    })
    const response = await get(ctx, '/api/pilotage/dashboard?depart=2026-W48', own.headers)
    expect(DashboardSchema.parse(response.json()).kpis.total).toBe(0)
    expect(
      (await get(ctx, '/api/pilotage/dashboard?depart=2026-W99', own.headers)).statusCode,
    ).toBe(400)
    expect((await get(ctx, '/api/pilotage/dashboard?atelier=-1', own.headers)).statusCode).toBe(400)
    expect((await get(ctx, '/api/pilotage/dashboard', {})).statusCode).toBe(401)
    const noRole = await site(ctx, [])
    expect((await get(ctx, '/api/pilotage/dashboard', noRole.headers)).statusCode).toBe(403)
  })
  it('Pré-Prod saisit une prévision auditée et idempotente sans changer la ligne de réception ; les autres profils consultent', async () => {
    const own = await site(ctx, ['coord'])
    const workshop = await f.createAtelier(ctx.db, { plateformeId: own.plateforme.id })
    const expected = await f.createReceptionAttendue(ctx.db, {
      plateformeId: own.plateforme.id,
      supportId: own.support.id,
      atelierId: workshop.id,
      semAnnee: 2026,
      semNum: 48,
      theme: 'Prévision test',
    })
    const path = `/api/pilotage/dashboard/visuels/${expected.id}/livraison`
    expect(
      (await post(ctx, path, own.headers, { version: 0, date: '2026-02-30', comment: '' }))
        .statusCode,
    ).toBe(400)
    const payload = { version: 0, date: '2026-12-01', comment: 'Confirmation imprimeur' }
    const headers = { ...own.headers, ...idem() }
    const first = await ctx.app.inject({ method: 'POST', url: path, headers, payload })
    expect(first.statusCode).toBe(200)
    expect(DeliveryForecastSchema.parse(first.json())).toMatchObject({
      expectedLineId: expected.id,
      date: payload.date,
      comment: payload.comment,
      version: 1,
    })
    const replay = await ctx.app.inject({ method: 'POST', url: path, headers, payload })
    expect(replay.statusCode).toBe(200)
    expect(replay.json()).toEqual(first.json())
    expect((await post(ctx, path, own.headers, payload)).statusCode).toBe(409)
    const stored = await ctx.db.productionDeliveryForecast.findUniqueOrThrow({
      where: { expectedLineId: expected.id },
    })
    expect(
      await ctx.db.journalAudit.count({
        where: { typeEntite: 'REFERENTIEL', entiteId: `production-delivery:${stored.id}` },
      }),
    ).toBe(1)
    expect(
      await ctx.db.receptionAttendue.findUniqueOrThrow({ where: { id: expected.id } }),
    ).toMatchObject({ version: expected.version, statut: expected.statut, qteBc: expected.qteBc })
    const view = DashboardSchema.parse(
      (await get(ctx, `/api/pilotage/dashboard?dossier=${expected.contNum}`, own.headers)).json(),
    )
    expect(view.visuals.find((v) => v.id === String(expected.id))).toMatchObject({
      forecast: payload.date,
      forecastComment: payload.comment,
      forecastVersion: 1,
    })
    const reader = await autre(ctx, own.plateforme.id, ['cheq'])
    expect((await post(ctx, path, reader.headers, { ...payload, version: 1 })).statusCode).toBe(403)
    const elsewhere = await site(ctx, ['coord'])
    expect((await post(ctx, path, elsewhere.headers, { ...payload, version: 1 })).statusCode).toBe(
      403,
    )
  })
})
