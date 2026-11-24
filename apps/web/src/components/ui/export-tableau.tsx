import { exporterExcel, type CelluleExcel } from '../../lib/excel.ts'
import { Icone } from './icone.tsx'
import { EXPORT } from './table-metier.tsx'

// EX-NEW-NAV-001 : l’export reprend les colonnes et lignes du tableau actuellement filtré.
export function BoutonExportTableau({ nom, tableau }: { nom: string; tableau: string }) {
  function exporter() {
    const table = document.querySelector<HTMLTableElement>(
      `table[aria-label="${CSS.escape(tableau)}"]`,
    )
    if (!table) return
    const entetes = Array.from(table.tHead?.rows[0]?.cells ?? [])
    const retenues = entetes.flatMap((cellule, index) => {
      const titre = (cellule.querySelector('button')?.textContent ?? cellule.textContent)
        .replace(/[▲▼↑↓]/g, '')
        .trim()
      return titre && !['Actions', 'Sélection'].includes(titre) ? [{ titre, index }] : []
    })
    const lire = (cellule: HTMLTableCellElement | undefined): CelluleExcel => {
      if (!cellule) return ''
      const texte = cellule.textContent.replace(/\s+/g, ' ').trim()
      const normal = texte.replace(/[ \u202f\u00a0]/g, '').replace(',', '.')
      return /^-?\d+(\.\d+)?$/.test(normal) &&
        Number.isFinite(Number(normal)) &&
        Math.abs(Number(normal)) <= Number.MAX_SAFE_INTEGER
        ? Number(normal)
        : texte
    }
    const lignes = Array.from(table.tBodies)
      .flatMap((corps) => Array.from(corps.rows))
      .filter((ligne) => !ligne.hidden)
    exporterExcel(
      nom,
      retenues.map((c) => c.titre),
      lignes.map((ligne) => retenues.map((c) => lire(ligne.cells[c.index]))),
    )
  }
  return (
    <button type="button" className={`m-3 ${EXPORT}`} onClick={exporter}>
      <Icone nom="file-spreadsheet" />
      Exporter en Excel
    </button>
  )
}
