import { lireSemaineIso, lundiSemaineIso, semaineIsoDe } from '@circe/shared'

// BUS-10/25 — bus.js:204–209 : prochaine échéance du vendredi S-2, à 16 h 30.
// Même convention UTC que le calcul existant de l’API Bus ; aucune règle de délai changée.
export function nextBusDeliveryDeadline(now: number): number {
  let deadline = lundiSemaineIso(semaineIsoDe(new Date(now))).getTime() - 10 * 864e5 + 16.5 * 36e5
  while (deadline <= now) deadline += 7 * 864e5
  return deadline
}

// BUS-15/25 — le nombre et le lien de l’indicateur utilisent les mêmes visuels.
export function busVisualsDueBy<T extends { pret: boolean; echeance: string }>(
  visuals: readonly T[],
  now: number,
  deadline: number,
): T[] {
  return visuals.filter((visual) => {
    const due = new Date(visual.echeance).getTime()
    return !visual.pret && due > now && due <= deadline
  })
}

// BUS-08/15 — bus.js:224–225 : un BL sans dossier ne porte aucun filtre centre/format/dossier.
export function busReceiptsForAdvertisers<T extends { annonceur: string | null }>(
  receipts: readonly T[],
  advertisers: readonly string[],
): T[] {
  return receipts.filter(
    (receipt) => !advertisers.length || advertisers.includes(receipt.annonceur ?? ''),
  )
}

// Sélection de lien de l’indicateur, distincte d’une absence de filtre : vide = aucun visuel.
export function busIndicatorVisuals<T extends { ligneAttendueId: number }>(
  visuals: readonly T[],
  selectedIds: string | undefined,
): T[] {
  if (selectedIds === undefined) return [...visuals]
  const ids = new Set(selectedIds.split(',').filter(Boolean))
  return visuals.filter((visual) => ids.has(String(visual.ligneAttendueId)))
}

// BUS-25 — vue condensée : semaines explicitement retenues, sinon S-1 à S+6.
export function busReceptionWeeks(currentWeek: string, selectedWeeks: readonly string[]): string[] {
  if (selectedWeeks.length) return [...new Set(selectedWeeks)].sort()
  const monday = lundiSemaineIso(lireSemaineIso(currentWeek)).getTime()
  return Array.from({ length: 8 }, (_, index) => {
    const week = semaineIsoDe(new Date(monday + (index - 1) * 7 * 864e5))
    return `${week.annee}-W${String(week.semaine).padStart(2, '0')}`
  })
}
