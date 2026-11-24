import type { GrainReservations, LigneReservation, Reservations } from '@circe/shared'

// ECR-PIL-03 — reservations.js:110–165. Seulement les champs servis par le contrat gelé.
export const RESERVATION_COLUMNS = {
  dossier: 'Dossier',
  annonceur: 'Annonceur',
  visuel: 'Visuel',
  dossiers: 'Dossiers',
  themes: 'Thèmes',
  departs: 'Semaines',
  ou: 'Où en est-il',
  attendu: 'Attendu',
  recu: 'Reçu',
  reste: 'Reste à recevoir',
  numeros: 'N° d’affiche',
  format: 'Format',
  plateforme: 'Plateforme',
  reception: 'Affiche reçue',
  reperes: 'Repères',
} as const
export type ReservationColumn = keyof typeof RESERVATION_COLUMNS
export function defaultReservationColumns(grain: GrainReservations): ReservationColumn[] {
  switch (grain) {
    case 'DOSSIER':
      return ['dossier', 'annonceur', 'themes', 'departs', 'ou', 'attendu', 'recu']
    case 'DA':
      return ['dossier', 'annonceur', 'format', 'plateforme', 'ou', 'attendu', 'recu', 'reste']
    case 'FORMAT':
      return ['format', 'dossiers', 'themes', 'ou', 'attendu', 'recu', 'reste']
    default:
      return ['dossier', 'visuel', 'departs', 'ou', 'attendu', 'recu', 'reste', 'numeros']
  }
}
export function reservationValue(
  row: LigneReservation,
  column: ReservationColumn,
): string | number {
  switch (column) {
    case 'dossier':
      return row.dossier ?? ''
    case 'annonceur':
      return row.annonceur ?? ''
    case 'visuel':
      return row.visuel ?? (row.themes > 1 ? `${row.themes} thèmes` : 'IP à saisir')
    case 'dossiers':
      return row.dossiers
    case 'themes':
      return row.themes
    case 'departs':
      return row.departs.map((week) => `S${week.slice(6)} · ${week.slice(0, 4)}`).join(' + ')
    case 'ou':
      return row.ou
    case 'attendu':
      return row.attendu
    case 'recu':
      return row.recu
    case 'reste':
      return row.resteARecevoir
    case 'numeros':
      return row.numerosAffiche.map((number) => `${number.id} ${number.marque}`).join(', ')
    case 'format':
      return row.format ?? ''
    case 'plateforme':
      return row.plateforme ?? ''
    case 'reception':
      return row.afficheRecue ?? ''
    case 'reperes':
      return row.reperes
        .map((marker) => (marker === 'MULTI_SEMAINES' ? 'Multi-semaines' : 'IP à saisir'))
        .join(', ')
  }
}

// ECR-PIL-03 — export de toute la sélection serveur, sans reconstruire ses agrégats côté UI.
export async function loadReservationExport(
  loadPage: (page: number) => Promise<Reservations>,
): Promise<LigneReservation[]> {
  const first = await loadPage(1)
  const rows = [...first.items]
  for (let page = 2; rows.length < first.total; page += 1) {
    const next = await loadPage(page)
    if (next.total !== first.total || next.items.length === 0)
      throw new Error('Les données ont changé pendant l’export. Actualisez et réessayez.')
    rows.push(...next.items)
  }
  if (rows.length !== first.total || new Set(rows.map((row) => row.cle)).size !== rows.length)
    throw new Error('Les données ont changé pendant l’export. Actualisez et réessayez.')
  return rows
}
