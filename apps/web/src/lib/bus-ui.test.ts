import { describe, expect, it } from 'vitest'
import { busFacetSelection, busLineFacets, parseBusSelection, sortBusPrintLines } from './bus-ui.ts'
import { facetOptions, filterFacets } from './faceted-filters.ts'
const line = {
  dossier: 10,
  semaine: '2026-W48',
  centreCode: 'C1',
  centre: 'Centre 1',
  parc: 'P1',
  formatCode: 'AV' as const,
  annonceur: 'Client A',
  dspCode: 'D1',
  dsp: 'DSP 1',
  resteEnPlace: false,
}
const rows = [
  line,
  { ...line, dossier: 20, centreCode: 'C2', centre: 'Centre 2', annonceur: 'Client B' },
  { ...line, dossier: 30, annonceur: 'Client C', resteEnPlace: true },
]
describe('Bus : facettes et impressions hors calcul métier', () => {
  it('combine plusieurs dossiers en OU et un centre en ET, avec compteurs compatibles', () => {
    const facets = busLineFacets(rows),
      selected = busFacetSelection({ dossier: '10,20', centre: 'C1' })
    expect(filterFacets(rows, facets, selected)).toEqual([line])
    expect(facetOptions(rows, facets, selected, 'centre')).toEqual([
      { value: 'C1', label: 'Centre 1', count: 1 },
      { value: 'C2', label: 'Centre 2', count: 1 },
    ])
  })
  it('respecte les valeurs sélectionnées hors résultat et les noms contenant virgule ou pourcentage', () => {
    const client = 'Client, SA 100%'
    expect(busFacetSelection({ annonceur: encodeURIComponent(client) }).annonceur).toEqual([client])
    expect(parseBusSelection('*')).toEqual([])
    expect(parseBusSelection('Client 100%')).toEqual(['Client 100%'])
    expect(
      facetOptions(rows, busLineFacets(rows), { centre: ['absent'] }, 'centre').find(
        (o) => o.value === 'absent',
      )?.count,
    ).toBe(0)
  })
  it('le REP demeure une information filtrable, sans correction de quantité', () => {
    expect(filterFacets(rows, busLineFacets(rows), { rep: ['oui'] })).toEqual([rows[2]])
    expect(filterFacets(rows, busLineFacets(rows), { rep: ['oui', 'non'] })).toEqual(rows)
  })
  it('trie les impressions par centre/client/contrat/format sans modifier les lignes sources', () => {
    const print = [
      { centre: 'Centre 2', annonceur: 'A', dossier: 1, format: 'Arrière', parc: '2', theme: 'V1' },
      { centre: 'Centre 1', annonceur: 'Z', dossier: 1, format: 'Arrière', parc: '2', theme: 'V1' },
      { centre: 'Centre 1', annonceur: 'A', dossier: 1, format: 'Latéral', parc: '2', theme: 'V1' },
      { centre: 'Centre 1', annonceur: 'A', dossier: 1, format: 'Arrière', parc: '2', theme: 'V1' },
    ]
    expect(sortBusPrintLines(print)).toEqual([print[3], print[2], print[1], print[0]])
    expect(print[0]?.centre).toBe('Centre 2')
  })
})
