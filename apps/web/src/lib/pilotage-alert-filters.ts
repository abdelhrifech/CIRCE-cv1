import { LIBELLES_TYPES_ALERTE, type AlertePilotage } from '@circe/shared'
import { filterFacets, type Facet, type FacetSelection } from './faceted-filters.ts'

// ECR-TRA-01 — alertes.js : OU dans la facette, ET entre les facettes.
// Les alertes sans site/semaine restent visibles ; aucune gravité affichée ou filtrée.
export function alertFacets(
  alerts: AlertePilotage[],
  selectedWeeks: string[] = [],
): Facet<AlertePilotage>[] {
  const siteLabels = Object.fromEntries(
    alerts.flatMap((alert) =>
      alert.plateformeId !== null && alert.site ? [[String(alert.plateformeId), alert.site]] : [],
    ),
  )
  const weeks = Object.fromEntries(
    [...selectedWeeks, ...alerts.flatMap((alert) => (alert.depart ? [alert.depart] : []))].map(
      (week) => [week, `S${week.slice(6)} · ${week.slice(0, 4)}`],
    ),
  )
  return [
    { id: 'dossier', label: 'N° de dossier', values: (alert) => alert.dossiers.map(String) },
    {
      id: 'depart',
      label: 'Départ',
      values: (alert) => (alert.depart ? [alert.depart] : []),
      labels: weeks,
      keepEmpty: true,
    },
    { id: 'type', label: 'Type', values: (alert) => [alert.type], labels: LIBELLES_TYPES_ALERTE },
    {
      id: 'site',
      label: 'Site',
      values: (alert) => (alert.plateformeId === null ? [] : [String(alert.plateformeId)]),
      labels: siteLabels,
      keepEmpty: true,
    },
  ]
}
export function filteredAlerts(
  alerts: AlertePilotage[],
  selection: FacetSelection,
  archived: boolean,
) {
  return filterFacets(alerts, alertFacets(alerts), selection).sort((a, b) =>
    archived
      ? (b.acquittee?.le ?? '').localeCompare(a.acquittee?.le ?? '') || a.cle.localeCompare(b.cle)
      : (a.date ?? '').localeCompare(b.date ?? '') || a.cle.localeCompare(b.cle),
  )
}
