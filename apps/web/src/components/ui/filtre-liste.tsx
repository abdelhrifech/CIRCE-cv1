// RG-REC-016 / DESIGN.md §4.3 : filtre en liste à cocher, présenté en pastille compacte (maquette, `ui.filters`).
// Aucune coche = tout ; OU entre les valeurs cochées ; compteur par valeur (lignes qu'elle donnerait avec les autres
// filtres posés). Liste « smart » (ERG-06) : au-delà de 8 valeurs, seules les valeurs compatibles avec les autres filtres
// (plus celles déjà cochées) sont proposées, un lien « Afficher aussi N valeurs sans résultat » donne les autres. Une liste
// courte et le filtre Départ (`toutesValeurs`) gardent toutes leurs valeurs, celles à 0 grisées.
import * as Popover from '@radix-ui/react-popover'
import { useId, useState } from 'react'
import { Icone } from './icone.tsx'

export interface OptionFiltre {
  valeur: string
  libelle: string
  nombre?: number
}

interface FiltreListeProps {
  libelle: string
  options: OptionFiltre[]
  selection: string[]
  onChange: (selection: string[]) => void
  /** Garde toutes les valeurs, même sans résultat (filtre Départ). */
  toutesValeurs?: boolean
  /** Une seule valeur à la fois (filtre à valeur unique côté serveur) : choisir une valeur remplace la précédente. */
  choixUnique?: boolean
}

/** Au-delà de ce nombre de valeurs, la liste devient « smart » et propose une recherche. */
export const SEUIL_LISTE_SMART = 8

/** Valeurs affichées d'une liste, et nombre de valeurs masquées parce que sans résultat. */
export function valeursProposees(
  options: OptionFiltre[],
  selection: string[],
  { toutesValeurs = false, toutes = false }: { toutesValeurs?: boolean; toutes?: boolean } = {},
) {
  const longue = options.length > SEUIL_LISTE_SMART && !toutesValeurs
  if (!longue || toutes) return { proposees: options, masquees: 0 }
  const proposees = options.filter(
    (o) => selection.includes(o.valeur) || o.nombre === undefined || o.nombre > 0,
  )
  return { proposees, masquees: options.length - proposees.length }
}

const normaliser = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')

/** Texte de la pastille : « Départ », ou « Départ S43 + S44 » quand le filtre est actif (trois valeurs : « Départ · 3 »). */
export function resumeFiltre(
  libelle: string,
  options: OptionFiltre[],
  selection: string[],
): string {
  if (selection.length === 0) return libelle
  if (selection.length > 2) return `${libelle} · ${String(selection.length)}`
  const noms = selection.map((v) => options.find((o) => o.valeur === v)?.libelle ?? v)
  return `${libelle} ${noms.join(' + ')}`
}

export function FiltreListe({
  libelle,
  options,
  selection,
  onChange,
  toutesValeurs,
  choixUnique,
}: FiltreListeProps) {
  const [recherche, setRecherche] = useState('')
  const [toutes, setToutes] = useState(false)
  const idAide = useId()
  const actif = selection.length > 0
  const { proposees, masquees } = valeursProposees(options, selection, { toutesValeurs, toutes })
  const avecRecherche = options.length > SEUIL_LISTE_SMART
  const affichees = proposees.filter((o) => normaliser(o.libelle).includes(normaliser(recherche)))
  function basculer(valeur: string) {
    if (choixUnique) {
      onChange(selection.includes(valeur) ? [] : [valeur])
      return
    }
    onChange(
      selection.includes(valeur) ? selection.filter((v) => v !== valeur) : [...selection, valeur],
    )
  }
  return (
    <Popover.Root>
      <Popover.Trigger
        className={`inline-flex max-w-72 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 ${
          actif
            ? 'border-sky-600 bg-sky-50 font-medium text-sky-900'
            : 'border-slate-300 bg-white text-slate-700'
        }`}
        aria-label={`Filtre ${libelle}`}
        title={actif ? resumeFiltre(libelle, options, selection) : `Filtrer par ${libelle}`}
      >
        <span className="truncate">{resumeFiltre(libelle, options, selection)}</span>
        <Icone nom="chevron-down" className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 max-h-80 min-w-52 max-w-80 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg"
        >
          <fieldset>
            <legend className="mb-1 text-xs font-semibold uppercase text-slate-500">
              {libelle}
            </legend>
            {avecRecherche && (
              <input
                type="search"
                aria-label={`Rechercher une valeur de ${libelle}`}
                placeholder="Rechercher…"
                className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                value={recherche}
                onChange={(e) => {
                  setRecherche(e.target.value)
                }}
              />
            )}
            {affichees.length === 0 && <p className="text-sm text-slate-500">Aucune valeur.</p>}
            {affichees.map((o, i) => {
              const sansResultat = o.nombre === 0 && !selection.includes(o.valeur)
              return (
                <label
                  key={o.valeur}
                  className={`flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50 ${
                    sansResultat ? 'text-slate-400' : ''
                  }`}
                >
                  <input
                    type={choixUnique ? 'radio' : 'checkbox'}
                    aria-label={o.libelle || '—'}
                    aria-describedby={o.nombre === undefined ? undefined : `${idAide}-${String(i)}`}
                    checked={selection.includes(o.valeur)}
                    onChange={() => {
                      basculer(o.valeur)
                    }}
                  />
                  <span className="flex-1" aria-hidden="true">
                    {o.libelle || '—'}
                  </span>
                  {o.nombre !== undefined && (
                    <span
                      id={`${idAide}-${String(i)}`}
                      className="text-xs tabular-nums text-slate-500"
                      title="Lignes avec les autres filtres posés"
                    >
                      {o.nombre.toLocaleString('fr-FR')}
                    </span>
                  )}
                </label>
              )
            })}
          </fieldset>
          {masquees > 0 && (
            <button
              type="button"
              className="mt-2 block text-left text-xs underline"
              onClick={() => {
                setToutes(true)
              }}
            >
              Afficher aussi {masquees} valeur{masquees > 1 ? 's' : ''} sans résultat
            </button>
          )}
          {toutes && options.length > SEUIL_LISTE_SMART && !toutesValeurs && (
            <button
              type="button"
              className="mt-2 block text-left text-xs underline"
              onClick={() => {
                setToutes(false)
              }}
            >
              Masquer les valeurs sans résultat
            </button>
          )}
          {actif && (
            <button
              type="button"
              className="mt-2 block text-xs underline"
              onClick={() => {
                onChange([])
              }}
            >
              Tout afficher
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
