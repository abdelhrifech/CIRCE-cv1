import type { StockLigne } from '@circe/shared'
import type { Facet } from './faceted-filters.ts'
export const stockFacets: Facet<StockLigne>[] = [
  { id: 'dossier', label: 'Dossier(s)', values: (row) => row.dossiers.map(String) },
  { id: 'depart', label: 'Départ', values: (row) => row.semaines, keepEmpty: true },
  { id: 'format', label: 'Format', values: (row) => [row.format] },
  {
    id: 'etat',
    label: 'État',
    values: (row) => [
      row.disponible > 0 ? 'stock' : 'epuise',
      ...(row.conserver ? ['conserver'] : []),
      ...(row.rebut > 0 ? ['rebut'] : []),
    ],
    labels: {
      stock: 'En stock',
      epuise: 'Épuisée',
      conserver: 'À conserver (reliquat)',
      rebut: 'Avec du rebut',
    },
  },
  { id: 'allee', label: 'Allée', values: (row) => (row.allee ? [row.allee] : []) },
]
export function stockIndicators(rows: StockLigne[]) {
  return {
    disponible: rows.reduce((sum, row) => sum + Math.max(0, row.disponible), 0),
    reliquats: rows
      .filter((row) => row.conserver)
      .reduce((sum, row) => sum + Math.max(0, row.disponible), 0),
    visuelsConserves: rows.filter((row) => row.conserver).length,
    rebut: rows.reduce((sum, row) => sum + row.rebut, 0),
    sortiesAujourdhui: rows.reduce((sum, row) => sum + (row.sortiesAujourdhui ?? 0), 0),
  }
}
