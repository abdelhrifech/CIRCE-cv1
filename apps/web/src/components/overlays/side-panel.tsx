import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
// Variante additive : aucun style ni comportement de la modale partagée n’est modifié.
export function SidePanel({
  title,
  open,
  onOpenChange,
  children,
  wide = false,
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`fixed inset-y-0 right-0 z-50 w-[95vw] overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}
        >
          <header className="mb-5 flex items-start justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
            <Dialog.Close aria-label="Fermer" className="rounded border px-3 py-1">
              Fermer
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
