import { describe, expect, it, vi } from 'vitest'
import type { Tx } from '../../core/transaction.ts'
import type { Identity } from '../../core/identity.ts'
import { sauverConfigurationAtelier } from './configuration-atelier.ts'
import { ecrireJournal } from '../../core/tracabilite.ts'
vi.mock('../../core/tracabilite.ts', () => ({ ecrireJournal: vi.fn() }))
const input = {
  version: 0,
  productionFlow: 'SCROLL_VENDOME' as const,
  formatIds: [10],
  machineIds: [20],
  productionSteps: [{ label: 'Roulage', statusLabel: 'En production' }],
  schedulingCriteria: ['FULL_RECEIPT' as const, 'DESTINATION' as const],
}
const identity: Identity = {
  userId: 1,
  identifiantExterne: 'admin',
  nom: null,
  roles: ['admin'],
  siteId: null,
  perimetre: { toutesPlateformes: true, plateformeIds: [], lignes: [] },
}
function context() {
  const row = {
    id: 1,
    workshopId: 5,
    version: 1,
    productionFlow: input.productionFlow,
    formatIds: JSON.stringify(input.formatIds),
    machineIds: JSON.stringify(input.machineIds),
    productionSteps: JSON.stringify(input.productionSteps),
    schedulingCriteria: JSON.stringify(input.schedulingCriteria),
  }
  const db = {
    atelier: { findUnique: vi.fn().mockResolvedValue({ id: 5 }) },
    categorieSupport: { count: vi.fn().mockResolvedValue(1) },
    machineConfiguration: { count: vi.fn().mockResolvedValue(1) },
    workshopConfiguration: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...row, version: 2 }),
    },
  }
  return { db, tx: db as unknown as Tx, row }
}
describe('EX-ADM-NEW-005 configuration atelier indépendante', () => {
  it('enregistre les métadonnées contrôlées et audite avant/après', async () => {
    const { db, tx } = context()
    expect(await sauverConfigurationAtelier(tx, identity, 5, input)).toMatchObject({
      workshopId: 5,
      formatIds: [10],
      machineIds: [20],
      version: 1,
    })
    expect(db.workshopConfiguration.create.mock.calls).toEqual([
      [
        {
          data: {
            workshopId: 5,
            productionFlow: input.productionFlow,
            formatIds: '[10]',
            machineIds: '[20]',
            productionSteps: JSON.stringify(input.productionSteps),
            schedulingCriteria: JSON.stringify(input.schedulingCriteria),
          },
        },
      ],
    ])
    const journal = vi.mocked(ecrireJournal).mock.lastCall?.[1]
    expect(journal).toMatchObject({ ancienneValeur: null, parId: 1 })
    expect(journal?.nouvelleValeur).toContain('FULL_RECEIPT')
  })
  it.each(['recep', 'coord', 'cheq', 'expe', 'com'] as const)(
    'refuse %s avant tout accès au référentiel',
    async (role) => {
      const { db, tx } = context()
      await expect(
        sauverConfigurationAtelier(tx, { ...identity, roles: [role] }, 5, input),
      ).rejects.toThrow('Réservé')
      expect(db.atelier.findUnique).not.toHaveBeenCalled()
    },
  )
  it('refuse atelier absent et références inexistantes sans écriture', async () => {
    for (const missing of ['atelier', 'format', 'machine']) {
      const { db, tx } = context()
      if (missing === 'atelier') db.atelier.findUnique.mockResolvedValue(null)
      if (missing === 'format') db.categorieSupport.count.mockResolvedValue(0)
      if (missing === 'machine') db.machineConfiguration.count.mockResolvedValue(0)
      await expect(sauverConfigurationAtelier(tx, identity, 5, input)).rejects.toThrow(
        /introuvable|inconnu/,
      )
      expect(db.workshopConfiguration.create).not.toHaveBeenCalled()
    }
  })
  it('refuse les critères incompatibles même lors d’un appel direct au service', async () => {
    const { db, tx } = context()
    await expect(
      sauverConfigurationAtelier(tx, identity, 5, { ...input, productionFlow: 'FIXED' }),
    ).rejects.toThrow()
    expect(db.atelier.findUnique).not.toHaveBeenCalled()
  })
  it('refuse une version initiale non nulle et une modification concurrente', async () => {
    const first = context()
    await expect(
      sauverConfigurationAtelier(first.tx, identity, 5, { ...input, version: 1 }),
    ).rejects.toThrow('Version initiale')
    const second = context()
    second.db.workshopConfiguration.findUnique.mockResolvedValue(second.row)
    second.db.workshopConfiguration.updateMany.mockResolvedValue({ count: 0 })
    await expect(
      sauverConfigurationAtelier(second.tx, identity, 5, { ...input, version: 1 }),
    ).rejects.toThrow('entre-temps')
    expect(second.db.workshopConfiguration.create).not.toHaveBeenCalled()
  })
  it('modifie une configuration avec verrou optimiste sans toucher au modèle Atelier', async () => {
    const { db, tx, row } = context()
    db.workshopConfiguration.findUnique.mockResolvedValue(row)
    expect(
      await sauverConfigurationAtelier(tx, identity, 5, { ...input, version: 1 }),
    ).toMatchObject({ version: 2 })
    expect(db.workshopConfiguration.updateMany).toHaveBeenCalledWith({
      where: { workshopId: 5, version: 1 },
      data: {
        productionFlow: input.productionFlow,
        formatIds: '[10]',
        machineIds: '[20]',
        productionSteps: JSON.stringify(input.productionSteps),
        schedulingCriteria: JSON.stringify(input.schedulingCriteria),
        version: { increment: 1 },
      },
    })
  })
})
