import {
  TransportDonneesSchema,
  CanalTransportSchema,
  type ColisQuery,
  type TransportBoucle,
} from '@circe/shared'
import { z } from 'zod'
import { ConflictError } from '../../core/errors.ts'
import type { Db } from '../../core/db.ts'
import type { Tx } from '../../core/transaction.ts'
import { identiteDuSite, type Identity } from '../../core/identity.ts'
import { listerColis } from '../coordination/colis.ts'
import { assertPermission, canAccessPlateforme } from '../../core/permissions/permissions.ts'

type Client = Db | Tx
export type MetadataRow = {
  colisId: number
  version: number | bigint
  donnees: string
  verifieLe: string
}
export async function lireMetadata(db: Client, colisId: number) {
  const rows = await db.$queryRaw<
    MetadataRow[]
  >`SELECT "colisId", "version", "donnees", "verifieLe" FROM "transport_colis_metadata" WHERE "colisId" = ${colisId}`
  const row = rows[0]
  if (!row) return null
  const payload: unknown = JSON.parse(row.donnees)
  const identite = z
    .object({ _colis: z.object({ createdAt: z.string(), code: z.string().nullable() }).optional() })
    .parse(payload)._colis
  const colis = await db.colis.findUnique({
    where: { id: colisId },
    select: { createdAt: true, codeColis: true },
  })
  if (
    !colis ||
    identite?.createdAt !== colis.createdAt.toISOString() ||
    identite.code !== colis.codeColis
  )
    throw new ConflictError(
      'Les métadonnées transport appartiennent à un colis supprimé ou recréé. Réassociation automatique interdite.',
    )
  return {
    version: Number(row.version),
    donnees: TransportDonneesSchema.parse(payload),
    verifieLe: row.verifieLe,
  }
}
export async function lireBoucles(db: Client, i: Identity): Promise<TransportBoucle[]> {
  const rows = await db.boucleTransportConfiguration.findMany()
  return rows
    .filter(
      (r) =>
        canAccessPlateforme(i, r.plateformeId) &&
        (i.siteId === null || i.siteId === r.plateformeId),
    )
    .flatMap((r) => {
      const canal = CanalTransportSchema.safeParse(r.canal)
      // Une configuration historique ambiguë n'est jamais choisie par défaut.
      if (!canal.success) return []
      let destinataires: unknown
      try {
        destinataires = JSON.parse(r.destinataires)
      } catch {
        return []
      }
      if (
        !Array.isArray(destinataires) ||
        !destinataires.every((d) => Number.isInteger(d) && d > 0)
      )
        return []
      return [
        {
          id: r.id,
          plateformeId: r.plateformeId,
          nom: r.nom,
          canal: canal.data,
          jour: r.jour,
          heure: r.heure,
          destinataires,
        },
      ]
    })
}
export async function listerTransport(db: Db, i: Identity, q: ColisQuery) {
  assertPermission(i, 'colis.gerer')
  i = identiteDuSite(i)
  const base = await listerColis(db, i, q)
  const colis = await Promise.all(
    base.colis.map(async (c) => ({ ...c, transport: await lireMetadata(db, c.id) })),
  )
  return {
    ...base,
    colis,
    boucles: await lireBoucles(db, i),
    geodis: 'NON_CONFIGURE' as const,
    peutImporter: i.roles.includes('admin'),
  }
}
