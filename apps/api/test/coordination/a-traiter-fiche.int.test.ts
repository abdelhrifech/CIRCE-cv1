// RG-COO-309 / RG-COO-167 — tests d'INTÉGRATION : « À traiter » (2 m² fixe) liste un dossier dès qu'il a une répartition
// à traiter, non retirée, d'un atelier FIXE du périmètre, même sans instruction ni ligne attendue ; la fiche de ce
// dossier s'ouvre (la liste propose « Ouvrir le dossier »), et reste refusée hors périmètre ou sans répartition à traiter.
// Source : docs/COORDINATION_REGLES_METIER.md RG-COO-309, RG-COO-167. API réelle sur la base de test, données isolées.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FicheDossierSchema, ListeDossiersSchema } from '@circe/shared'
import * as f from '../factories/index.ts'
import { contexteReception, erreur, get, site } from '../support/reception.ts'

const ctx = contexteReception()
const { db } = ctx
const purge = { contNums: [] as number[] }

beforeAll(() => ctx.demarrer())
afterAll(async () => {
  await db.repartition.deleteMany({ where: { contNum: { in: purge.contNums } } })
  await db.dossier.deleteMany({ where: { contNum: { in: purge.contNums } } })
  await ctx.arreter()
})

/** Site + atelier FIXE + coordinateur ; dossier sans instruction ni ligne attendue, une répartition sur l'atelier. */
async function dossierATraiter(statut: 'A_TRAITER' | 'EN_COURS' = 'A_TRAITER') {
  const s = await site(ctx, ['coord'])
  const atelier = await f.createAtelier(db, { plateformeId: s.plateforme.id, type: 'FIXE' })
  const contNum = 8_000_000 + Math.floor(Math.random() * 900_000)
  purge.contNums.push(contNum)
  const dossier = await f.createDossier(db, { contNum, statut: 'PREPARATION_RECUE' })
  await f.createRepartition(db, {
    atelierId: atelier.id,
    contNum,
    theme: 'Thème à traiter',
    statut,
    semAnnee: 2026,
    semNum: 49,
  })
  return { ...s, atelier, dossier, contNum }
}

describe('RG-COO-309 « À traiter » : dossier listé par sa seule répartition à traiter', () => {
  it('RG-COO-309 le dossier est listé et sa fiche s’ouvre pour la Coordination du site', async () => {
    const c = await dossierATraiter()
    const liste = ListeDossiersSchema.parse(
      (
        await get(
          ctx,
          `/api/coordination/dossiers?pour=FIXE&dossier=${String(c.contNum)}`,
          c.headers,
        )
      ).json(),
    )
    expect(liste.items.map((d) => d.dossier)).toEqual([c.contNum])
    expect(liste.items[0]?.lignesPreparation).toHaveLength(1)
    const r = await get(ctx, `/api/coordination/dossiers/${String(c.dossier.id)}`, c.headers)
    expect(r.statusCode).toBe(200)
    expect(FicheDossierSchema.parse(r.json()).dossier).toBe(c.contNum)
  })

  it('RG-COO-167 refuse la fiche (403) à un coordinateur d’un autre site, qui ne voit pas le dossier', async () => {
    const c = await dossierATraiter()
    const ailleurs = await site(ctx, ['coord'])
    const liste = ListeDossiersSchema.parse(
      (
        await get(
          ctx,
          `/api/coordination/dossiers?pour=FIXE&dossier=${String(c.contNum)}`,
          ailleurs.headers,
        )
      ).json(),
    )
    expect(liste.items).toHaveLength(0)
    const r = await get(ctx, `/api/coordination/dossiers/${String(c.dossier.id)}`, ailleurs.headers)
    expect(r.statusCode).toBe(403)
    expect(erreur(r).regle).toBe('RG-COO-167')
  })

  it('RG-COO-309 refuse la fiche (403) quand la répartition n’est plus à traiter (ni instruction ni ligne du site)', async () => {
    const c = await dossierATraiter('EN_COURS')
    const r = await get(ctx, `/api/coordination/dossiers/${String(c.dossier.id)}`, c.headers)
    expect(r.statusCode).toBe(403)
    expect(erreur(r).regle).toBe('RG-COO-167')
  })
})
