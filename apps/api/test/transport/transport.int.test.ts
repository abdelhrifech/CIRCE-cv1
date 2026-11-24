import { ErrorResponseSchema } from '@circe/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { contexteReception, get, post, site } from '../support/reception.ts'
const ctx = contexteReception()
beforeAll(() => ctx.demarrer())
afterAll(() => ctx.arreter())
describe('Transport : autorisations et indisponibilité réelle', () => {
  it('refuse la consultation sans permission et ne simule aucun appel Geodis', async () => {
    const recep = await site(ctx, ['recep']),
      expe = await site(ctx, ['expe'])
    expect((await get(ctx, '/api/transport/colis', recep.headers)).statusCode).toBe(403)
    const r = await post(ctx, '/api/transport/geodis/actualiser', expe.headers, {})
    expect(r.statusCode).toBe(503)
    expect(ErrorResponseSchema.parse(r.json()).code).toBe('TRANSPORT_GEODIS_NON_CONFIGURE')
  })
  it('refuse la saisie par un profil expédition même muni d’une clé idempotente', async () => {
    const expe = await site(ctx, ['expe'])
    const r = await post(ctx, '/api/transport/colis/import', expe.headers, {
      colisId: 99999,
      version: 0,
      donnees: {
        canal: 'MILK_RUN',
        boucleId: null,
        numeroSuivi: null,
        recepisse: null,
        etatTransporteur: null,
        dateEtat: null,
        dateLivraison: null,
        preuveUrl: null,
        images: [],
        suiviUrl: null,
        provenance: 'Source réelle',
        referenceSource: 'Document 1',
      },
    })
    expect(r.statusCode).toBe(403)
  })
})
