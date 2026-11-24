export type FacetSelection = Record<string, string[]>
export interface Facet<T> {
  id: string
  label: string
  values: (row: T) => string[]
  labels?: Record<string, string>
  keepEmpty?: boolean
}
// Maquette ui.filters : OU dans une facette, ET entre les facettes.
export function filterFacets<T>(
  rows: T[],
  facets: Facet<T>[],
  selected: FacetSelection,
  except?: string,
) {
  return rows.filter((row) =>
    facets.every((facet) => {
      const choices = selected[facet.id] ?? []
      const values = facet.values(row)
      return (
        facet.id === except ||
        choices.length === 0 ||
        (values.length === 0 && facet.keepEmpty) ||
        choices.some((choice) => values.includes(choice))
      )
    }),
  )
}
export function facetOptions<T>(
  rows: T[],
  facets: Facet<T>[],
  selected: FacetSelection,
  id: string,
) {
  const facet = facets.find((entry) => entry.id === id)
  if (!facet) return []
  const counts = new Map<string, number>()
  for (const row of filterFacets(rows, facets, selected, id)) {
    for (const value of new Set(facet.values(row))) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  for (const value of selected[id] ?? []) if (!counts.has(value)) counts.set(value, 0)
  return [...counts]
    .map(([value, count]) => ({ value, count, label: facet.labels?.[value] ?? value }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true }))
}
