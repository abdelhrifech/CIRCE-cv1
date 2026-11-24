import { describe, expect, it } from 'vitest'
import {
  busIndicatorVisuals,
  busReceiptsForAdvertisers,
  busReceptionWeeks,
  busVisualsDueBy,
  nextBusDeliveryDeadline,
} from './bus-dashboard.ts'

describe('BUS-10/15/25 suivi et vue condensée', () => {
  it('BUS-10 trouve la prochaine échéance au changement d’année ISO et passe à la suivante à l’heure limite', () => {
    const now = Date.parse('2026-12-31T09:00:00Z')
    const deadline = Date.parse('2027-01-01T16:30:00Z')
    expect(nextBusDeliveryDeadline(now)).toBe(deadline)
    expect(nextBusDeliveryDeadline(deadline - 1)).toBe(deadline)
    expect(nextBusDeliveryDeadline(deadline)).toBe(Date.parse('2027-01-08T16:30:00Z'))
  })

  it('BUS-15 ne compte que les visuels non prêts à recevoir avant la prochaine échéance, borne finale comprise', () => {
    const now = Date.parse('2026-12-31T09:00:00Z')
    const deadline = nextBusDeliveryDeadline(now)
    const visual = {
      dossier: 100,
      pret: false,
      ligneAttendueId: 1,
      echeance: new Date(deadline).toISOString(),
    }
    const visuals = [
      visual,
      { ...visual, ligneAttendueId: 2, echeance: new Date(deadline + 7 * 864e5).toISOString() },
      { ...visual, ligneAttendueId: 3, pret: true },
      { ...visual, ligneAttendueId: 4, echeance: new Date(now - 1).toISOString() },
      { ...visual, ligneAttendueId: 5, echeance: new Date(now).toISOString() },
    ]
    const due = busVisualsDueBy(visuals, now, deadline)
    expect(due).toEqual([visual])
    // Le même dossier contient plusieurs visuels : le lien ne doit pas les ajouter tous.
    const linked = busIndicatorVisuals(visuals, due.map((v) => v.ligneAttendueId).join(','))
    expect(linked).toEqual(due)
  })

  it('BUS-15 un indicateur vide ouvre une sélection vide, distincte d’une absence de filtre', () => {
    const visuals = [{ ligneAttendueId: 1 }, { ligneAttendueId: 2 }]
    expect(busIndicatorVisuals(visuals, '')).toEqual([])
    expect(busIndicatorVisuals(visuals, undefined)).toEqual(visuals)
    expect(busIndicatorVisuals(visuals, '2,1')).toEqual(visuals)
  })

  it('BUS-08 les BL sans dossier répondent à l’annonceur seulement, y compris plusieurs annonceurs ou aucun filtre', () => {
    const receipts = [
      { annonceur: 'Client A', centre: 'Centre 1' },
      { annonceur: 'Client A', centre: 'Centre 2' },
      { annonceur: 'Client B', centre: 'Centre 1' },
      { annonceur: null, centre: 'Centre 1' },
    ]
    expect(busReceiptsForAdvertisers(receipts, ['Client A'])).toEqual(receipts.slice(0, 2))
    expect(busReceiptsForAdvertisers(receipts, ['Client A', 'Client B'])).toEqual(
      receipts.slice(0, 3),
    )
    expect(busReceiptsForAdvertisers(receipts, [])).toEqual(receipts)
    expect(busReceiptsForAdvertisers(receipts, ['Client absent'])).toEqual([])
  })

  it('BUS-25 conserve S-1 à S+6 dans la vue condensée et respecte les semaines filtrées même hors de cette fenêtre', () => {
    const weeks = busReceptionWeeks('2027-W01', [])
    expect(weeks).toHaveLength(8)
    expect(weeks[0]).toBe('2026-W53')
    expect(weeks.at(-1)).toBe('2027-W07')
    expect(busReceptionWeeks('2027-W01', ['2027-W09', '2026-W52', '2027-W09'])).toEqual([
      '2026-W52',
      '2027-W09',
    ])
  })
})
