// DESIGN.md §4.5 (filtres d'en-tête) / maquette `ui.js` (`editeurEntete`) : sous le titre de chaque colonne, un champ
// « Filtrer » toujours visible, suivi de l'entonnoir qui ouvre la liste des opérateurs (« Contient » par défaut, comme
// dans les grilles de Circé). Texte sans tenir compte des accents ni des majuscules ; sur une colonne de nombres,
// « >10 », « <5 », « >=3 », « =0 » (lib/filtres-tableau.ts).
import * as Popover from '@radix-ui/react-popover'
import type { ReactNode } from 'react'
import { OPERATEURS, type Operateur } from '../../lib/filtres-tableau.ts'
import { Icone } from './icone.tsx'

export function FiltreColonne({
  titre,
  valeur,
  operateur,
  onChange,
  onOperateur,
  children,
}: {
  titre: string
  valeur: string
  operateur: Operateur
  onChange: (valeur: string) => void
  onOperateur: (operateur: Operateur) => void
  /** Intitulé de la colonne (bouton de tri), affiché au-dessus du champ. */
  children: ReactNode
}) {
  const sansSaisie = operateur === 'vide' || operateur === 'nonvide'
  const actif = operateur !== 'contient' || valeur !== ''
  return (
    <div className="flex flex-col gap-1">
      {children}
      <div className="flex items-center gap-1">
        <input
          type="search"
          autoComplete="off"
          spellCheck={false}
          disabled={sansSaisie}
          aria-label={`Filtrer ${titre}`}
          placeholder={sansSaisie ? OPERATEURS[operateur] : 'Filtrer'}
          title={OPERATEURS[operateur]}
          className="w-full min-w-20 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-normal disabled:bg-slate-100"
          value={sansSaisie ? '' : valeur}
          onChange={(e) => {
            onChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onChange('')
          }}
        />
        <Popover.Root>
          <Popover.Trigger
            aria-label={`Opérateur du filtre de la colonne ${titre} : ${OPERATEURS[operateur]}`}
            title={`Opérateur du filtre : ${OPERATEURS[operateur]} (cliquer pour changer)`}
            className={`rounded p-1 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-sky-600 ${
              actif ? 'bg-sky-100 text-sky-800' : 'text-slate-500'
            }`}
          >
            <Icone nom="filter" className="size-3.5" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={4}
              role="menu"
              aria-label={`Opérateur de la colonne ${titre}`}
              className="z-50 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
            >
              {(Object.entries(OPERATEURS) as [Operateur, string][]).map(([cle, libelle]) => (
                <Popover.Close
                  key={cle}
                  role="menuitemradio"
                  aria-checked={cle === operateur}
                  className={`block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                    cle === operateur ? 'bg-sky-50 font-medium text-sky-900' : ''
                  }`}
                  onClick={() => {
                    onOperateur(cle)
                  }}
                >
                  {cle === operateur ? '✓ ' : ''}
                  {libelle}
                </Popover.Close>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  )
}
