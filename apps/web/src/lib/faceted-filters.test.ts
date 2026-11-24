import { describe, expect, it } from 'vitest'
import { facetOptions, filterFacets, type Facet } from './faceted-filters.ts'
const rows = [
  { id: 1, weeks: ['2026-W48'], formats: ['2m²'] },
  { id: 2, weeks: ['2026-W49'], formats: ['8m²'] },
  { id: 3, weeks: [], formats: ['2m²', '2m²'] },
]
const facets: Facet<(typeof rows)[number]>[] = [
  { id: 'week', label: 'Départ', values: (row) => row.weeks, keepEmpty: true },
  { id: 'format', label: 'Format', values: (row) => row.formats },
]
describe('filtres de la maquette', () => {
  it('combine OU dans une facette et ET entre facettes, en conservant les départs non renseignés', () => {
    expect(filterFacets(rows, facets, { week: ['2026-W48', '2026-W49'], format: ['8m²'] })).toEqual(
      [rows[1]],
    )
    expect(filterFacets(rows, facets, { week: ['2026-W48'] })).toEqual([rows[0], rows[2]])
    expect(filterFacets(rows, facets, {})).toEqual(rows)
  })
  it('compte les autres facettes sans la sienne, déduplique les valeurs et garde les choix sans résultat', () => {
    expect(
      facetOptions(rows, facets, { format: ['8m²', 'absent'], week: ['2026-W48'] }, 'format'),
    ).toEqual([
      { value: '2m²', label: '2m²', count: 2 },
      { value: '8m²', label: '8m²', count: 0 },
      { value: 'absent', label: 'absent', count: 0 },
    ])
  })
})
