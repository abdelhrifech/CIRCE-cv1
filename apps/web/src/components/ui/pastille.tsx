import type { ReactNode } from 'react'

export type Ton = 'neutre' | 'info' | 'ok' | 'surveiller' | 'important' | 'critique'

const TONS: Record<Ton, string> = {
  neutre: 'bg-slate-100 text-slate-700',
  info: 'bg-slate-200 text-slate-800',
  ok: 'bg-emerald-100 text-emerald-800',
  surveiller: 'bg-amber-100 text-amber-800',
  important: 'bg-orange-100 text-orange-800',
  critique: 'bg-red-100 text-red-800',
}

/** Pastille de statut (rampe de la maquette du 16/11 : Info gris, plus de bleu pour le daltonisme, OK vert, À surveiller jaune, Important orange). */
export function Pastille({ ton, children }: { ton: Ton; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONS[ton]}`}
    >
      {children}
    </span>
  )
}
