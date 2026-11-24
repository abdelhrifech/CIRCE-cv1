import { describe, it, expect } from 'vitest'
import { ficheColisage, ficheDetail, ficheSynthese, type LigneFiche } from './fiches-a-traiter.ts'

const ligne = (p: Partial<LigneFiche>): LigneFiche => ({
  type: '2 m² fixe',
  repartition: '1',
  dossier: 100,
  annonceur: 'Alpha',
  quantite: 10,
  visuel: 'Visuel A',
  repiquage: null,
  format: '2 m²',
  destinataire: 'Agence Nord',
  depart: '2026-W49',
  atelier: 'Fixe Wissous',
  ...p,
})

describe('Q-430 fiches de À traiter (exports Excel provisoires)', () => {
  const lignes = [
    ligne({ repartition: '1', quantite: 10 }),
    ligne({ repartition: '2', quantite: 5 }),
    ligne({ repartition: '3', quantite: 7, destinataire: 'Agence Sud', depart: '2026-W50' }),
    ligne({ repartition: '4', quantite: null, visuel: 'Visuel B' }),
  ]
  it('Détail : une ligne par ligne de préparation, mêmes colonnes que l’écran', () => {
    const f = ficheDetail(lignes)
    expect(f.titres).toHaveLength(11)
    expect(f.lignes).toHaveLength(4)
    expect(f.lignes[0]?.[2]).toBe(100)
    expect(f.lignes.every((l) => l.length === f.titres.length)).toBe(true)
  })
  it('Synthèse : additionne les quantités par atelier, format et visuel', () => {
    const f = ficheSynthese(lignes)
    const a = f.lignes.find((l) => l[3] === 'Visuel A')
    expect(a?.[4]).toBe(3)
    expect(a?.[5]).toBe(22)
    // une quantité absente compte pour 0, la ligne reste comptée
    const b = f.lignes.find((l) => l[3] === 'Visuel B')
    expect(b?.[4]).toBe(1)
    expect(b?.[5]).toBe(0)
  })
  it('Colisage : additionne les quantités par destinataire, départ et format', () => {
    const f = ficheColisage(lignes)
    const nord = f.lignes.find((l) => l[0] === 'Agence Nord' && l[1] === '2026-W49')
    expect(nord?.[4]).toBe(15)
    expect(f.lignes.find((l) => l[0] === 'Agence Sud')?.[4]).toBe(7)
  })
  it('affiche « — » pour une valeur absente et trie les groupes', () => {
    const f = ficheColisage([ligne({ destinataire: null }), ligne({ destinataire: 'Agence Est' })])
    expect(f.lignes.map((l) => l[0])).toEqual(['Agence Est', '—'])
  })
  it('renvoie des fiches vides (en-têtes seuls) sans ligne', () => {
    expect(ficheDetail([]).lignes).toEqual([])
    expect(ficheSynthese([]).lignes).toEqual([])
    expect(ficheColisage([]).lignes).toEqual([])
  })
})
