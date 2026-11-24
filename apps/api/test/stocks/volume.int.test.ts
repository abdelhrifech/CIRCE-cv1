import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DashboardSchema, StocksSchema } from '@circe/shared'
import { contexteReception, get, site } from '../support/reception.ts'
import * as f from '../factories/index.ts'
const ctx = contexteReception()
beforeAll(() => ctx.demarrer())
afterAll(() => ctx.arreter())
describe('EX-MISSION-VOL-001 lectures administrateur au-delà de 999 identifiants SQLite', () => {
  it('lit tout le stock et ses relations triées sans tronquer les affiches', async () => {
    const own = await site(ctx, ['admin'])
    const poster = await f.createAffiche(ctx.db, {
      plateformeId: own.plateforme.id,
      supportId: own.support.id,
      quantite: 0,
    })
    await ctx.db.affiche.createMany({
      data: Array.from({ length: 1001 }, (_, index) => ({
        ...poster,
        id: undefined,
        theme: `Volume ${index}`,
      })),
    })
    const response = await get(ctx, '/api/stocks', own.headers)
    expect(response.statusCode, response.body).toBe(200)
    const data = StocksSchema.parse(response.json())
    expect(data.items.filter((row) => row.plateformeId === own.plateforme.id)).toHaveLength(1002)
    expect(new Set(data.items.map((row) => row.id)).size).toBe(data.items.length)
  })
  it('conserve un visuel quand le périmètre contient plus de mille ateliers', async () => {
    const own = await site(ctx, ['admin'])
    await ctx.db.atelier.createMany({
      data: Array.from({ length: 1001 }, (_, index) => ({
        plateformeId: own.plateforme.id,
        libelle: `Atelier volume ${index}`,
        type: 'FIXE' as const,
      })),
    })
    const workshop = await f.createAtelier(ctx.db, { plateformeId: own.plateforme.id })
    const dossier = await f.createDossier(ctx.db)
    const expected = await f.createReceptionAttendue(ctx.db, {
      plateformeId: own.plateforme.id,
      supportId: own.support.id,
      atelierId: workshop.id,
      contNum: dossier.contNum,
      theme: 'Volume attendu',
    })
    const response = await get(
      ctx,
      `/api/pilotage/dashboard?dossier=${dossier.contNum}`,
      own.headers,
    )
    expect(response.statusCode, response.body).toBe(200)
    expect(DashboardSchema.parse(response.json()).visuals.map((row) => row.id)).toContain(
      String(expected.id),
    )
  })
})
