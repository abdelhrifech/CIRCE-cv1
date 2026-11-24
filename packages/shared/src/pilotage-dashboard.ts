import { z } from 'zod'
import { AlertePilotageSchema } from './alertes.ts'
import { SemaineIsoSchema } from './reception/attendues.ts'

// SP-01 / suivi.js : les comptages portent sur les unités physiques, jamais sur les thèmes.
export const DashboardQuerySchema = z.object({
  visualIds: z
    .string()
    .max(100000)
    .regex(/^(?:\d+(?:,\d+)*)?$/)
    .optional(),
  pour: z.enum(['deroulant', 'fixe', 'pliage', 'bus']).optional(),
  dossier: z
    .string()
    .max(4000)
    .regex(/^\d+(?:[,;\s]+\d+)*$/)
    .optional(),
  depart: z
    .string()
    .max(1000)
    .optional()
    .refine(
      (v) => !v || v.split(',').every((s) => SemaineIsoSchema.safeParse(s).success),
      'Semaines de départ invalides',
    ),
  atelier: z
    .string()
    .max(1000)
    .regex(/^\d+(?:,\d+)*$/)
    .optional(),
  format: z.string().max(4000).optional(),
  annonceur: z.string().max(4000).optional(),
  destination: z
    .string()
    .max(1000)
    .regex(/^\d+(?:,\d+)*$/)
    .optional(),
})
export type DashboardQuery = z.infer<typeof DashboardQuerySchema>
export const DeliveryForecastInputSchema = z.object({
  version: z.number().int().nonnegative(),
  date: z.iso.date().nullable(),
  comment: z.string().trim().max(4000),
})
export const DeliveryForecastSchema = z.object({
  expectedLineId: z.number().int().positive(),
  date: z.iso.date().nullable(),
  comment: z.string(),
  version: z.number().int().positive(),
  updatedAt: z.string(),
  updatedBy: z.string(),
})
export type DeliveryForecastInput = z.infer<typeof DeliveryForecastInputSchema>
export const DASHBOARD_STAGES = ['WAITING', 'READY', 'PRODUCTION', 'PACKED', 'SHIPPED'] as const
export const DashboardStageSchema = z.enum(DASHBOARD_STAGES)
export type DashboardStage = z.infer<typeof DashboardStageSchema>
const count = z.number().int().nonnegative()
const counts = z.object({
  WAITING: count,
  READY: count,
  PRODUCTION: count,
  PACKED: count,
  SHIPPED: count,
  UNKNOWN: count,
})
export const DashboardVisualSchema = z.object({
  id: z.string(),
  dossier: z.number().int().nullable(),
  advertiser: z.string().nullable(),
  theme: z.string(),
  format: z.string(),
  siteId: count,
  site: z.string(),
  workshopId: count.nullable(),
  workshop: z.string().nullable(),
  week: z.string(),
  expected: count.nullable(),
  received: count,
  remaining: count.nullable(),
  blockedUnits: count,
  destinations: z.array(count),
  state: z.enum(['MISSING', 'PARTIAL', 'COMPLETE', 'SURPLUS', 'UNKNOWN']),
  forecast: z.string().nullable(),
  forecastVersion: count,
  forecastComment: z.string(),
  forecastUpdatedBy: z.string().nullable(),
  forecastUpdatedAt: z.string().nullable(),
  units: z.object({
    total: count,
    waiting: count,
    completed: count,
    shipped: count,
    trainIds: z.array(z.string()),
  }),
  posters: z.array(
    z.object({
      id: count,
      photoId: count.nullable(),
      received: count,
      location: z.string(),
      validated: z.boolean(),
      receivedAt: z.string(),
    }),
  ),
})
export type DashboardVisual = z.infer<typeof DashboardVisualSchema>
export const DashboardSchema = z.object({
  computedAt: z.string(),
  kpis: z.object({
    total: count,
    ready: count,
    waiting: count,
    completed: count,
    progress: z.number().min(0).max(1).nullable(),
    expected: count.nullable(),
    received: count,
    remaining: count.nullable(),
    unknownExpected: count,
    unknownCoverage: count,
  }),
  workshops: z.array(z.object({ id: count, label: z.string(), site: z.string(), stages: counts })),
  departures: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      site: z.string(),
      date: z.string(),
      channel: z.string(),
      stages: counts,
    }),
  ),
  advertisers: z.array(z.object({ label: z.string(), expected: count, remaining: count })),
  blocking: z.array(DashboardVisualSchema),
  visuals: z.array(DashboardVisualSchema),
  alerts: z.array(AlertePilotageSchema),
  alertsAvailable: z.boolean(),
  canEditForecast: z.boolean(),
  gaps: z.object({
    unmaterializedPreparations: count,
    withoutDeparture: count,
    unknownQuantities: count,
  }),
  options: z.object({
    dossier: z.array(z.object({ value: z.string(), label: z.string() })),
    depart: z.array(z.object({ value: z.string(), label: z.string() })),
    atelier: z.array(z.object({ value: z.string(), label: z.string() })),
    format: z.array(z.object({ value: z.string(), label: z.string() })),
    annonceur: z.array(z.object({ value: z.string(), label: z.string() })),
    destination: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
})
export type Dashboard = z.infer<typeof DashboardSchema>
