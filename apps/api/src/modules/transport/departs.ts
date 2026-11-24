import type { DepartsCamionsQuery, TransportBoucle } from '@circe/shared'
import type { Db } from '../../core/db.ts'
import { identiteDuSite, type Identity } from '../../core/identity.ts'
import { lireDepartsCamions } from '../coordination/departs-camions.ts'
import { lireBoucles } from './lecture.ts'

// Aucun premier élément arbitraire : plusieurs boucles compatibles nécessitent un arbitrage.
export function boucleUnique(
  boucles: readonly TransportBoucle[],
  plateformeIds: readonly number[],
  destinataireId: number,
) {
  const candidates = boucles.filter(
    (b) => plateformeIds.includes(b.plateformeId) && b.destinataires.includes(destinataireId),
  )
  return candidates.length === 1 ? (candidates[0] ?? null) : null
}
export async function listerDepartsTransport(db: Db, i: Identity, q: DepartsCamionsQuery) {
  i = identiteDuSite(i)
  const base = await lireDepartsCamions(db, i, q)
  const boucles = await lireBoucles(db, i)
  const sites = await db.plateforme.findMany({ select: { id: true, nom: true } })
  return {
    ...base,
    departs: base.departs.map((d) => {
      const ids = sites.filter((s) => s.nom === d.plateforme).map((s) => s.id)
      return {
        ...d,
        boucle: ids.length === 1 ? boucleUnique(boucles, ids, d.destinataire.id) : null,
      }
    }),
  }
}
