import { describe, expect, it } from 'vitest'
import { catalogueFacets, journalDateFr } from './admin-ui.ts'
import { filterFacets, facetOptions } from './faceted-filters.ts'
describe('Administration : catalogue et dates françaises', () => {
  it('combine Groupe/Origine/Page sans exclure les autres choix de la facette comptée', () => {
    const rows = [
      { domaine: 'Dossier', origine: 'Calculé', ecran: 'Suivi' },
      { domaine: 'Dossier', origine: 'Existant', ecran: 'Suivi' },
      { domaine: 'Affiche', origine: 'Calculé', ecran: 'Réception' },
    ]
    const facets = catalogueFacets<(typeof rows)[number]>(),
      selection = { domaine: ['Dossier'], origine: ['Calculé'], ecran: ['Suivi'] }
    expect(filterFacets(rows, facets, selection)).toEqual([rows[0]])
    expect(facetOptions(rows, facets, selection, 'origine').map((o) => [o.value, o.count])).toEqual(
      [
        ['Calculé', 1],
        ['Existant', 1],
      ],
    )
  })
  it('affiche jour/mois/année et heure française, et laisse une date invalide absente', () => {
    expect(journalDateFr('2026-11-21T13:04:05Z', 'UTC')).toMatch(/21\/11\/2026.*13:04:05/)
    expect(journalDateFr('invalide')).toBe('—')
  })
})
