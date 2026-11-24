import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'

// Composant réservé au nouveau dashboard : aucun filtre partagé avec les modules gelés n'est modifié.
export function DashboardFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const all = [
    ...options,
    ...selected
      .filter((v) => !options.some((o) => o.value === v))
      .map((v) => ({ value: v, label: v })),
  ]
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('fr')
  const filtered = all.filter((o) => normalize(o.label).includes(normalize(search)))
  return (
    <Popover.Root>
      <Popover.Trigger
        className="min-w-40 rounded border border-slate-300 bg-white px-3 py-2 text-left text-sm"
        aria-label={`Filtre ${label}`}
      >
        <span className="block font-medium">{label}</span>
        <span className="text-slate-600">
          {selected.length
            ? selected.length <= 2
              ? selected.map((v) => all.find((o) => o.value === v)?.label ?? v).join(', ')
              : `${selected.length} choisis`
            : 'Tous'}{' '}
          ▾
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={5}
          className="z-50 w-80 rounded border bg-white p-4 shadow-lg"
          aria-label={`Choix du filtre ${label}`}
        >
          <strong>{label}</strong>
          <p className="my-2 text-xs text-slate-600">
            Plusieurs choix possibles. Les valeurs tiennent compte des autres filtres.
          </p>
          <input
            aria-label={`Rechercher une valeur de ${label}`}
            type="search"
            className="mb-2 w-full rounded border p-2 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
            }}
          />
          <div className="max-h-64 space-y-2 overflow-auto">
            {filtered.map((o) => (
              <label key={o.value} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={(e) => {
                    onChange(
                      e.target.checked
                        ? [...selected, o.value]
                        : selected.filter((v) => v !== o.value),
                    )
                  }}
                />
                {o.label}
              </label>
            ))}
            {!filtered.length && <p className="text-sm">Aucune valeur compatible.</p>}
          </div>
          <div className="mt-3 flex justify-between gap-3">
            <button
              type="button"
              className="text-sm underline"
              onClick={() => {
                onChange([])
              }}
            >
              Tout décocher
            </button>
            <Popover.Close className="rounded border px-3 py-1 text-sm">Fermer</Popover.Close>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
