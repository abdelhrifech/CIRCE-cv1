import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { MouvementsStocksSchema, StocksSchema } from '@circe/shared'
import { contexteReception, site, get } from '../support/reception.ts'
import * as f from '../factories/index.ts'
const ctx = contexteReception()
beforeAll(() => ctx.demarrer())
afterAll(() => ctx.arreter())
describe('EX-STK-NEW-001 filtres de mouvements avant pagination', () => {
  it('filtre plusieurs types et auteurs, calcule les facettes sur toutes les pages et garde les KPI du stock', async () => {
    const s = await site(ctx)
    const a = await f.createAffiche(ctx.db, { plateformeId: s.plateforme.id, quantite: 100 })
    const now = new Date()
    await f.createMouvement(ctx.db, { afficheId: a.id, quantite: 100, createdById: s.user.id })
    await f.createMouvement(ctx.db, {
      afficheId: a.id,
      quantite: -4,
      type: 'MISE_AU_REBUT',
      createdById: s.user.id,
    })
    await f.createMouvement(ctx.db, {
      afficheId: a.id,
      quantite: -7,
      type: 'EXPEDITION',
      auto: true,
      date: now,
    })
    await f.createMouvement(ctx.db, {
      afficheId: a.id,
      quantite: -3,
      type: 'EXPEDITION',
      auto: true,
      date: new Date(now.getTime() - 2 * 86400000),
    })
    const query = new URLSearchParams({
      types: JSON.stringify(['EXPEDITION', 'MISE_AU_REBUT']),
      pageSize: '1',
    })
    const response = await get(ctx, `/api/stocks/mouvements?${query.toString()}`, s.headers)
    expect(response.statusCode, response.body).toBe(200)
    const data = MouvementsStocksSchema.parse(response.json())
    expect(data.items).toHaveLength(1)
    expect(data.total).toBe(3)
    expect(data.facets?.type).toEqual(
      expect.arrayContaining([
        { value: 'RECEPTION', label: 'RECEPTION', count: 1 },
        { value: 'EXPEDITION', label: 'EXPEDITION', count: 2 },
      ]),
    )
    query.set('auteurs', JSON.stringify(['Automatique']))
    const automatic = MouvementsStocksSchema.parse(
      (await get(ctx, `/api/stocks/mouvements?${query.toString()}`, s.headers)).json(),
    )
    expect(automatic.total).toBe(2)
    const stock = StocksSchema.parse((await get(ctx, '/api/stocks', s.headers)).json())
    expect(stock.items.find((row) => row.id === a.id)?.sortiesAujourdhui).toBe(7)
    expect(stock.indicateurs.sortiesAujourdhui).toBe(7)
    expect((await get(ctx, '/api/stocks/mouvements?types=invalid', s.headers)).statusCode).toBe(400)
  })
})
