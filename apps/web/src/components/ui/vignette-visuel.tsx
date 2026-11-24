// DESIGN.md §4.5 / maquette `ui.poster` (ui.js:527-534, app.css:534-535) : petite vignette d'affiche dans les listes.
// En attendant la photo du visuel, un rectangle au format affiche, de couleur stable par visuel, avec le nom du thème
// (demande du 23/11). La couleur est un repère visuel, pas une information : le nom reste lisible et dans l'infobulle.
// Colonne « Visuel » à part de la colonne « Thème » (texte), et zoom de la vignette au survol ou au focus clavier
// (demande du 24/11) : l'aperçu agrandi s'ouvre au-dessus du tableau (Popover, jamais rogné par le défilement).
import * as Popover from '@radix-ui/react-popover'
import { useState } from 'react'

/** Couleurs des vignettes de la maquette (`POSTER`, ui.js:528). */
const COULEURS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#6250d6',
  '#e34948',
  '#008300',
  '#c98500',
  '#d55181',
  '#1c5cab',
  '#0d366b',
]

/** Dégradé stable pour un nom de visuel (même calcul que la maquette). */
export function degradeVisuel(nom: string): string {
  let h = 0
  for (const c of nom) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0
  const c1 = COULEURS[h % COULEURS.length] ?? '#2a78d6'
  const c2 = COULEURS[(h >>> 4) % COULEURS.length] ?? '#0d366b'
  return `linear-gradient(160deg, ${c1}, ${c2})`
}

function Affiche({ theme, grand = false }: { theme: string; grand?: boolean }) {
  return (
    <span
      className={
        grand
          ? 'flex h-72 w-52 items-end overflow-hidden rounded-md p-3 text-lg font-extrabold leading-tight text-white shadow-xl'
          : 'flex h-16 w-12 shrink-0 items-end overflow-hidden rounded p-1 text-[8px] font-extrabold leading-tight text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]'
      }
      style={{ background: degradeVisuel(theme) }}
    >
      <span className={grand ? 'break-words' : 'line-clamp-5 break-words'}>{theme}</span>
    </span>
  )
}

export function VignetteVisuel({ theme }: { theme: string | null }) {
  const [zoom, setZoom] = useState(false)
  if (!theme) return <span className="text-slate-400">—</span>
  return (
    <Popover.Root open={zoom} onOpenChange={setZoom}>
      <Popover.Anchor asChild>
        <span
          role="img"
          tabIndex={0}
          aria-label={`Visuel « ${theme} » (survoler ou sélectionner pour agrandir)`}
          className="inline-flex cursor-zoom-in rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          onMouseEnter={() => {
            setZoom(true)
          }}
          onMouseLeave={() => {
            setZoom(false)
          }}
          onFocus={() => {
            setZoom(true)
          }}
          onBlur={() => {
            setZoom(false)
          }}
        >
          <Affiche theme={theme} />
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="center"
          sideOffset={8}
          collisionPadding={8}
          aria-label={`Visuel « ${theme} » agrandi`}
          className="pointer-events-none z-50"
          onOpenAutoFocus={(e) => {
            e.preventDefault()
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
          }}
        >
          <Affiche theme={theme} grand />
          <p className="mt-1 w-52 rounded bg-white/95 px-2 py-1 text-xs text-slate-600 shadow">
            Aperçu : la photo du visuel n’est pas encore reliée.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
