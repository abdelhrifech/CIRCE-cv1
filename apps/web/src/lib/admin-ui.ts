import { CATALOGUE_REFERENCE } from '@circe/shared'
import type { Facet } from './faceted-filters.ts'
export const ORIGINES_STATUTS = {
  C: 'Calculé',
  E: 'Existe déjà dans Circé',
  B: 'Vient de Broadcast',
  N: 'À ajouter (V2)',
}
export const CATALOGUE_ROWS = CATALOGUE_REFERENCE.flatMap((g) =>
  g.items.map((item, i) => ({
    cle: `${g.g}-${i}`,
    domaine: g.g,
    ecran: g.ou,
    nom: item[0],
    origine: ORIGINES_STATUTS[item[1]],
    description: item[2],
    source: item[3],
  })),
)
export function catalogueFacets<
  T extends { domaine: string; origine: string; ecran: string },
>(): Facet<T>[] {
  return [
    { id: 'domaine', label: 'Groupe', values: (r) => [r.domaine] },
    { id: 'origine', label: 'Origine', values: (r) => [r.origine] },
    { id: 'ecran', label: 'Page', values: (r) => [r.ecran] },
  ]
}
export function journalDateFr(iso: string, timeZone?: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  })
}
