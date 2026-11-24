import { describe, expect, it } from 'vitest'
import { dansIntervalle, decalerSemaine, semaineCourante } from './semaine-navigation.ts'

describe('À traiter : recherche par semaine de départ', () => {
  it('prend par défaut la semaine en cours', () => {
    expect(semaineCourante(new Date(Date.UTC(2026, 10, 23)))).toBe('2026-W48')
  })
  it('passe à la semaine précédente ou suivante, y compris d’une année à l’autre', () => {
    expect(decalerSemaine('2026-W48', 1)).toBe('2026-W49')
    expect(decalerSemaine('2026-W48', -1)).toBe('2026-W47')
    expect(decalerSemaine('2026-W53', 1)).toBe('2027-W01')
    expect(decalerSemaine('2027-W01', -1)).toBe('2026-W53')
  })
  it('garde une valeur invalide telle quelle', () => {
    expect(decalerSemaine('', 1)).toBe('')
  })
  it('filtre sur l’intervalle, bornes comprises', () => {
    expect(dansIntervalle('2026-W48', '2026-W48', '2026-W48')).toBe(true)
    expect(dansIntervalle('2026-W49', '2026-W48', '2026-W48')).toBe(false)
    expect(dansIntervalle('2027-W01', '2026-W52', '2027-W02')).toBe(true)
  })
  it('sans borne, tout passe ; avec une borne, une semaine absente est écartée', () => {
    expect(dansIntervalle(null, '', '')).toBe(true)
    expect(dansIntervalle('2026-W10', '', '2026-W48')).toBe(true)
    expect(dansIntervalle(null, '2026-W48', '')).toBe(false)
  })
})
