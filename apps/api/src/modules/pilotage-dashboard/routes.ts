import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  DashboardQuerySchema,
  DashboardSchema,
  DeliveryForecastInputSchema,
  DeliveryForecastSchema,
} from '@circe/shared'
import { z } from 'zod'
import type { Db } from '../../core/db.ts'
import { requireIdentity } from '../../core/identity.ts'
import { readProductionDashboard } from './service.ts'
import { updateDeliveryForecast } from './delivery.ts'
import { idem } from '../admin/routes.ts'

export function pilotageDashboardRoutes(app: FastifyInstance, db: Db) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/pilotage/dashboard',
    {
      schema: { querystring: DashboardQuerySchema, response: { 200: DashboardSchema } },
    },
    (req) => readProductionDashboard(db, requireIdentity(req), req.query),
  )
  app.withTypeProvider<ZodTypeProvider>().post(
    '/pilotage/dashboard/visuels/:id/livraison',
    {
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: DeliveryForecastInputSchema,
        response: { 200: DeliveryForecastSchema },
      },
    },
    (req, reply) =>
      idem(db, req, reply, (tx, identity) =>
        updateDeliveryForecast(tx, identity, req.params.id, req.body),
      ),
  )
}
