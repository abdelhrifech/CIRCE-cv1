import * as Popover from '@radix-ui/react-popover'
import { useState } from 'react'
import { facetOptions, type Facet, type FacetSelection } from '../../lib/faceted-filters.ts'

export function FacetFilters<T>({
  rows,
  facets,
  selected,
  onChange,
  optionsByFacet,
  rowsForFacet,
}: {
  rows: T[]
  facets: Facet<T>[]
  rowsForFacet?: (facet: Facet<T>) => T[]
  optionsByFacet?: Record<string, { value: string; label: string; count: number }[]>
  selected: FacetSelection
  onChange: (selection: FacetSelection) => void
}) {
  const [search, setSearch] = useState<Record<string, string>>({})
  return (
    <div
      className="my-4 flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filtres multisélection"
    >
      {facets.map((facet) => {
        const chosen = selected[facet.id] ?? []
        const available =
          optionsByFacet?.[facet.id] ??
          facetOptions(rowsForFacet?.(facet) ?? rows, facets, selected, facet.id)
        const options = [
          ...available,
          ...chosen
            .filter((value) => !available.some((option) => option.value === value))
            .map((value) => ({ value, label: facet.labels?.[value] ?? value, count: 0 })),
        ]
        const visibleOptions = options.filter((option) =>
          option.label
            .toLocaleLowerCase('fr')
            .includes((search[facet.id] ?? '').toLocaleLowerCase('fr')),
        )
        return (
          <Popover.Root key={facet.id}>
            <Popover.Trigger
              className={`rounded-full border px-3 py-2 text-sm ${chosen.length ? 'border-violet-400 bg-violet-50 text-violet-900' : 'border-slate-300 bg-white'}`}
            >
              {facet.label}
              {chosen.length > 0 && ` · ${chosen.length}`} <span aria-hidden>⌄</span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                aria-label={facet.label}
                sideOffset={6}
                className="z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
              >
                <input
                  aria-label={`Rechercher ${facet.label}`}
                  placeholder="Rechercher…"
                  value={search[facet.id] ?? ''}
                  onChange={(e) => {
                    setSearch({ ...search, [facet.id]: e.target.value })
                  }}
                  className="mb-2 w-full rounded border p-2 text-sm"
                />
                <div className="max-h-64 overflow-auto">
                  {visibleOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-violet-50"
                    >
                      <input
                        type="checkbox"
                        checked={chosen.includes(option.value)}
                        onChange={(e) => {
                          onChange({
                            ...selected,
                            [facet.id]: e.target.checked
                              ? [...chosen, option.value]
                              : chosen.filter((value) => value !== option.value),
                          })
                        }}
                      />
                      <span className="flex-1">{option.label}</span>
                      <span className="text-slate-500">{option.count}</span>
                    </label>
                  ))}
                  {visibleOptions.length === 0 && (
                    <p className="p-2 text-sm text-slate-500">Aucune valeur disponible</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...selected, [facet.id]: [] })
                  }}
                  className="mt-2 text-sm underline"
                >
                  Effacer {facet.label}
                </button>
                <Popover.Close
                  aria-label={`Fermer ${facet.label}`}
                  className="float-right mt-2 rounded px-2"
                >
                  Fermer
                </Popover.Close>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )
      })}
      <button
        type="button"
        className="px-2 text-sm underline"
        onClick={() => {
          onChange({})
        }}
      >
        Réinitialiser les filtres
      </button>
    </div>
  )
}
