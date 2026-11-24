import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  ColisQuerySchema,
  DepartsCamionsQuerySchema,
  TransportDepartsSchema,
  TransportImportSchema,
  TransportListeSchema,
} from '@circe/shared'
import type { Db } from '../../core/db.ts'
import { requireIdentity } from '../../core/identity.ts'
import { assertPermission } from '../../core/permissions/permissions.ts'
import { idem } from '../admin/routes.ts'
import { listerTransport } from './lecture.ts'
import { importerTransport } from './actions.ts'
import { listerDepartsTransport } from './departs.ts'
import { demanderSuiviGeodis } from './geodis.ts'
export function transportRoutes(app: FastifyInstance, db: Db) {
  const r = app.withTypeProvider<ZodTypeProvider>()
  r.get(
    '/transport/departs',
    {
      schema: { querystring: DepartsCamionsQuerySchema, response: { 200: TransportDepartsSchema } },
    },
    (req) => listerDepartsTransport(db, requireIdentity(req), req.query),
  )
  r.get(
    '/transport/colis',
    { schema: { querystring: ColisQuerySchema, response: { 200: TransportListeSchema } } },
    (req) => listerTransport(db, requireIdentity(req), req.query),
  )
  r.post(
    '/transport/colis/import',
    {
      schema: {
        body: TransportImportSchema,
        response: { 200: z.object({ message: z.string(), version: z.number() }) },
      },
    },
    (req, reply) => idem(db, req, reply, (tx, i) => importerTransport(tx, i, req.body)),
  )
  r.post(
    '/transport/geodis/actualiser',
    {
      schema: {
        description:
          'Demande de suivi Geodis ; connexion non configurée tant que le contrat réel n’est pas fourni.',
        response: {
          503: z.object({
            code: z.string(),
            message: z.string(),
            regle: z.string().optional(),
            details: z.unknown().optional(),
          }),
        },
      },
    },
    (req) => {
      assertPermission(requireIdentity(req), 'colis.gerer')
      return demanderSuiviGeodis()
    },
  )
}
