import { describe, expect, it } from 'vitest'
import type { DashboardVisual } from '@circe/shared'
import { aggregateDashboard, stageFromStatus, type ProductionUnit } from './model.ts'
import { scheduledDeparture } from './service.ts'

const visual = (id: string, extra: Partial<DashboardVisual> = {}): DashboardVisual => ({
  id,
  dossier: 101,
  advertiser: 'Annonceur test',
  theme: id,
  format: '2 m² fixe',
  siteId: 1,
  site: 'Site test',
  workshopId: 2,
  workshop: 'Atelier test',
  week: '2026-W48',
  expected: 10,
  received: 10,
  remaining: 0,
  blockedUnits: 0,
  destinations: [3],
  state: 'COMPLETE',
  units: { total: 0, waiting: 0, completed: 0, shipped: 0, trainIds: [] },
  posters: [],
  forecast: null,
  forecastVersion: 0,
  forecastComment: '',
  forecastUpdatedBy: null,
  forecastUpdatedAt: null,
  ...extra,
})
const unit = (id: string, extra: Partial<ProductionUnit> = {}): ProductionUnit => ({
  id,
  kind: 'TRAIN',
  siteId: 1,
  site: 'Site test',
  workshopId: 2,
  workshop: 'Atelier test',
  dossiers: [101],
  advertisers: ['Annonceur test'],
  formats: ['2 m² fixe'],
  visualIds: ['a', 'b'],
  destinationId: 3,
  destination: 'Destination test',
  week: '2026-W48',
  stage: 'READY',
  covered: true,
  departure: null,
  ...extra,
})

describe('SP-01 dashboard : unités physiques, couverture et colisage indépendants', () => {
  it('un train multi-visuels et répété ne compte qu’une fois, avec une UM et un lot distincts', () => {
    const train = unit('TRAIN:1')
    const result = aggregateDashboard(
      {
        units: [
          train,
          train,
          unit('UM:1', { kind: 'UM', stage: 'PACKED' }),
          unit('UM:2', { kind: 'LOT', stage: 'SHIPPED' }),
        ],
        visuals: [visual('a'), visual('b')],
        unmaterialized: [],
      },
      {},
    )
    expect(result.kpis).toMatchObject({
      total: 3,
      ready: 3,
      waiting: 0,
      completed: 2,
      progress: 2 / 3,
      expected: 20,
      received: 20,
      remaining: 0,
    })
    expect(result.workshops[0]?.stages).toMatchObject({ READY: 1, PACKED: 1, SHIPPED: 1 })
  })
  it('une position manquante bloque le train entier, sans multiplier A par les visuels', () => {
    const result = aggregateDashboard(
      {
        units: [unit('TRAIN:1', { covered: false, stage: 'WAITING' })],
        visuals: [
          visual('a'),
          visual('b', { expected: 20, received: 5, remaining: 15, state: 'PARTIAL' }),
        ],
        unmaterialized: [],
      },
      {},
    )
    expect(result.kpis).toMatchObject({
      total: 1,
      ready: 0,
      waiting: 1,
      completed: 0,
      remaining: 15,
    })
    expect(result.blocking).toHaveLength(2)
    expect(result.blocking.every((v) => v.blockedUnits === 1)).toBe(true)
  })
  it('une production lancée ne régresse pas quand sa couverture manque ; B suit les visuels reçus', () => {
    expect(stageFromStatus('AU_ROULAGE', false)).toBe('PRODUCTION')
    const result = aggregateDashboard(
      {
        units: [unit('TRAIN:1', { stage: 'PRODUCTION', covered: false })],
        visuals: [visual('a')],
        unmaterialized: [],
      },
      {},
    )
    expect(result.kpis).toMatchObject({ ready: 0, waiting: 1, completed: 0 })
    expect(result.workshops[0]?.stages.PRODUCTION).toBe(1)
  })
  it('ne transforme ni quantité inconnue ni absence d’unités en faux zéro ou 100%', () => {
    const result = aggregateDashboard(
      {
        units: [],
        visuals: [visual('a', { expected: null, remaining: null })],
        unmaterialized: [
          {
            dossier: 101,
            week: '2026-W48',
            workshopId: 2,
            advertiser: 'Annonceur test',
            format: '2 m² fixe',
            destinationId: 3,
          },
        ],
      },
      {},
    )
    expect(result.kpis).toMatchObject({
      total: 0,
      progress: null,
      expected: null,
      remaining: null,
      unknownExpected: 1,
    })
    expect(result.gaps.unmaterializedPreparations).toBe(1)
    expect(stageFromStatus('EN_COURS', null)).toBeNull()
  })
  it('cumule les filtres et conserve un train partagé quand un de ses dossiers est sélectionné', () => {
    const result = aggregateDashboard(
      {
        units: [
          unit('TRAIN:1', { dossiers: [101, 102] }),
          unit('TRAIN:2', { dossiers: [103], week: '2027-W48' }),
        ],
        visuals: [visual('a'), visual('b', { dossier: 102 })],
        unmaterialized: [],
      },
      { dossier: '102', depart: '2026-W48', atelier: '2', destination: '3' },
    )
    expect(result.kpis.total).toBe(1)
    expect(result.visuals.map((v) => v.dossier)).toEqual([102])
    expect(
      aggregateDashboard(
        { units: [unit('TRAIN:1')], visuals: [visual('a')], unmaterialized: [] },
        { destination: '99' },
      ).kpis.total,
    ).toBe(0)
  })
  it('plafonne le reçu utile par visuel et trie les huit annonceurs manquants', () => {
    const result = aggregateDashboard(
      {
        units: [],
        visuals: [
          visual('a', { received: 30 }),
          ...Array.from({ length: 10 }, (_, i) =>
            visual(String(i), {
              advertiser: `Annonceur ${i}`,
              expected: 20,
              received: i,
              remaining: 20 - i,
            }),
          ),
        ],
        unmaterialized: [],
      },
      {},
    )
    expect(result.kpis.received).toBe(55)
    expect(result.advertisers).toHaveLength(8)
    expect(result.advertisers[0]).toMatchObject({ label: 'Annonceur 0', remaining: 20 })
  })
  it('place les horaires transport en S-1 et respecte année ISO et heure de Paris', () => {
    expect(scheduledDeparture('2026-W01', 7, '08:30')).toBe('2025-12-29T08:30:00+01:00')
    expect(scheduledDeparture('2026-W28', 3, '14:00')).toBe('2026-07-02T14:00:00+02:00')
  })
})

it('SP-01 sélection vide et visuels multiples ne fabriquent aucune unité ni doublon', () => {
  const dataset = {
    units: [unit('TRAIN:unique', { process: 'deroulant' })],
    visuals: [visual('a'), visual('b')],
    unmaterialized: [],
  }
  expect(aggregateDashboard(dataset, { visualIds: '' }).kpis.total).toBe(0)
  expect(aggregateDashboard(dataset, { visualIds: 'a,b' }).kpis.total).toBe(1)
  expect(aggregateDashboard(dataset, { pour: 'fixe' }).kpis.total).toBe(0)
})
