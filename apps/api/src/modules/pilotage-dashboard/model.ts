import {
  DASHBOARD_STAGES,
  type Dashboard,
  type DashboardQuery,
  type DashboardStage,
  type DashboardVisual,
} from '@circe/shared'

export interface ProductionUnit {
  id: string
  kind: 'TRAIN' | 'UM' | 'LOT'
  process?: 'deroulant' | 'fixe' | 'pliage' | 'bus'
  siteId: number
  site: string
  workshopId: number
  workshop: string
  dossiers: number[]
  advertisers: string[]
  formats: string[]
  visualIds: string[]
  destinationId: number | null
  destination: string | null
  week: string | null
  stage: DashboardStage | null
  covered: boolean | null
  departure: { id: string; label: string; date: string; channel: string } | null
}
export interface DashboardDataset {
  units: ProductionUnit[]
  visuals: DashboardVisual[]
  unmaterialized: {
    process?: 'deroulant' | 'fixe' | 'pliage' | 'bus'
    dossier: number | null
    week: string | null
    workshopId: number
    advertiser: string | null
    format: string | null
    destinationId: number | null
  }[]
}
const values = (v: string | undefined, separator = ',') => v?.split(separator).filter(Boolean) ?? []
const includes = (filter: string[], actual: readonly string[]) =>
  !filter.length || actual.some((v) => filter.includes(v))
export function matchesDashboard(
  q: DashboardQuery,
  r: {
    dossiers: number[]
    week: string | null
    workshopId: number | null
    advertisers: string[]
    formats: string[]
    destinations: number[]
  },
) {
  return (
    includes(values(q.dossier?.replace(/[;\s]+/g, ',')), r.dossiers.map(String)) &&
    includes(values(q.depart), r.week ? [r.week] : []) &&
    includes(values(q.atelier), r.workshopId === null ? [] : [String(r.workshopId)]) &&
    includes(values(q.annonceur, '|'), r.advertisers) &&
    includes(values(q.format, '|'), r.formats) &&
    includes(values(q.destination), r.destinations.map(String))
  )
}
const visualMatches = (v: DashboardVisual, q: DashboardQuery) =>
  matchesDashboard(q, {
    dossiers: v.dossier === null ? [] : [v.dossier],
    week: v.week,
    workshopId: v.workshopId,
    advertisers: v.advertiser ? [v.advertiser] : [],
    formats: [v.format],
    destinations: v.destinations,
  })
const emptyStages = () => ({
  WAITING: 0,
  READY: 0,
  PRODUCTION: 0,
  PACKED: 0,
  SHIPPED: 0,
  UNKNOWN: 0,
})
function stages(units: ProductionUnit[]) {
  const counts = emptyStages()
  for (const unit of units) counts[unit.stage ?? 'UNKNOWN']++
  return counts
}
// `nombre` : lignes que la valeur donnerait avec les autres filtres posés (compteurs des filtres, DESIGN.md §4.3).
const options = (pairs: [string, string][], avecNombre = true) => {
  const nombres = new Map<string, number>()
  for (const [value] of pairs) nombres.set(value, (nombres.get(value) ?? 0) + 1)
  return [...new Map(pairs).entries()]
    .map(([value, label]) => ({
      value,
      label,
      ...(avecNombre ? { nombre: nombres.get(value) ?? 0 } : {}),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true }))
}

