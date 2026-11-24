import { describe, expect, it } from 'vitest'
import type { AlertePilotage } from '@circe/shared'
import { alertFacets, filteredAlerts } from './pilotage-alert-filters.ts'
import { facetOptions } from './faceted-filters.ts'
function alert(values: Partial<AlertePilotage>): AlertePilotage {
  return {
    cle: 'alert',
    type: 'MANQUANT',
    regle: 'RG-COO-075',
    gravite: 'IMPORTANT',
    titre: 'À vérifier',
    message: '',
    lien: '/pilotage/reservations',
    destinataires: ['coord'],
    plateformeId: 1,
    site: 'Nîmes',
    depart: '2026-W48',
    date: '2026-11-20T09:00:00Z',
    dossiers: [123456],
    acquittee: null,
    ...values,
  }
}
const alerts = [
  alert({ cle: 'A' }),
  alert({ cle: 'B', dossiers: [123457], plateformeId: 2, site: 'Wissous', depart: '2026-W49' }),
  alert({
    cle: 'C',
    dossiers: [123456],
    plateformeId: null,
    site: null,
    depart: null,
    type: 'ORPHELINE',
  }),
  alert({ cle: 'D', depart: '2026-W50', type: 'ECART' }),
]
describe('ECR-TRA-01 filtres multisélection Alertes', () => {
  it('cumule les dossiers et semaines, croise les facettes et conserve les alertes sans semaine/site', () => {
    expect(
      filteredAlerts(
        alerts,
        {
          dossier: ['123456', '123457'],
          depart: ['2026-W48', '2026-W49'],
          site: ['1'],
          type: ['MANQUANT', 'ORPHELINE'],
        },
        false,
      ).map((a) => a.cle),
    ).toEqual(['A', 'C'])
  })
  it('une facette effacée montre toutes les semaines, y compris hors S/S+1', () => {
    expect(filteredAlerts(alerts, {}, false)).toHaveLength(4)
    expect(filteredAlerts(alerts, { depart: ['2026-W48'] }, false).map((a) => a.cle)).toEqual([
      'A',
      'C',
    ])
  })
  it('compte une alerte par valeur hors sa propre facette, sans utiliser la gravité', () => {
    const facets = alertFacets(alerts)
    expect(facets.map((facet) => facet.id)).toEqual(['dossier', 'depart', 'type', 'site'])
    expect(
      facetOptions(alerts, facets, { depart: ['2026-W48'], type: ['MANQUANT'] }, 'type'),
    ).toEqual([
      { value: 'ORPHELINE', label: 'Réception inconnue à identifier', count: 1 },
      { value: 'MANQUANT', label: 'Visuel manquant ou partiel', count: 1 },
    ])
  })
  it('trie les ouvertes par échéance ancienne et les archives par date d’archivage récente', () => {
    const rows = [
      alert({
        cle: 'late',
        date: '2026-11-21T10:00:00Z',
        acquittee: { par: 'Admin', le: '2026-11-22T11:00:00Z' },
      }),
      alert({
        cle: 'early',
        date: '2026-11-20T10:00:00Z',
        acquittee: { par: 'Admin', le: '2026-11-21T11:00:00Z' },
      }),
    ]
    expect(filteredAlerts(rows, {}, false).map((a) => a.cle)).toEqual(['early', 'late'])
    expect(filteredAlerts(rows, {}, true).map((a) => a.cle)).toEqual(['late', 'early'])
  })
  it('garde les semaines choisies sans résultat et leur libellé lisible', () => {
    const facets = alertFacets([], ['2027-W01'])
    expect(facetOptions([], facets, { depart: ['2027-W01'] }, 'depart')).toEqual([
      { value: '2027-W01', label: 'S01 · 2027', count: 0 },
    ])
  })
})
