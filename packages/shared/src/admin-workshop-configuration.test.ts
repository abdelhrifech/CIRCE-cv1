import { describe, expect, it } from 'vitest'
import { WorkshopConfigurationInputSchema, WorkshopConfigurationSchema } from './admin-maquette.ts'
const configuration = {
  version: 0,
  productionFlow: 'SCROLL_VENDOME',
  formatIds: [1],
  machineIds: [2],
  productionSteps: [{ label: 'Roulage', statusLabel: 'En production' }],
  schedulingCriteria: [
    'FULL_RECEIPT',
    'DESTINATION',
    'PRODUCTION_DAY',
    'DRAWER_COUNT',
    'SHEETS_PER_DRAWER',
  ],
}
describe('EX-ADM-NEW-005 métadonnées des ateliers', () => {
  it('conserve les critères déroulants de Kickoff p.73 et leur ordre choisi', () => {
    expect(
      WorkshopConfigurationSchema.parse({ ...configuration, id: 1, workshopId: 3 })
        .schedulingCriteria,
    ).toEqual(configuration.schedulingCriteria)
  })
  it('refuse les références et critères dupliqués', () => {
    for (const values of [
      { formatIds: [1, 1] },
      { machineIds: [2, 2] },
      { schedulingCriteria: ['DESTINATION', 'DESTINATION'] },
    ])
      expect(
        WorkshopConfigurationInputSchema.safeParse({ ...configuration, ...values }).success,
      ).toBe(false)
  })
  it('fixe et pliage admettent reçu/jour/destination mais pas les tiroirs', () => {
    for (const productionFlow of ['FIXED', 'FOLDING']) {
      expect(
        WorkshopConfigurationInputSchema.safeParse({
          ...configuration,
          productionFlow,
          schedulingCriteria: ['RECEIPT', 'PRODUCTION_DAY', 'DESTINATION'],
        }).success,
      ).toBe(true)
      expect(
        WorkshopConfigurationInputSchema.safeParse({
          ...configuration,
          productionFlow,
          schedulingCriteria: ['DRAWER_COUNT'],
        }).success,
      ).toBe(false)
    }
  })
  it('Bus ne reçoit aucun ordonnancement inventé ; valeurs négatives et libellés vides rejetés', () => {
    expect(
      WorkshopConfigurationInputSchema.safeParse({
        ...configuration,
        productionFlow: 'BUS',
        schedulingCriteria: [],
      }).success,
    ).toBe(true)
    for (const values of [
      { productionFlow: 'BUS' },
      { version: -1 },
      { formatIds: [-1] },
      { productionSteps: [{ label: ' ', statusLabel: 'Prêt' }] },
    ])
      expect(
        WorkshopConfigurationInputSchema.safeParse({ ...configuration, ...values }).success,
      ).toBe(false)
  })
})