// TODO(question-ouverte): A prévisionnel fixe/pliage avant matérialisation des UM : le moteur
// gelé ne fournit pas ces identifiants en préparation. Compter les UM réelles et exposer à part
// les répartitions sans UM, sans inventer un conditionnement ou des unités physiques.
// SP-01 (RP14 S24–26, S15 S20) : A=unités distinctes, B=visuels couverts, C=colisage.
// Une même rame/train multi-thèmes ne contribue qu'une fois à A/B/C, quel que soit le filtre.
export function aggregateDashboard(data: DashboardDataset, query: DashboardQuery) {
  const selectedIds = query.visualIds === undefined ? null : new Set(values(query.visualIds))
  const units = [...new Map(data.units.map((u) => [u.id, u])).values()].filter(
    (u) =>
      (!query.pour || u.process === query.pour) &&
      (!selectedIds || u.visualIds.some((id) => selectedIds.has(id))) &&
      matchesDashboard(query, {
        ...u,
        destinations: u.destinationId === null ? [] : [u.destinationId],
      }),
  )
  const visuals = data.visuals
    .filter((v) => visualMatches(v, query) && (!selectedIds || selectedIds.has(v.id)))
    .map((v) => {
      const related = units.filter((u) => u.visualIds.includes(v.id))
      return {
        ...v,
        blockedUnits: related.filter((u) => u.covered === false).length,
        units: {
          total: related.length,
          waiting: related.filter((u) => u.covered !== true).length,
          completed: related.filter((u) => u.stage === 'PACKED' || u.stage === 'SHIPPED').length,
          shipped: related.filter((u) => u.stage === 'SHIPPED').length,
          trainIds: related.filter((u) => u.kind === 'TRAIN').map((u) => u.id.slice(6)),
        },
      }
    })
  const counts = stages(units)
  const ready = units.filter((u) => u.covered === true).length
  const unknownExpected = visuals.filter((v) => v.expected === null).length
  const expected = unknownExpected ? null : visuals.reduce((n, v) => n + (v.expected ?? 0), 0)
  const remaining = unknownExpected ? null : visuals.reduce((n, v) => n + (v.remaining ?? 0), 0)
  const received = visuals.reduce(
    (n, v) => n + (v.expected === null ? v.received : Math.min(v.expected, v.received)),
    0,
  )
  const workshops = new Map<number, ProductionUnit[]>()
  const departures = new Map<string, ProductionUnit[]>()
  for (const u of units) {
    workshops.set(u.workshopId, [...(workshops.get(u.workshopId) ?? []), u])
    if (u.departure) departures.set(u.departure.id, [...(departures.get(u.departure.id) ?? []), u])
  }
  const advertisers = new Map<string, { label: string; expected: number; remaining: number }>()
  for (const v of visuals)
    if (v.remaining !== null && v.remaining > 0 && v.expected !== null) {
      const key = v.advertiser ?? 'Annonceur non renseigné'
      const row = advertisers.get(key) ?? { label: key, expected: 0, remaining: 0 }
      row.expected += v.expected
      row.remaining += v.remaining
      advertisers.set(key, row)
    }
  const optionVisuals = (key: keyof DashboardQuery) =>
    data.visuals.filter((v) => visualMatches(v, { ...query, [key]: undefined }))
  return {
    kpis: {
      total: units.length,
      ready,
      waiting: units.length - ready,
      completed: counts.PACKED + counts.SHIPPED,
      progress: units.length ? (counts.PACKED + counts.SHIPPED) / units.length : null,
      expected,
      received,
      remaining,
      unknownExpected,
      unknownCoverage: units.filter((u) => u.covered === null).length,
    },
    workshops: [...workshops.entries()]
      .map(([id, us]) => ({
        id,
        label: us[0]?.workshop ?? '',
        site: us[0]?.site ?? '',
        stages: stages(us),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    departures: [...departures.entries()]
      .flatMap(([id, us]) => {
        const departure = us[0]?.departure
        return departure ? [{ ...departure, id, site: us[0]?.site ?? '', stages: stages(us) }] : []
      })
      .sort((a, b) => a.date.localeCompare(b.date)),
    advertisers: [...advertisers.values()].sort((a, b) => b.remaining - a.remaining).slice(0, 8),
    blocking: visuals
      .filter((v) => v.blockedUnits > 0)
      .sort((a, b) => b.blockedUnits - a.blockedUnits || (b.remaining ?? 0) - (a.remaining ?? 0)),
    visuals,
    gaps: {
      unmaterializedPreparations: data.unmaterialized.filter(
        (r) =>
          (!query.pour || r.process === query.pour) &&
          matchesDashboard(query, {
            dossiers: r.dossier === null ? [] : [r.dossier],
            week: r.week,
            workshopId: r.workshopId,
            advertisers: r.advertiser ? [r.advertiser] : [],
            formats: r.format ? [r.format] : [],
            destinations: r.destinationId === null ? [] : [r.destinationId],
          }),
      ).length,
      withoutDeparture: units.filter((u) => !u.departure).length,
      unknownQuantities: unknownExpected,
    },
    options: {
      dossier: options(
        optionVisuals('dossier')
          .filter((v) => v.dossier !== null)
          .map((v) => [
            String(v.dossier),
            `${v.dossier} · ${v.advertiser ?? 'Annonceur non renseigné'}`,
          ]),
      ),
      depart: options(optionVisuals('depart').map((v) => [v.week, v.week])),
      atelier: options(
        optionVisuals('atelier')
          .filter((v) => v.workshopId !== null)
          .map((v) => [
            String(v.workshopId),
            `${v.site} · ${v.workshop ?? 'Atelier non renseigné'}`,
          ]),
      ),
      format: options(optionVisuals('format').map((v) => [v.format, v.format])),
      annonceur: options(
        optionVisuals('annonceur')
          .filter((v) => v.advertiser !== null)
          .map((v) => [v.advertiser ?? '', v.advertiser ?? '']),
      ),
      destination: options(
        data.units
          .filter((u) =>
            matchesDashboard(
              { ...query, destination: undefined },
              { ...u, destinations: u.destinationId === null ? [] : [u.destinationId] },
            ),
          )
          .filter((u) => u.destinationId !== null)
          .map((u) => [String(u.destinationId), u.destination ?? `Destination ${u.destinationId}`]),
        false,
      ),
    },
  } satisfies Pick<
    Dashboard,
    | 'kpis'
    | 'workshops'
    | 'departures'
    | 'advertisers'
    | 'blocking'
    | 'visuals'
    | 'gaps'
    | 'options'
  >
}

export function stageFromStatus(status: string, covered: boolean | null): DashboardStage | null {
  if (status === 'TERMINE') return 'SHIPPED'
  if (status === 'A_EXPEDIER') return 'PACKED'
  if (['PREPARE', 'EXPORT_PREPA', 'AU_ROULAGE'].includes(status)) return 'PRODUCTION'
  return covered === null ? null : covered ? 'READY' : 'WAITING'
}

export const countStages = (row: Dashboard['workshops'][number]['stages']) =>
  DASHBOARD_STAGES.reduce((n, s) => n + row[s], row.UNKNOWN)
