import { describe, it, expect } from 'vitest'
import {
  SEUIL_LISTE_SMART,
  resumeFiltre,
  valeursProposees,
  type OptionFiltre,
} from '../components/ui/filtre-liste.tsx'
import {
  FILTRES_VISIBLES,
  enOptionsFiltre,
  filtresAffiches,
  type DefinitionFiltre,
} from '../components/ui/barre-filtres.tsx'
import { iconeEntree, ICONES_ENTREES, NAV } from '../components/shell/nav-config.ts'

const options = (n: number, sansResultat: number[] = []): OptionFiltre[] =>
  Array.from({ length: n }, (_, i) => ({
    valeur: `v${String(i)}`,
    libelle: `Valeur ${String(i)}`,
    nombre: sansResultat.includes(i) ? 0 : i + 1,
  }))

describe('DESIGN.md §4.3 listes « smart » des filtres (ERG-06)', () => {
  it('garde toutes les valeurs d’une liste courte, celles à 0 comprises', () => {
    const liste = options(SEUIL_LISTE_SMART, [1, 2])
    expect(valeursProposees(liste, []).proposees).toHaveLength(SEUIL_LISTE_SMART)
    expect(valeursProposees(liste, []).masquees).toBe(0)
  })
  it('masque les valeurs sans résultat d’une liste longue et les annonce', () => {
    const liste = options(SEUIL_LISTE_SMART + 3, [0, 4])
    const { proposees, masquees } = valeursProposees(liste, [])
    expect(masquees).toBe(2)
    expect(proposees.map((o) => o.valeur)).not.toContain('v0')
    expect(proposees.map((o) => o.valeur)).not.toContain('v4')
  })
  it('garde une valeur cochée même sans résultat', () => {
    const liste = options(SEUIL_LISTE_SMART + 3, [0])
    expect(valeursProposees(liste, ['v0']).proposees.map((o) => o.valeur)).toContain('v0')
  })
  it('« Afficher aussi N valeurs » rend toutes les valeurs', () => {
    const liste = options(SEUIL_LISTE_SMART + 3, [0, 4])
    expect(valeursProposees(liste, [], { toutes: true }).proposees).toHaveLength(liste.length)
  })
  it('le filtre Départ garde toutes ses valeurs, même longues', () => {
    const liste = options(SEUIL_LISTE_SMART + 3, [0, 4])
    expect(valeursProposees(liste, [], { toutesValeurs: true }).proposees).toHaveLength(
      liste.length,
    )
  })
  it('traite une valeur sans compteur comme compatible', () => {
    const liste: OptionFiltre[] = Array.from({ length: SEUIL_LISTE_SMART + 1 }, (_, i) => ({
      valeur: String(i),
      libelle: String(i),
    }))
    expect(valeursProposees(liste, []).masquees).toBe(0)
  })
})

describe('DESIGN.md §4.3 pastille de filtre', () => {
  const liste = options(5)
  it('affiche seulement le libellé quand rien n’est coché', () => {
    expect(resumeFiltre('Départ', liste, [])).toBe('Départ')
  })
  it('affiche les valeurs cochées, jusqu’à deux', () => {
    expect(resumeFiltre('Départ', liste, ['v0', 'v1'])).toBe('Départ Valeur 0 + Valeur 1')
  })
  it('résume au-delà de deux valeurs', () => {
    expect(resumeFiltre('Départ', liste, ['v0', 'v1', 'v2'])).toBe('Départ · 3')
  })
  it('retombe sur la valeur brute si elle n’est plus proposée', () => {
    expect(resumeFiltre('Annonceur', liste, ['Inconnu'])).toBe('Annonceur Inconnu')
  })
  it('convertit les options du dashboard en gardant le compteur', () => {
    expect(enOptionsFiltre([{ value: 'S43', label: 'S43', nombre: 4 }])).toEqual([
      { valeur: 'S43', libelle: 'S43', nombre: 4 },
    ])
  })
})

describe('DESIGN.md §4.3 quatre filtres visibles au plus', () => {
  const def = (id: string, selection: string[] = []): DefinitionFiltre => ({
    id,
    libelle: id,
    options: [],
    selection,
    onChange: () => undefined,
  })
  const filtres = ['depart', 'atelier', 'format', 'annonceur', 'destination', 'avancement'].map(
    (id) => def(id),
  )
  it('n’affiche d’emblée que les quatre premiers', () => {
    const { affiches, restants } = filtresAffiches(filtres, new Set())
    expect(FILTRES_VISIBLES).toBe(4)
    expect(affiches.map((f) => f.id)).toEqual(['depart', 'atelier', 'format', 'annonceur'])
    expect(restants.map((f) => f.id)).toEqual(['destination', 'avancement'])
  })
  it('garde visible un filtre actif au-delà du quatrième', () => {
    const avec = filtres.map((f) => (f.id === 'avancement' ? def('avancement', ['cours']) : f))
    expect(filtresAffiches(avec, new Set()).affiches.map((f) => f.id)).toContain('avancement')
  })
  it('affiche un filtre ajouté par « + Filtre »', () => {
    const { affiches, restants } = filtresAffiches(filtres, new Set(['destination']))
    expect(affiches.map((f) => f.id)).toContain('destination')
    expect(restants.map((f) => f.id)).toEqual(['avancement'])
  })
})

describe('ECR-NAV-01 icônes et regroupement du menu', () => {
  it('chaque onglet a une icône, Bus un bus, Expédition la route, Déroulant le panneau', () => {
    const icones = Object.fromEntries(NAV.map((o) => [o.id, o.icone]))
    expect(icones['bus']).toBe('bus')
    expect(icones['expedition']).toBe('route')
    expect(icones['deroulant']).toBe('panneau-deroulant')
    expect(NAV.filter((o) => o.icone === 'circle-dot')).toEqual([])
  })
  it('chaque entrée a une icône propre (pas l’icône par défaut)', () => {
    const sans = NAV.flatMap((o) => o.entrees).filter(
      (e) => !e.icone && ICONES_ENTREES[e.id] === undefined,
    )
    expect(sans.map((e) => e.id)).toEqual([])
    expect(iconeEntree({ id: 'x', libelle: 'X', to: '/', permission: 'train.consulter' })).toBe(
      'circle-dot',
    )
  })
  it('l’Administration est regroupée en Paramétrage, Pages de Circé et Autres pages', () => {
    const admin = NAV.find((o) => o.id === 'admin')?.entrees ?? []
    const groupes = admin.map((e) => e.groupe)
    expect([...new Set(groupes)]).toEqual(['Paramétrage', 'Pages de Circé', 'Autres pages'])
    // chaque groupe est contigu : le titre n'est écrit qu'une fois
    expect(groupes.filter((g, i) => g !== groupes[i - 1])).toEqual([...new Set(groupes)])
    expect(admin.every((e) => e.groupe)).toBe(true)
  })
})
