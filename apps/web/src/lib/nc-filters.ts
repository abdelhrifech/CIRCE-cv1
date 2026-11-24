import type { Facet } from './faceted-filters.ts'
// nonconformite.js:742–743 : valeurs réelles du contrôle et du constat, sans règle de portée ajoutée.
export const ncControlFacets: Facet<{ donnees: { controle: string[]; types: string[] } }>[] = [
  { id: 'control', label: 'Contrôle réception', values: (row) => row.donnees.controle },
  { id: 'type', label: 'Type de non-conformité', values: (row) => row.donnees.types },
]
