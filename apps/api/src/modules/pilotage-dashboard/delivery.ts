import type { DeliveryForecastInput } from '@circe/shared'
import type { Identity } from '../../core/identity.ts'
import { identiteDuSite } from '../../core/identity.ts'
import { assertPermission } from '../../core/permissions/permissions.ts'
import { ConflictError, ForbiddenError, NotFoundError } from '../../core/errors.ts'
import { ecrireJournal } from '../../core/tracabilite.ts'
import type { Tx } from '../../core/transaction.ts'
import { peutVoirAtelier } from '../coordination/permissions.ts'

// Atelier Réception/PréProd/Stocks : date prévisionnelle et commentaire saisis par Pré-Prod.
// Le droit existant instruction.modifier est réservé à Coordination/Pré-Prod et Admin.
// Cette annotation autonome ne met à jour ni la réception attendue ni son statut/version.
export async function updateDeliveryForecast(
  tx: Tx,
  rawIdentity: Identity,
  expectedLineId: number,
  input: DeliveryForecastInput,
) {
  assertPermission(rawIdentity, 'instruction.modifier')
  const identity = identiteDuSite(rawIdentity)
  const expected = await tx.receptionAttendue.findUnique({
    where: { id: expectedLineId },
    include: { atelier: true },
  })
  if (!expected || expected.etatLigne !== 'ACTIVE')
    throw new NotFoundError('Visuel attendu introuvable ou fermé.')
  if (!peutVoirAtelier(identity, expected.atelier))
    throw new ForbiddenError('Ce visuel ne relève pas de votre périmètre.')
  const before = await tx.productionDeliveryForecast.findUnique({ where: { expectedLineId } })
  if ((before?.version ?? 0) !== input.version)
    throw new ConflictError('Cette prévision a été modifiée : rechargez le dashboard.', {
      code: 'FORECAST_VERSION_CONFLICT',
    })
  const fields = { date: input.date, comment: input.comment, updatedById: identity.userId }
  let row
  if (!before)
    row = await tx.productionDeliveryForecast.create({ data: { expectedLineId, ...fields } })
  else {
    const changed = await tx.productionDeliveryForecast.updateMany({
      where: { id: before.id, version: input.version },
      data: { ...fields, version: { increment: 1 } },
    })
    if (changed.count !== 1)
      throw new ConflictError('Cette prévision a été modifiée : rechargez le dashboard.', {
        code: 'FORECAST_VERSION_CONFLICT',
      })
    row = await tx.productionDeliveryForecast.findUniqueOrThrow({ where: { id: before.id } })
  }
  await ecrireJournal(tx, {
    typeEntite: 'REFERENTIEL',
    entiteId: `production-delivery:${row.id}`,
    action: 'MODIFICATION_REFERENTIEL',
    parId: identity.userId,
    ancienneValeur: before ? JSON.stringify({ date: before.date, comment: before.comment }) : null,
    nouvelleValeur: JSON.stringify({ date: row.date, comment: row.comment }),
    complement: 'Prévision de livraison du visuel (Pilotage)',
    donnees: {
      kind: 'PRODUCTION_DELIVERY_FORECAST',
      expectedLineId,
      forecastId: row.id,
      version: row.version,
    },
  })
  return {
    expectedLineId,
    date: row.date,
    comment: row.comment,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: identity.nom ?? identity.identifiantExterne,
  }
}
