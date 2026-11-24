import { formatSemaineIso, type AnalyseProductionQuerySchema } from '@circe/shared'
import type { z } from 'zod'
import type { Db } from '../../core/db.ts'
import type { Identity } from '../../core/identity.ts'
import { assertPermission } from '../../core/permissions/permissions.ts'
import { parPaquets } from '../../core/paquets.ts'
import {
  ateliersDuPerimetre,
  construireTrains,
  facesDesTrains,
  STATUTS_TRAIN,
} from '../coordination/trains.ts'
// EX-NEW16-REP-001 — analyse en lecture seule : même définition des trains produits que la préparation.
export async function analyserProduction(
  db: Db,
  identity: Identity,
  q: z.infer<typeof AnalyseProductionQuerySchema>,
) {
  assertPermission(identity, 'train.consulter')
  const ateliers = (await ateliersDuPerimetre(db, identity)).filter(
    (a) => identity.siteId === null || a.plateformeId === identity.siteId,
  )
  const dansPeriode = (depart: Date) =>
    (!q.du || depart.toISOString().slice(0, 10) >= q.du) &&
    (!q.au || depart.toISOString().slice(0, 10) <= q.au)
  // Période choisie : seuls les trains dont le départ (première date de leurs faces, comme `construireTrains`) tombe
  // dans la période sont reconstruits, avec TOUTES leurs faces. Sans cela, toutes les faces de toutes les semaines
  // (des centaines de milliers sur le volume réel) étaient chargées puis filtrées.
  let faces
  if (q.du || q.au) {
    const ids = ateliers
      .map((a) => a.id)
      .filter((id) => q.atelier === undefined || id === q.atelier)
    const departs = await parPaquets(ids, (paquet) =>
      db.faceTrain.groupBy({
        by: ['trainId'],
        where: { atelierId: { in: paquet }, statut: { in: STATUTS_TRAIN }, trainId: { not: null } },
        _min: { dateDepart: true },
      }),
    )
    const trainIds = [
      ...new Set(
        departs.flatMap((d) =>
          d.trainId !== null && d._min.dateDepart && dansPeriode(d._min.dateDepart)
            ? [d.trainId]
            : [],
        ),
      ),
    ]
    faces = await parPaquets(trainIds, (paquet) =>
      facesDesTrains(db, ateliers, { atelierId: q.atelier, trainIds: paquet }),
    )
  } else faces = await facesDesTrains(db, ateliers, { atelierId: q.atelier })
  const trains = (await construireTrains(db, faces, ateliers)).filter(
    (t) => ['PRODUIT', 'COLISE', 'EXPEDIE', 'LIVRE'].includes(t.statut) && dansPeriode(t.depart),
  )
  const rouleurs = new Map(
    (
      await db.rouleur.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                trains.flatMap((t) =>
                  t.faces.flatMap((f) => (f.rouleurId === null ? [] : [f.rouleurId])),
                ),
              ),
            ],
          },
        },
      })
    ).map((r) => [r.id, r.nom]),
  )
  return {
    nombreRouleurs: rouleurs.size,
    ateliers: ateliers.map((a) => ({ id: a.id, libelle: a.libelle, plateforme: a.plateforme })),
    trains: trains.map((t) => ({
      id: t.trainId,
      rouleur:
        [
          ...new Set(
            t.faces.flatMap((f) => {
              const nom = f.rouleurId === null ? undefined : rouleurs.get(f.rouleurId)
              return nom ? [nom] : []
            }),
          ),
        ].join(', ') || null,
      machine: null,
      atelier: t.atelier?.libelle ?? '—',
      site: t.atelier?.plateforme ?? '—',
      depart: formatSemaineIso(t.semaineDepart),
      statut: t.statut,
    })),
  }
}
