// « À traiter » et « Préparation » (2 m² fixe, pliage, déroulant ; demande du 23/11) : semaine de départ, du … au …
// (sélecteur de semaine du navigateur, calendrier dans Edge et Chrome), semaine précédente / suivante, et « Actualiser »
// au bout. Par défaut : la semaine en cours + 1 (`semaineParDefaut`). Une borne vide n'est pas une borne.
import { decalerSemaine } from '../../lib/semaine-navigation.ts'
import { Icone } from './icone.tsx'
export function FiltreSemaines({
  valeur,
  onChange,
  onActualiser,
}: {
  valeur: { de: string; a: string }
  onChange: (v: { de: string; a: string }) => void
  /** Relit les données depuis l'API (bouton « Actualiser » au bout de la semaine, demande du 23/11). */
  onActualiser: () => void
}) {
  const decaler = (n: number) => {
    onChange({
      de: valeur.de ? decalerSemaine(valeur.de, n) : valeur.de,
      a: valeur.a ? decalerSemaine(valeur.a, n) : valeur.a,
    })
  }
  const champ =
    'rounded border border-sky-200 bg-white px-2 py-1 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600'
  const fleche =
    'inline-flex size-8 items-center justify-center rounded-full text-xl leading-none hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600'
  return (
    <div
      role="group"
      aria-label="Semaine de départ"
      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-50 py-1 pl-3 pr-2 text-sm text-sky-900"
    >
      <Icone nom="calendar" className="size-4" />
      <span className="mr-1 font-semibold">Semaine de départ</span>
      <button
        type="button"
        className={fleche}
        aria-label="Semaine précédente"
        title="Semaine précédente"
        onClick={() => {
          decaler(-1)
        }}
      >
        ‹
      </button>
      <input
        type="week"
        aria-label="Semaine de départ : du"
        className={champ}
        value={valeur.de}
        max={valeur.a || undefined}
        onChange={(e) => {
          onChange({ ...valeur, de: e.target.value })
        }}
      />
      <span className="px-0.5">au</span>
      <input
        type="week"
        aria-label="Semaine de départ : au"
        className={champ}
        value={valeur.a}
        min={valeur.de || undefined}
        onChange={(e) => {
          onChange({ ...valeur, a: e.target.value })
        }}
      />
      <button
        type="button"
        className={fleche}
        aria-label="Semaine suivante"
        title="Semaine suivante"
        onClick={() => {
          decaler(1)
        }}
      >
        ›
      </button>
      <button
        type="button"
        className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-sky-600 bg-white px-2.5 py-1 font-medium hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600"
        title="Relire les dossiers depuis le serveur"
        onClick={onActualiser}
      >
        <Icone nom="refresh" />
        Actualiser
      </button>
    </div>
  )
}
