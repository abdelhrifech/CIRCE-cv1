import { z } from 'zod'
export const JournalAdminQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  action: z.string().max(100).optional(),
  objet: z.string().max(100).optional(),
  du: z.iso.date().optional(),
  au: z.iso.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
})
export const JournalAdminSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      date: z.string(),
      par: z.string(),
      objet: z.string(),
      identifiant: z.string(),
      action: z.string(),
      detail: z.string().nullable(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})
export const CatalogueStatutsSchema = z.object({
  items: z.array(
    z.object({
      cle: z.string(),
      domaine: z.string(),
      libelle: z.string(),
      origine: z.string(),
      description: z.string(),
      ecran: z.string(),
    }),
  ),
})
export const TransportAdminQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
})
export const TransportAdminSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  items: z.array(
    z.object({
      id: z.number(),
      site: z.string(),
      atelier: z.string(),
      destinataire: z.string(),
      transporteur: z.number(),
      tarif: z.string(),
    }),
  ),
})

export const MachineConfigurationInputSchema = z.object({
  version: z.number().int().nonnegative(),
  nom: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(100),
  fichier: z.boolean(),
  tiroirsMax: z.number().int().min(1).max(1000).nullable(),
  sortie: z.string().trim().max(200).nullable(),
  repertoire: z.string().trim().max(1000).nullable(),
  bagues: z.string().trim().max(200).nullable(),
})
export const MachineConfigurationSchema = MachineConfigurationInputSchema.extend({
  id: z.number().int().positive(),
})
export const MachinesAdminSchema = z.object({
  machines: z.array(MachineConfigurationSchema),
  parametres: z.array(z.object({ cle: z.string(), valeur: z.string() })),
})
export const BoucleTransportInputSchema = z.object({
  version: z.number().int().nonnegative(),
  plateformeId: z.number().int().positive(),
  nom: z.string().trim().min(1).max(100),
  canal: z.enum(['MILK_RUN', 'MESSAGERIE']),
  jour: z.number().int().min(0).max(7),
  heure: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  destinataires: z.array(z.number().int().positive()).max(500),
})
export const BoucleTransportSchema = BoucleTransportInputSchema.extend({
  id: z.number().int().positive(),
  site: z.string(),
  destinations: z.array(z.string()),
})
export const BouclesTransportSchema = z.object({
  items: z.array(BoucleTransportSchema),
  sites: z.array(z.object({ id: z.number(), nom: z.string() })),
  destinataires: z.array(z.object({ id: z.number(), nom: z.string() })),
})

export const DistributionInputSchema = z.object({
  version: z.number().int().nonnegative(),
  nom: z.string().trim().min(1).max(200),
  plateformeId: z.number().int().positive().nullable(),
  roles: z
    .array(z.enum(['coord', 'cheq', 'recep', 'expe', 'admin', 'com']))
    .min(1)
    .max(6),
  usage: z.string().trim().min(1).max(1000),
})
export const DistributionSchema = DistributionInputSchema.extend({
  id: z.number().int().positive(),
  site: z.string().nullable(),
})
export const DistributionsSchema = z.object({
  items: z.array(DistributionSchema),
  sites: z.array(z.object({ id: z.number(), nom: z.string() })),
})

// EX-ADM-NEW-005 — parametrage.js:222–233, Kickoff p.73. Métadonnées sans effet moteur.
export const ProductionFlowSchema = z.enum([
  'SCROLL_VENDOME',
  'SCROLL_OTHER',
  'FIXED',
  'FOLDING',
  'BUS',
])
export const SchedulingCriterionSchema = z.enum([
  'FULL_RECEIPT',
  'RECEIPT',
  'DESTINATION',
  'PRODUCTION_DAY',
  'DRAWER_COUNT',
  'SHEETS_PER_DRAWER',
])
export const PRODUCTION_FLOW_LABELS: Record<z.infer<typeof ProductionFlowSchema>, string> = {
  SCROLL_VENDOME: 'Déroulant sur Vendôme',
  SCROLL_OTHER: 'Déroulant hors Vendôme',
  FIXED: '2 m² fixe',
  FOLDING: 'Colle / pliage',
  BUS: 'Bus',
}
export const SCHEDULING_CRITERION_LABELS: Record<
  z.infer<typeof SchedulingCriterionSchema>,
  string
> = {
  FULL_RECEIPT: 'Reçu à 100 %',
  RECEIPT: 'Reçu',
  DESTINATION: 'Destination',
  PRODUCTION_DAY: 'Jour de production',
  DRAWER_COUNT: 'Nombre de tiroirs',
  SHEETS_PER_DRAWER: 'Affiches par tiroir',
}
export function schedulingCriteriaFor(flow: z.infer<typeof ProductionFlowSchema>) {
  if (flow === 'SCROLL_VENDOME' || flow === 'SCROLL_OTHER')
    return SchedulingCriterionSchema.options.filter((criterion) => criterion !== 'RECEIPT')
  if (flow === 'FIXED' || flow === 'FOLDING')
    return SchedulingCriterionSchema.options.filter((criterion) =>
      ['RECEIPT', 'PRODUCTION_DAY', 'DESTINATION'].includes(criterion),
    )
  // TODO(question-ouverte): Kickoff p.73 ne définit pas l’ordonnancement Bus.
  return []
}
const uniqueIds = z
  .array(z.number().int().positive())
  .max(500)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    'Une référence ne peut apparaître qu’une fois.',
  )
export const WorkshopConfigurationInputSchema = z
  .object({
    version: z.number().int().nonnegative(),
    productionFlow: ProductionFlowSchema,
    formatIds: uniqueIds,
    machineIds: uniqueIds,
    productionSteps: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(200),
          statusLabel: z.string().trim().min(1).max(100),
        }),
      )
      .max(50),
    schedulingCriteria: z.array(SchedulingCriterionSchema).max(6),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.schedulingCriteria).size !== value.schedulingCriteria.length)
      ctx.addIssue({
        code: 'custom',
        path: ['schedulingCriteria'],
        message: 'Un critère ne peut apparaître qu’une fois.',
      })
    const allowed = schedulingCriteriaFor(value.productionFlow)
    if (value.schedulingCriteria.some((criterion) => !allowed.includes(criterion)))
      ctx.addIssue({
        code: 'custom',
        path: ['schedulingCriteria'],
        message: 'Critère non défini pour ce mode de fabrication.',
      })
  })
export const WorkshopConfigurationSchema = WorkshopConfigurationInputSchema.safeExtend({
  id: z.number().int().positive(),
  workshopId: z.number().int().positive(),
})
export const WorkshopConfigurationsSchema = z.object({
  configurations: z.array(WorkshopConfigurationSchema),
  workshops: z.array(
    z.object({ id: z.number(), label: z.string(), site: z.string(), type: z.string() }),
  ),
  formats: z.array(z.object({ id: z.number(), label: z.string() })),
  machines: z.array(z.object({ id: z.number(), label: z.string() })),
})
