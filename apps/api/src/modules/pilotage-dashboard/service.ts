import {
  formatSemaineIso,
  lireSemaineIso,
  lundiSemaineIso,
  type DashboardQuery,
  type DashboardVisual,
} from '@circe/shared'
import { z } from 'zod'
import type { Db } from '../../core/db.ts'
import { identiteDuSite, type Identity } from '../../core/identity.ts'
import { assertPermission, hasPermission } from '../../core/permissions/permissions.ts'
import {
  ateliersDuPerimetre,
  cleVisuel,
  construireTrains,
  facesDesTrains,
} from '../coordination/trains.ts'
import { lireTypes, typeDe } from '../coordination/unitaire.ts'
import { listerAlertesPilotage } from '../alertes/service.ts'
import { aggregateDashboard, stageFromStatus, type ProductionUnit } from './model.ts'
import { parPaquets } from '../../core/paquets.ts'

const weekOf = (year: number | null, week: number | null) =>
  year !== null && week !== null ? formatSemaineIso({ annee: year, semaine: week }) : null

// Horaire du référentiel transport : jour 0..6 de S-1, 7=lundi S (écran Administration).
// TODO(question-ouverte): le référentiel n’expose pas de fuseau. Les centres français utilisent
// Europe/Paris pour cette prévision de graphique, jamais comme preuve de départ effectif.
export function scheduledDeparture(week: string, day: number, hour: string) {
  const civil = lundiSemaineIso(lireSemaineIso(week))
  civil.setUTCDate(civil.getUTCDate() - 7 + day)
  const offset = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(civil)
    .find((p) => p.type === 'timeZoneName')?.value
  const hours = Number(/(?:GMT|UTC)\+(\d+)/.exec(offset ?? '')?.[1])
  if (!hours) return null
  return `${civil.toISOString().slice(0, 10)}T${hour}:00+${String(hours).padStart(2, '0')}:00`
}

