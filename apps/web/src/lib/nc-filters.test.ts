import { expect, it } from 'vitest'
import { filterFacets, facetOptions } from './faceted-filters.ts'
import { ncControlFacets } from './nc-filters.ts'
it('NC : plusieurs contrôles en OU, type de non-conformité en ET, sans changer la portée', () => {
  const rows = [
    { donnees: { controle: ['Contrôle du visuel'], types: ['Visuel incorrect'] } },
    { donnees: { controle: ['Format NC'], types: ['Autre anomalie'] } },
    { donnees: { controle: [], types: ['Visuel incorrect'] } },
  ]
  const selected = { control: ['Contrôle du visuel', 'Format NC'], type: ['Visuel incorrect'] }
  expect(filterFacets(rows, ncControlFacets, selected)).toEqual([rows[0]])
  expect(facetOptions(rows, ncControlFacets, selected, 'type')).toEqual([
    { value: 'Autre anomalie', label: 'Autre anomalie', count: 1 },
    { value: 'Visuel incorrect', label: 'Visuel incorrect', count: 1 },
  ])
  expect(filterFacets(rows, ncControlFacets, {})).toEqual(rows)
})
