import { describe, expect, it, vi } from 'vitest'
import { TransportDonneesSchema, type TransportBoucle } from '@circe/shared'
import type { Tx } from '../../core/transaction.ts'
import type { Identity } from '../../core/identity.ts'
import { boucleUnique } from './departs.ts'
import { demanderSuiviGeodis } from './geodis.ts'
import { importerTransport } from './actions.ts'

const donnees = {
  canal: 'MILK_RUN' as const,
  boucleId: null,
  numeroSuivi: 'SUIVI-REEL',
  recepisse: 'RECEPISSE-DISTINCT',
  etatTransporteur: null,
  dateEtat: null,
  dateLivraison: null,
  preuveUrl: null,
  images: [],
  suiviUrl: null,
  provenance: 'Document transporteur vérifié',
  referenceSource: 'archive/releve-2026-11',
}
const admin: Identity = {
  userId: 1,
  identifiantExterne: 'admin-test',
  nom: 'Admin',
  roles: ['admin'],
  siteId: 2,
  perimetre: { toutesPlateformes: true, plateformeIds: [], lignes: [] },
}
const boucle: TransportBoucle = {
  id: 1,
  plateformeId: 2,
  nom: 'Boucle réelle',
  canal: 'MILK_RUN',
  jour: 2,
  heure: '14:30',
  destinataires: [42],
}
function transaction(rows: unknown[] = []) {
  return {
    colis: {
      findUnique: vi.fn().mockResolvedValue({
        id: 9,
        plateformeId: 2,
        atelierId: 3,
        destinataireId: 42,
        createdAt: new Date('2026-11-21T09:00:00Z'),
        codeColis: 'C-9',
      }),
    },
    $queryRaw: vi.fn().mockResolvedValue(rows),
    $executeRaw: vi.fn().mockResolvedValue(1),
    journalAudit: { create: vi.fn().mockResolvedValue({}) },
  }
}
describe('Transport explicite indépendant de Coordination', () => {
  it('sépare suivi/récépissé et refuse une preuve sans date attestée ou URL inventée de protocole actif', () => {
    expect(TransportDonneesSchema.parse(donnees).numeroSuivi).not.toBe(donnees.recepisse)
    expect(
      TransportDonneesSchema.safeParse({
        ...donnees,
        preuveUrl: 'https://transporteur.example/preuve',
      }).success,
    ).toBe(false)
    expect(
      TransportDonneesSchema.safeParse({ ...donnees, suiviUrl: 'javascript:alert(1)' }).success,
    ).toBe(false)
    expect(
      TransportDonneesSchema.safeParse({ ...donnees, etatTransporteur: 'Libellé original' })
        .success,
    ).toBe(false)
    expect(TransportDonneesSchema.safeParse({ ...donnees, provenance: '' }).success).toBe(false)
  })
  it('ne choisit pas de boucle si le site, la destination ou le canal sont ambigus', () => {
    expect(boucleUnique([boucle], [2], 42)?.id).toBe(1)
    expect(boucleUnique([boucle], [99], 42)).toBeNull()
    expect(boucleUnique([boucle], [2], 99)).toBeNull()
    expect(boucleUnique([boucle, { ...boucle, id: 2, canal: 'MESSAGERIE' }], [2], 42)).toBeNull()
  })
  it('Geodis non configuré échoue explicitement sans fournir de faux suivi', () => {
    expect(demanderSuiviGeodis).toThrow(
      expect.objectContaining({ code: 'TRANSPORT_GEODIS_NON_CONFIGURE', httpStatus: 503 }),
    )
  })
  it('import admin persiste et audite seulement les métadonnées, sans modifier le colis', async () => {
    const tx = transaction()
    const r = await importerTransport(tx as unknown as Tx, admin, {
      colisId: 9,
      version: 0,
      donnees,
    })
    expect(r.version).toBe(1)
    expect(tx.$executeRaw).toHaveBeenCalledOnce()
    expect(tx.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ typeEntite: 'COLIS', parId: 1 }) as unknown,
      }),
    )
    expect(Object.keys(tx.colis)).toEqual(['findUnique'])
  })
  it('refuse droits, site actif incohérent et version périmée avant toute écriture', async () => {
    const tx = transaction([
      {
        colisId: 9,
        version: 2,
        donnees: JSON.stringify({
          ...donnees,
          _colis: { createdAt: '2026-11-21T09:00:00.000Z', code: 'C-9' },
        }),
        verifieLe: '2026-11-21T10:00:00Z',
      },
    ])
    await expect(
      importerTransport(
        tx as unknown as Tx,
        { ...admin, roles: ['expe'] },
        { colisId: 9, version: 2, donnees },
      ),
    ).rejects.toMatchObject({ httpStatus: 403 })
    await expect(
      importerTransport(
        tx as unknown as Tx,
        { ...admin, siteId: 99 },
        { colisId: 9, version: 2, donnees },
      ),
    ).rejects.toMatchObject({ httpStatus: 403 })
    await expect(
      importerTransport(tx as unknown as Tx, admin, { colisId: 9, version: 1, donnees }),
    ).rejects.toMatchObject({ httpStatus: 409 })
    expect(tx.$executeRaw).not.toHaveBeenCalled()
  })
  it('refuse la réassociation silencieuse après suppression et recréation du même identifiant', async () => {
    const tx = transaction([
      {
        colisId: 9,
        version: 1,
        donnees: JSON.stringify({
          ...donnees,
          _colis: { createdAt: '2020-01-01T00:00:00.000Z', code: 'C-9' },
        }),
        verifieLe: '2020-01-01T00:00:00Z',
      },
    ])
    await expect(
      importerTransport(tx as unknown as Tx, admin, { colisId: 9, version: 1, donnees }),
    ).rejects.toThrow('Réassociation automatique interdite')
    expect(tx.$executeRaw).not.toHaveBeenCalled()
    expect(tx.journalAudit.create).not.toHaveBeenCalled()
  })
})
