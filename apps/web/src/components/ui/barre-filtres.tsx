// DESIGN.md §4.3 (barre de filtres) : champ « N° de dossier » en tête, quatre filtres visibles au plus sous forme de
// pastilles compactes, les autres par « + Filtre » (un filtre actif reste toujours visible), puis « Réinitialiser ».
// Les filtres sont des listes à cocher (FiltreListe) : aucune coche = tout ; compteurs ; listes « smart » au-delà de 8 valeurs.
import * as Popover from '@radix-ui/react-popover'
import { useState, type ReactNode } from 'react'
import { FiltreListe, type OptionFiltre } from './filtre-liste.tsx'
import { Icone } from './icone.tsx'

export interface DefinitionFiltre {
  id: string
  libelle: string
  options: OptionFiltre[]
  selection: string[]
  onChange: (selection: string[]) => void
  /** Garde toutes les valeurs, même sans résultat (filtre Départ). */
  toutesValeurs?: boolean
  /** Une seule valeur à la fois. */
  choixUnique?: boolean
}

export interface ChampDossier {
  valeur: string
  onChange: (valeur: string) => void
  /** Touche Entrée dans le champ (valider la saisie). */
  onEntree?: () => void
}

/** Options d'un filtre du dashboard (value / label / nombre) au format du filtre en liste. */
export const enOptionsFiltre = (
  options: { value: string; label: string; nombre?: number }[],
): OptionFiltre[] => options.map((o) => ({ valeur: o.value, libelle: o.label, nombre: o.nombre }))

/** Nombre maximal de filtres visibles d'emblée (DESIGN.md §4.3). */
export const FILTRES_VISIBLES = 4

/** Filtres affichés : les premiers, plus ceux qui sont actifs ou ajoutés par « + Filtre ». */
export function filtresAffiches(
  filtres: DefinitionFiltre[],
  ajoutes: ReadonlySet<string>,
  visibles = FILTRES_VISIBLES,
) {
  const affiches = filtres.filter(
    (f, i) => i < visibles || f.selection.length > 0 || ajoutes.has(f.id),
  )
  return { affiches, restants: filtres.filter((f) => !affiches.includes(f)) }
}

export function BarreFiltres({
  libelle,
  dossier,
  filtres,
  onReinitialiser,
  libelleReinitialiser = 'Réinitialiser',
  visibles = FILTRES_VISIBLES,
  enPlus,
  debut,
}: {
  /** Nom accessible du groupe de filtres. */
  libelle: string
  dossier?: ChampDossier
  filtres: DefinitionFiltre[]
  /** Remet les filtres par défaut ; sans elle, pas de bouton. */
  onReinitialiser?: () => void
  /** Libellé du bouton qui remet les filtres par défaut. */
  libelleReinitialiser?: string
  visibles?: number
  /** Éléments propres à l'écran, avant le bouton qui efface les filtres. */
  enPlus?: ReactNode
  /** Élément placé en tête de la barre (ex. semaine de départ, toujours en premier). */
  debut?: ReactNode
}) {
  const [ajoutes, setAjoutes] = useState<ReadonlySet<string>>(new Set())
  const { affiches, restants } = filtresAffiches(filtres, ajoutes, visibles)
  return (
    <div role="group" aria-label={libelle} className="flex flex-wrap items-center gap-2">
      {debut}
      {dossier && (
        <input
          type="search"
          aria-label="Dossier(s)"
          title="N° de dossier : saisir ou coller plusieurs numéros"
          placeholder="N° de dossier…"
          className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={dossier.valeur}
          onChange={(e) => {
            dossier.onChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') dossier.onEntree?.()
          }}
        />
      )}
      {affiches.map((f) => (
        <FiltreListe
          key={f.id}
          libelle={f.libelle}
          options={f.options}
          selection={f.selection}
          onChange={f.onChange}
          toutesValeurs={f.toutesValeurs}
          choixUnique={f.choixUnique}
        />
      ))}
      {restants.length > 0 && (
        <Popover.Root>
          <Popover.Trigger className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-400 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600">
            <Icone nom="plus" className="size-3" />
            Filtre
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              aria-label="Ajouter un filtre"
              className="z-50 min-w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
            >
              {restants.map((f) => (
                <Popover.Close
                  key={f.id}
                  className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setAjoutes(new Set([...ajoutes, f.id]))
                  }}
                >
                  {f.libelle}
                </Popover.Close>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      {enPlus}
      {onReinitialiser && (
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600"
          onClick={() => {
            setAjoutes(new Set())
            onReinitialiser()
          }}
        >
          {libelleReinitialiser}
        </button>
      )}
    </div>
  )
}
