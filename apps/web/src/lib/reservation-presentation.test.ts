import { describe, expect, it } from 'vitest'
import type { LigneReservation } from '@circe/shared'
import { defaultReservationColumns, reservationValue } from './reservation-presentation.ts'
const row: LigneReservation = {
  cle: 'theme',
  dossier: 123456,
  dossierId: 1,
  dossiers: 1,
  themes: 1,
  annonceur: 'Annonceur',
  visuel: 'Thème',
  format: '2 m²',
  plateforme: 'Wissous',
  departs: ['2026-W52', '2027-W01'],
  ou: 'VALIDATION_A_CONFIRMER',
  attendu: 100,
  recu: 70,
  resteARecevoir: 30,
  afficheRecue: 'PARTIELLE',
  numerosAffiche: [
    { id: 10, marque: '✓' },
    { id: 11, marque: '•' },
  ],
  reperes: ['MULTI_SEMAINES'],
  lisere: 'info',
}
describe('ECR-PIL-03 présentation des champs réellement disponibles', () => {
  it('affiche par défaut les huit colonnes du grain thème et les références de la DA', () => {
    expect(defaultReservationColumns('THEME')).toEqual([
      'dossier',
      'visuel',
      'departs',
      'ou',
      'attendu',
      'recu',
      'reste',
      'numeros',
    ])
    expect(defaultReservationColumns('DA')).toEqual([
      'dossier',
      'annonceur',
      'format',
      'plateforme',
      'ou',
      'attendu',
      'recu',
      'reste',
    ])
    expect(defaultReservationColumns('FORMAT')).toContain('themes')
    expect(defaultReservationColumns('DOSSIER')).toContain('annonceur')
  })
  it('conserve les quantités du serveur et distingue les semaines de deux années', () => {
    expect(reservationValue(row, 'recu')).toBe(70)
    expect(reservationValue(row, 'reste')).toBe(30)
    expect(reservationValue(row, 'departs')).toBe('S52 · 2026 + S01 · 2027')
  })
  it('conserve les deux marques de rattachement et les repères sans en inventer', () => {
    expect(reservationValue(row, 'numeros')).toBe('10 ✓, 11 •')
    expect(reservationValue(row, 'reperes')).toBe('Multi-semaines')
    expect(reservationValue({ ...row, reperes: ['PROVISOIRE'] }, 'reperes')).toBe('IP à saisir')
  })
  it('gère les valeurs absentes et un visuel avant les IP', () => {
    expect(reservationValue({ ...row, dossier: null }, 'dossier')).toBe('')
    expect(reservationValue({ ...row, visuel: null }, 'visuel')).toBe('IP à saisir')
    expect(reservationValue({ ...row, visuel: null, themes: 2 }, 'visuel')).toBe('2 thèmes')
    expect(reservationValue({ ...row, plateforme: null }, 'plateforme')).toBe('')
  })
})

import { loadReservationExport } from './reservation-presentation.ts'
import type { Reservations } from '@circe/shared'
const page = (items: LigneReservation[], total: number): Reservations => ({
  items,
  total,
  page: 1,
  pageSize: 1,
  indicateurs: {
    dossiers: total,
    enPreProduction: 0,
    affichesAttendues: 0,
    enProduction: 0,
    produitsOuExpedies: 0,
  },
  totaux: { attendu: total * 100, recu: total * 70, resteARecevoir: total * 30 },
})
it('ECR-PIL-03 exporte toutes les pages sans recalculer les quantités ni perdre de ligne', async () => {
  const calls: number[] = []
  const rows = await loadReservationExport((number) => {
    calls.push(number)
    return Promise.resolve(page([{ ...row, cle: `ligne${number}` }], 2))
  })
  expect(calls).toEqual([1, 2])
  expect(rows.map((line) => line.recu)).toEqual([70, 70])
})
it('ECR-PIL-03 refuse un export devenu incomplet ou dupliqué et accepte une sélection vide', async () => {
  expect(await loadReservationExport(() => Promise.resolve(page([], 0)))).toEqual([])
  await expect(
    loadReservationExport((number) => Promise.resolve(page(number === 1 ? [row] : [], 2))),
  ).rejects.toThrow('changé')
  await expect(loadReservationExport(() => Promise.resolve(page([row], 2)))).rejects.toThrow(
    'changé',
  )
})
