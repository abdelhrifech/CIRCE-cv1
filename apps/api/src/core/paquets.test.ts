import { describe, expect, it, vi } from 'vitest'
import { parPaquets } from './paquets.ts'

describe('ANO-035 / ANO-050 / ANO-051 lecture par paquets', () => {
  it('conserve toutes les lignes lorsqu’un paquet retourne plus de 200 000 résultats', async () => {
    const nombreux = Array.from({ length: 200_001 }, (_, id) => ({ id }))
    const dernier = { id: 200_001 }
    const lire = vi.fn((ids: number[]) => Promise.resolve(ids[0] === 1 ? nombreux : [dernier]))

    const resultat = await parPaquets([1, 2, 3], lire, 2)

    expect(lire.mock.calls.map(([ids]) => ids)).toEqual([[1, 2], [3]])
    expect(resultat).toHaveLength(200_002)
    expect(resultat[0]).toBe(nombreux[0])
    expect(resultat[100_000]).toBe(nombreux[100_000])
    expect(resultat[200_000]).toBe(nombreux[200_000])
    expect(resultat[200_001]).toBe(dernier)
  })

  it('ne lance aucune lecture pour une liste vide', async () => {
    const lire = vi.fn(() => Promise.resolve([1]))

    expect(await parPaquets([], lire)).toEqual([])
    expect(lire).not.toHaveBeenCalled()
  })

  it('conserve l’ordre et les doublons entre des résultats vides ou non vides', async () => {
    const lire = vi.fn((ids: number[]) => Promise.resolve(ids[0] === 3 ? [] : [ids[0], ids[0]]))

    expect(await parPaquets([1, 2, 3, 4, 5], lire, 2)).toEqual([1, 1, 5, 5])
    expect(lire.mock.calls.map(([ids]) => ids)).toEqual([[1, 2], [3, 4], [5]])
  })
})
