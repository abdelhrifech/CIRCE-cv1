import { beforeAll, afterAll, it, expect } from 'vitest'
import { WorkshopConfigurationsSchema, WorkshopConfigurationSchema } from '@circe/shared'
import { contexteReception, site, autre, get, post } from '../support/reception.ts'
import * as f from '../factories/index.ts'
const ctx = contexteReception()
beforeAll(() => ctx.demarrer())
afterAll(() => ctx.arreter())
it('EX-ADM-NEW-005 associations et gamme persistées, autorisation admin, références/critères/version vérifiés sans modifier l’atelier opérationnel', async () => {
  const s = await site(ctx)
  const admin = await autre(ctx, s.plateforme.id, ['admin'])
  const atelier = await f.createAtelier(ctx.db, { plateformeId: s.plateforme.id, type: 'SCROLL' })
  const format = s.support
  const machine = await ctx.db.machineConfiguration.create({
    data: { nom: `Machine configuration ${s.plateforme.id}`, type: 'Roulage' },
  })
  const before = await ctx.db.atelier.findUniqueOrThrow({ where: { id: atelier.id } })
  const body = {
    version: 0,
    productionFlow: 'SCROLL_VENDOME',
    formatIds: [format.id],
    machineIds: [machine.id],
    productionSteps: [{ label: 'Roulage', statusLabel: 'En production' }],
    schedulingCriteria: ['FULL_RECEIPT', 'DESTINATION'],
  }
  const url = `/api/admin/workshop-configurations/${atelier.id}`
  expect((await get(ctx, '/api/admin/workshop-configurations', s.headers)).statusCode).toBe(403)
  expect((await post(ctx, url, s.headers, body)).statusCode).toBe(403)
  for (const change of [{ formatIds: [99999999] }, { machineIds: [99999999] }])
    expect((await post(ctx, url, admin.headers, { ...body, ...change })).statusCode).toBe(422)
  expect(
    (await post(ctx, url, admin.headers, { ...body, schedulingCriteria: ['RECEIPT'] })).statusCode,
  ).toBe(400)
  expect(
    (await post(ctx, '/api/admin/workshop-configurations/99999999', admin.headers, body))
      .statusCode,
  ).toBe(404)
  const created = await post(ctx, url, admin.headers, body)
  expect(created.statusCode).toBe(200)
  const config = WorkshopConfigurationSchema.parse(created.json())
  const catalogue = WorkshopConfigurationsSchema.parse(
    (await get(ctx, '/api/admin/workshop-configurations', admin.headers)).json(),
  )
  expect(catalogue.configurations).toContainEqual(config)
  const edit = {
    ...body,
    version: config.version,
    schedulingCriteria: ['DESTINATION', 'FULL_RECEIPT'],
  }
  expect((await post(ctx, url, admin.headers, edit)).statusCode).toBe(200)
  expect((await post(ctx, url, admin.headers, edit)).statusCode).toBe(409)
  expect(await ctx.db.atelier.findUniqueOrThrow({ where: { id: atelier.id } })).toEqual(before)
  expect(
    await ctx.db.journalAudit.count({
      where: {
        typeEntite: 'REFERENTIEL',
        entiteId: `workshop-configuration:${atelier.id}`,
        parId: admin.user.id,
      },
    }),
  ).toBe(2)
})