export async function readProductionDashboard(
  db: Db,
  rawIdentity: Identity,
  query: DashboardQuery,
  now = new Date(),
) {
  assertPermission(rawIdentity, 'instruction.consulter')
  const identity = identiteDuSite(rawIdentity)
  const workshops = await ateliersDuPerimetre(db, identity)
  const workshopById = new Map(workshops.map((a) => [a.id, a]))
  const visibleIds = workshops.map((a) => a.id)
  const fixedIds = workshops.filter((a) => a.type === 'FIXE').map((a) => a.id)
  const selectedWeeks = query.depart?.split(',') ?? []
  const selectedWeek =
    selectedWeeks.length === 1 && selectedWeeks[0] ? lireSemaineIso(selectedWeeks[0]) : null
  const expectedWeek = selectedWeek
    ? { semAnnee: selectedWeek.annee, semNum: selectedWeek.semaine }
    : {}
  const scope = identity.perimetre.toutesPlateformes
    ? {}
    : { plateformeId: { in: identity.perimetre.plateformeIds } }
  const [expectedRows, umRows, pendingRows, loops, types, trainFaces, availableWeeks] =
    await Promise.all([
      parPaquets(visibleIds, (batch) =>
        db.receptionAttendue.findMany({
          where: {
            ...scope,
            ...expectedWeek,
            etatLigne: 'ACTIVE',
            themeExclu: false,
            provisoire: false,
            atelierId: { in: batch },
          },
          include: {
            support: true,
            rattachements: { where: { actif: true }, include: { affiche: true } },
          },
        }),
      ),
      parPaquets(visibleIds, (batch) =>
        db.uniteManutention.findMany({
          where: {
            atelierId: { in: batch },
            ...expectedWeek,
            statut: { notIn: ['ANNULE', 'ERREUR'] },
          },
          include: { support: true, destinataire: true },
        }),
      ),
      parPaquets(fixedIds, (batch) =>
        db.repartition.findMany({
          where: {
            atelierId: { in: batch },
            ...expectedWeek,
            uniteId: null,
            retire: false,
            statut: { notIn: ['ANNULE', 'ERREUR'] },
          },
          include: { support: true },
        }),
      ),
      db.boucleTransportConfiguration.findMany({ where: scope }),
      lireTypes(db),
      facesDesTrains(db, workshops, selectedWeek ? { semaine: selectedWeek } : {}),
      parPaquets(visibleIds, (batch) =>
        db.receptionAttendue.groupBy({
          by: ['semAnnee', 'semNum'],
          where: { ...scope, atelierId: { in: batch }, etatLigne: 'ACTIVE', themeExclu: false },
        }),
      ),
    ])
  const trains = await construireTrains(db, trainFaces, workshops)
  const forecasts = await parPaquets(
    expectedRows.map((r) => r.id),
    (ids) => db.productionDeliveryForecast.findMany({ where: { expectedLineId: { in: ids } } }),
  )
  const forecastByLine = new Map(forecasts.map((f) => [f.expectedLineId, f]))
  const authors = await parPaquets([...new Set(forecasts.map((f) => f.updatedById))], (ids) =>
    db.utilisateur.findMany({
      where: { id: { in: ids } },
      select: { id: true, nom: true, identifiantExterne: true },
    }),
  )
  const authorById = new Map(authors.map((a) => [a.id, a.nom ?? a.identifiantExterne]))
  const preparationTypes =
    query.pour && query.pour !== 'deroulant'
      ? await parPaquets(visibleIds, (batch) =>
          db.repartition.findMany({
            where: { atelierId: { in: batch }, retire: false },
            select: { contNum: true, atelierId: true, typePreparationId: true },
          }),
        )
      : []
  const visuals: DashboardVisual[] = expectedRows.flatMap((row) => {
    const workshop = workshopById.get(row.atelierId ?? 0)
    if (!workshop || !row.theme) return []
    if (
      query.pour &&
      (query.pour === 'deroulant'
        ? workshop.type !== 'SCROLL'
        : workshop.type === 'SCROLL' ||
          !preparationTypes.some(
            (r) =>
              r.atelierId === workshop.id &&
              r.contNum === row.contNum &&
              typeDe(r, types) === query.pour,
          ))
    )
      return []
    const expected = row.qtePrepa ?? row.qteBc
    const received = row.rattachements.reduce((n, l) => n + l.quantite, 0)
    const forecast = forecastByLine.get(row.id)
    return [
      {
        id: String(row.id),
        dossier: row.contNum,
        advertiser: row.annonceur,
        theme: row.theme,
        format: row.format ?? row.support.nom,
        siteId: workshop.plateformeId,
        site: workshop.plateforme,
        workshopId: workshop.id,
        workshop: workshop.libelle,
        week: formatSemaineIso({ annee: row.semAnnee, semaine: row.semNum }),
        expected,
        received,
        remaining: expected === null ? null : Math.max(0, expected - received),
        units: { total: 0, waiting: 0, completed: 0, shipped: 0, trainIds: [] },
        posters: [
          ...new Map(
            row.rattachements.map((attachment) => [
              attachment.affiche.id,
              {
                id: attachment.affiche.id,
                photoId: attachment.affiche.photoId,
                received: attachment.quantite,
                location: `${attachment.affiche.allee ?? '—'}-${attachment.affiche.rayon ?? '—'}`,
                validated: attachment.affiche.validationAdmin,
                receivedAt: attachment.affiche.dateEntree.toISOString(),
              },
            ]),
          ).values(),
        ],
        blockedUnits: 0,
        destinations: [],
        state:
          expected === null
            ? 'UNKNOWN'
            : received === 0 && expected > 0
              ? 'MISSING'
              : received < expected
                ? 'PARTIAL'
                : received > expected * 1.1
                  ? 'SURPLUS'
                  : 'COMPLETE',
        forecast: forecast?.date ?? null,
        forecastVersion: forecast?.version ?? 0,
        forecastComment: forecast?.comment ?? '',
        forecastUpdatedBy: forecast ? (authorById.get(forecast.updatedById) ?? null) : null,
        forecastUpdatedAt: forecast?.updatedAt.toISOString() ?? null,
      },
    ]
  })
  const visualKey = (v: DashboardVisual) => cleVisuel(v.siteId, v.dossier, v.theme)
  const visualIds = (
    site: number,
    dossier: number | null,
    theme: string | null,
    week: string | null,
  ) =>
    visuals
      .filter(
        (v) =>
          visualKey(v) === cleVisuel(site, dossier, theme) && (week === null || v.week === week),
      )
      .map((v) => v.id)
  const visualById = new Map(visuals.map((v) => [v.id, v]))
  const loopRows = loops.map((l) => ({
    ...l,
    destinations: z.array(z.number().int()).parse(JSON.parse(l.destinataires)),
  }))
  function departure(
    site: number,
    dest: number | null,
    week: string | null,
  ): ProductionUnit['departure'] {
    if (dest === null || week === null) return null
    const candidates = loopRows.filter(
      (l) => l.plateformeId === site && l.destinations.includes(dest),
    )
    // TODO(question-ouverte): plusieurs boucles pour la même destination sans règle de priorité : pas de choix arbitraire.
    if (candidates.length !== 1) return null
    const loop = candidates[0]
    if (!loop) return null
    const date = scheduledDeparture(week, loop.jour, loop.heure)
    return date ? { id: `${loop.id}|${date}`, label: loop.nom, date, channel: loop.canal } : null
  }
  const units: ProductionUnit[] = []
  const stageMap = {
    EN_ATTENTE: 'WAITING',
    PRET: 'READY',
    EN_PROD: 'PRODUCTION',
    PRODUIT: 'PRODUCTION',
    COLISE: 'PACKED',
    EXPEDIE: 'SHIPPED',
    LIVRE: 'SHIPPED',
  } as const
  for (const train of trains) {
    const workshop = train.atelier
    if (!workshop) continue
    const first = train.faces[0]
    const week = formatSemaineIso(train.semaineDepart)
    const ids = [
      ...new Set(
        train.positions.flatMap((p) => visualIds(workshop.plateformeId, p.contNum, p.theme, week)),
      ),
    ]
    const destinationId = first?.destinataireId ?? null
    units.push({
      id: `TRAIN:${train.trainId}`,
      kind: 'TRAIN',
      process: 'deroulant',
      siteId: workshop.plateformeId,
      site: workshop.plateforme,
      workshopId: workshop.id,
      workshop: workshop.libelle,
      dossiers: [
        ...new Set(train.positions.flatMap((p) => (p.contNum === null ? [] : [p.contNum]))),
      ],
      advertisers: [...new Set(train.positions.flatMap((p) => (p.annonceur ? [p.annonceur] : [])))],
      formats: [
        ...new Set(
          ids.flatMap((id) => {
            const v = visualById.get(id)
            return v ? [v.format] : []
          }),
        ),
      ],
      visualIds: ids,
      destinationId,
      destination: train.destinataire,
      week,
      stage: stageMap[train.statut],
      covered: train.positions.every((p) => p.etat !== 'MANQUANT'),
      departure: departure(workshop.plateformeId, destinationId, week),
    })
  }
  for (const um of umRows) {
    const workshop = workshopById.get(um.atelierId ?? 0)
    if (!workshop) continue
    const week = weekOf(um.semAnnee, um.semNum)
    const ids = visualIds(workshop.plateformeId, um.contNum, um.theme, week)
    const needs = ids.flatMap((id) => {
      const v = visualById.get(id)
      return v ? [v] : []
    })
    const covered =
      !needs.length || needs.some((v) => v.expected === null)
        ? null
        : needs.every((v) => v.expected !== null && v.received >= v.expected)
    const kind = typeDe(um, types) === 'fixe' ? 'UM' : 'LOT'
    units.push({
      id: `UM:${um.id}`,
      process: typeDe(um, types),
      kind,
      siteId: workshop.plateformeId,
      site: workshop.plateforme,
      workshopId: workshop.id,
      workshop: workshop.libelle,
      dossiers: um.contNum === null ? [] : [um.contNum],
      advertisers: um.annonceur ? [um.annonceur] : [],
      formats: needs.length
        ? [...new Set(needs.map((v) => v.format))]
        : um.support
          ? [um.support.nom]
          : [],
      visualIds: ids,
      destinationId: um.destinataireId,
      destination: um.destinataire?.nom ?? um.destinataire?.nomOrigine ?? null,
      week,
      stage: stageFromStatus(um.statut, covered),
      covered,
      departure: departure(workshop.plateformeId, um.destinataireId, week),
    })
  }
  for (const visual of visuals)
    visual.destinations = [
      ...new Set(
        units
          .filter((u) => u.visualIds.includes(visual.id))
          .flatMap((u) => (u.destinationId === null ? [] : [u.destinationId])),
      ),
    ]
  const data = aggregateDashboard(
    {
      units,
      visuals,
      unmaterialized: pendingRows.flatMap((r) =>
        r.atelierId === null
          ? []
          : [
              {
                process: typeDe(r, types),
                dossier: r.contNum,
                week: weekOf(r.semAnnee, r.semNum),
                workshopId: r.atelierId,
                advertiser: r.annonceur,
                format: r.support?.nom ?? null,
                destinationId: r.destinataireId,
              },
            ],
      ),
    },
    query,
  )
  data.options.depart = [
    ...new Map(availableWeeks.map((week) => [`${week.semAnnee}-${week.semNum}`, week])).values(),
  ]
    .map((w) => {
      const value = formatSemaineIso({ annee: w.semAnnee, semaine: w.semNum })
      return { value, label: value }
    })
    .sort((a, b) => a.value.localeCompare(b.value))
  const alertsAvailable = hasPermission(identity, 'alerte.consulter')
  const alertRows = alertsAvailable
    ? (
        await listerAlertesPilotage(
          db,
          identity,
          { etat: 'OUVERTES', depart: query.depart?.split(',') },
          now,
        )
      ).alertes
    : []
  const dossiers = query.dossier?.split(/[,;\s]+/).map(Number)
  return {
    ...data,
    computedAt: now.toISOString(),
    alertsAvailable,
    canEditForecast: hasPermission(identity, 'instruction.modifier'),
    alerts: alertRows
      .filter((a) => !dossiers?.length || a.dossiers.some((d) => dossiers.includes(d)))
      .slice(0, 8),
  }
}
