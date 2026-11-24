// Q-430 (HYPOTHÈSE PRISE) : l'écran « À traiter » de l'ancien Circé propose « Fiche de préparation Détail »,
// « Fiche de préparation Synthèse » et « Colisage » (Rapport.cs ; modèles .rdlc non lus, contenu non documenté).
// Version provisoire : trois exports Excel construits à partir des lignes affichées (filtres de la page compris).
//  - Détail : une ligne par ligne de préparation, colonnes de l'écran ;
//  - Synthèse : quantités à préparer par atelier, format et visuel ;
//  - Colisage : quantités par destinataire, départ et format.
import type { CelluleExcel } from './excel.ts'

export interface LigneFiche {
  type: string | null
  repartition: string | number | null
  dossier: number
  annonceur: string | null
  quantite: number | null
  visuel: string | null
  repiquage: string | null
  format: string | null
  destinataire: string | null
  depart: string | null
  atelier: string | null
}

export interface Fiche {
  titres: string[]
  lignes: CelluleExcel[][]
}

const texte = (v: string | null) => v?.trim() || '—'
const quantite = (v: number | null) => v ?? 0
const comparer = (a: string, b: string) => a.localeCompare(b, 'fr', { numeric: true })

/** Regroupe les lignes par clé et additionne les quantités ; l'ordre suit la clé. */
function regrouper(lignes: LigneFiche[], cle: (l: LigneFiche) => string[]) {
  const groupes = new Map<string, { cle: string[]; quantite: number; lignes: number }>()
  for (const l of lignes) {
    const k = cle(l)
    const id = k.join('\u0000')
    const g = groupes.get(id) ?? { cle: k, quantite: 0, lignes: 0 }
    g.quantite += quantite(l.quantite)
    g.lignes += 1
    groupes.set(id, g)
  }
  // Les valeurs absentes (« — ») passent en dernier.
  const tri = (k: string[]) => k.map((v) => (v === '—' ? '￿' : v)).join(' ')
  return [...groupes.values()].sort((a, b) => comparer(tri(a.cle), tri(b.cle)))
}

export function ficheDetail(lignes: LigneFiche[]): Fiche {
  return {
    titres: [
      'Type',
      'Répart',
      'Dossier',
      'Annonceur',
      'Quantité',
      'Visuel',
      'Repiquage',
      'Format',
      'Destinataire',
      'Départ',
      'Atelier',
    ],
    lignes: lignes.map((l) => [
      l.type,
      l.repartition,
      l.dossier,
      l.annonceur,
      l.quantite,
      l.visuel,
      l.repiquage,
      l.format,
      l.destinataire,
      l.depart,
      l.atelier,
    ]),
  }
}

export function ficheSynthese(lignes: LigneFiche[]): Fiche {
  return {
    titres: ['Atelier', 'Format', 'Annonceur', 'Visuel', 'Lignes', 'Quantité à préparer'],
    lignes: regrouper(lignes, (l) => [
      texte(l.atelier),
      texte(l.format),
      texte(l.annonceur),
      texte(l.visuel),
    ]).map((g) => [...g.cle, g.lignes, g.quantite]),
  }
}

export function ficheColisage(lignes: LigneFiche[]): Fiche {
  return {
    titres: ['Destinataire', 'Départ', 'Format', 'Lignes', 'Quantité à colisser'],
    lignes: regrouper(lignes, (l) => [texte(l.destinataire), texte(l.depart), texte(l.format)]).map(
      (g) => [...g.cle, g.lignes, g.quantite],
    ),
  }
}
