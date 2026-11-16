import type { Jdd } from '../contexte.ts'
import { aleatoire } from './aleatoire.ts'
import { concurrence } from './concurrence.ts'
import { demo } from './demo.ts'
import { doublons } from './doublons.ts'
import { incomplet } from './incomplet.ts'
import { invalides } from './invalides.ts'
import { interModules } from './inter-modules.ts'
import { limites } from './limites.ts'
import { nominal } from './nominal.ts'
import { profils } from './profils.ts'
import { rejetsReprises } from './rejets-reprises.ts'
import { statuts } from './statuts.ts'
import { volumetrie } from './volumetrie.ts'
import { transitionsInterdites } from './transitions-interdites.ts'

export interface Scenario {
  nom: string
  /** RG / cellules couvertes (documentation, reprise par le rapport). */
  regles: string[]
  /** État attendu après génération (documentation). */
  attendu: string
  generer(jdd: Jdd): Promise<void>
}

export const SCENARIOS: Scenario[] = [
  nominal,
  incomplet,
  limites,
  invalides,
  statuts,
  transitionsInterdites,
  doublons,
  profils,
  rejetsReprises,
  interModules,
  concurrence,
  aleatoire,
  volumetrie,
]

/**
 * Familles qui ne font pas partie de la passe par défaut (`pnpm jdd`, tests massifs) : résolues seulement quand elles
 * sont demandées par leur nom (`--scenarios=demo`). `demo` : jeux de démonstration de la base de dev (`pnpm jdd:demo`).
 */
export const SCENARIOS_COMPLEMENTAIRES: Scenario[] = [demo]
