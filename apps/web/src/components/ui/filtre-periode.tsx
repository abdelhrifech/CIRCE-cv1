// Liste des colis (demande du 23/11) : période Début / Fin de la recherche de Circé (« Début : 16/11/2026 Fin :
// 23/11/2026 », les 7 derniers jours par défaut), présentée comme la semaine de départ des autres écrans, avec
// « Actualiser » au bout. Dates au format ISO (aaaa-mm-jj, celui de `<input type="date">`). Une borne vide n'est pas
// une borne.
import { Icone } from './icone.tsx'

/** Date du jour (locale) décalée de `jours`, au format aaaa-mm-jj. */
export function jourIso(jours = 0, maintenant = new Date()): string {
  const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + jours)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${String(d.getFullYear())}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Une date ISO (jour ou date-heure) est-elle dans [debut, fin] ? Comparaison au jour, en heure locale. */
export function dansPeriode(iso: string, debut: string, fin: string): boolean {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const jour = jourIso(0, d)
  return (!debut || jour >= debut) && (!fin || jour <= fin)
}

export function FiltrePeriode({
  valeur,
  onChange,
  onActualiser,
}: {
  valeur: { debut: string; fin: string }
  onChange: (v: { debut: string; fin: string }) => void
  /** Relit les données depuis l'API. */
  onActualiser: () => void
}) {
  const champ =
    'rounded border border-sky-200 bg-white px-2 py-1 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600'
  return (
    <div
      role="group"
      aria-label="Période"
      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-50 py-1 pl-3 pr-2 text-sm text-sky-900"
    >
      <Icone nom="calendar" className="size-4" />
      <span className="mr-1 font-semibold">Début</span>
      <input
        type="date"
        aria-label="Début"
        className={champ}
        value={valeur.debut}
        max={valeur.fin || undefined}
        onChange={(e) => {
          onChange({ ...valeur, debut: e.target.value })
        }}
      />
      <span className="px-0.5 font-semibold">Fin</span>
      <input
        type="date"
        aria-label="Fin"
        className={champ}
        value={valeur.fin}
        min={valeur.debut || undefined}
        onChange={(e) => {
          onChange({ ...valeur, fin: e.target.value })
        }}
      />
      <button
        type="button"
        className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-sky-600 bg-white px-2.5 py-1 font-medium hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600"
        title="Relire les données depuis le serveur"
        onClick={onActualiser}
      >
        <Icone nom="refresh" />
        Actualiser
      </button>
    </div>
  )
}
