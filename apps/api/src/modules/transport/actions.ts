import type { TransportImportSchema } from '@circe/shared'
import type { z } from 'zod'
import type { Tx } from '../../core/transaction.ts'
import type { Identity } from '../../core/identity.ts'
import { assertAtelier, assertPermission } from '../../core/permissions/permissions.ts'
import { BusinessError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors.ts'
import { ecrireJournal } from '../../core/tracabilite.ts'
import { lireBoucles, lireMetadata } from './lecture.ts'

export async function importerTransport(
  tx: Tx,
  i: Identity,
  input: z.infer<typeof TransportImportSchema>,
) {
  assertPermission(i, 'colis.gerer')
  if (!i.roles.includes('admin'))
    throw new ForbiddenError(
      'La saisie de données transport vérifiées est réservée à l’administrateur.',
    )
  const c = await tx.colis.findUnique({ where: { id: input.colisId } })
  if (!c) throw new NotFoundError('Colis introuvable.')
  assertAtelier(i, c.plateformeId, c.atelierId)
  if (i.siteId !== null && i.siteId !== c.plateformeId)
    throw new ForbiddenError('Colis hors du site sélectionné.')
  const d = input.donnees
  if ([d.dateEtat, d.dateLivraison].some((date) => date !== null && Date.parse(date) > Date.now()))
    throw new BusinessError(
      'Un constat transporteur ou une livraison attestée ne peut pas être daté dans le futur.',
    )
  if (d.boucleId !== null) {
    const b = (await lireBoucles(tx, i)).find((b) => b.id === d.boucleId)
    if (
      !b ||
      b.plateformeId !== c.plateformeId ||
      b.canal !== d.canal ||
      !b.destinataires.includes(c.destinataireId)
    )
      throw new BusinessError(
        'La boucle doit correspondre au site, au canal et au destinataire du colis.',
      )
  }
  const avant = await lireMetadata(tx, c.id)
  if ((avant?.version ?? 0) !== input.version)
    throw new ConflictError('Les données transport ont changé : rechargez le colis.')
  const donnees = JSON.stringify({
      ...d,
      _colis: { createdAt: c.createdAt.toISOString(), code: c.codeColis },
    }),
    le = new Date().toISOString()
  if (avant) {
    const n =
      await tx.$executeRaw`UPDATE "transport_colis_metadata" SET "donnees"=${donnees}, "version"="version"+1, "verifieLe"=${le}, "verifiePar"=${i.userId} WHERE "colisId"=${c.id} AND "version"=${input.version}`
    if (n !== 1) throw new ConflictError('Les données transport ont changé : rechargez le colis.')
  } else {
    const n =
      await tx.$executeRaw`INSERT INTO "transport_colis_metadata" ("colisId","version","donnees","verifieLe","verifiePar") VALUES (${c.id},1,${donnees},${le},${i.userId}) ON CONFLICT("colisId") DO NOTHING`
    if (n !== 1) throw new ConflictError('Les données transport ont changé : rechargez le colis.')
  }
  await ecrireJournal(tx, {
    typeEntite: 'COLIS',
    entiteId: c.id,
    action: 'MODIFICATION_REFERENTIEL',
    parId: i.userId,
    complement:
      'Données transport vérifiées, sans transition de statut du colis ni mouvement de stock.',
    donnees: { avant, apres: d, provenance: d.provenance, referenceSource: d.referenceSource },
  })
  return { message: 'Données transport vérifiées enregistrées.', version: input.version + 1 }
}
