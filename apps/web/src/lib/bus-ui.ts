import { BUS_FORMATS, type BusLigne } from '@circe/shared'
import type { Facet, FacetSelection } from './faceted-filters.ts'

export const BUS_LINE_FILTER_KEYS = [
  'dossier',
  'semaine',
  'centre',
  'parc',
  'format',
  'annonceur',
  'dsp',
  'rep',
] as const
export function parseBusSelection(value: string | undefined): string[] {
  if (!value || value === '*') return []
  return value.split(',').map((entry) => {
    try {
      return decodeURIComponent(entry)
    } catch {
      return entry
    }
  })
}
export function busFacetSelection(
  search: Partial<Record<(typeof BUS_LINE_FILTER_KEYS)[number], string>>,
): FacetSelection {
  return Object.fromEntries(
    BUS_LINE_FILTER_KEYS.map((key) => [key, parseBusSelection(search[key])]),
  )
}
type BusFacetLine = Pick<
  BusLigne,
  | 'dossier'
  | 'semaine'
  | 'centreCode'
  | 'centre'
  | 'parc'
  | 'formatCode'
  | 'annonceur'
  | 'dspCode'
  | 'dsp'
  | 'resteEnPlace'
>
export function busLineFacets<T extends BusFacetLine>(lines: readonly T[]): Facet<T>[] {
  return [
    { id: 'dossier', label: 'N° de dossier', values: (l) => [String(l.dossier)] },
    { id: 'semaine', label: 'Pose', values: (l) => [l.semaine] },
    {
      id: 'centre',
      label: 'Centre bus',
      values: (l) => [l.centreCode],
      labels: Object.fromEntries(lines.map((l) => [l.centreCode, l.centre])),
    },
    { id: 'parc', label: 'Parc', values: (l) => [l.parc] },
    {
      id: 'format',
      label: 'Format',
      values: (l) => [l.formatCode],
      labels: Object.fromEntries(BUS_FORMATS.map((f) => [f.code, f.nom])),
    },
    { id: 'annonceur', label: 'Annonceur', values: (l) => [l.annonceur] },
    {
      id: 'dsp',
      label: 'DSP',
      values: (l) => [l.dspCode],
      labels: Object.fromEntries(lines.map((l) => [l.dspCode, l.dsp])),
    },
    {
      id: 'rep',
      label: 'Reste en place',
      values: (l) => [l.resteEnPlace ? 'oui' : 'non'],
      labels: { oui: 'Signalé dans les IP', non: 'Non' },
    },
  ]
}
// Présentation seulement : aucun total, ajustement ou calcul d'entretien ne change.
export function sortBusPrintLines<
  T extends {
    centre: string
    annonceur: string
    dossier: number
    format: string
    parc: string
    theme: string
  },
>(lines: readonly T[]): T[] {
  const compare = (a: string, b: string) => a.localeCompare(b, 'fr', { numeric: true })
  return [...lines].sort(
    (a, b) =>
      compare(a.centre, b.centre) ||
      compare(a.annonceur, b.annonceur) ||
      a.dossier - b.dossier ||
      compare(a.format, b.format) ||
      compare(a.parc, b.parc) ||
      compare(a.theme, b.theme),
  )
}
