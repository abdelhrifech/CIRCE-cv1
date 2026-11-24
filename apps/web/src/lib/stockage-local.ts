// EX-NEW16-TRA-001 / DESIGN.md §4.5 : la vue d'un tableau (colonnes affichées, ordre, densité) est gardée sur le poste,
// d'une ouverture à l'autre. Le stockage peut être désactivé ou plein : on retombe alors sur les valeurs par défaut.
import { useSyncExternalStore } from 'react'

const PREFIXE = 'circe:'
const auditeurs = new Set<() => void>()

function notifier() {
  for (const auditeur of auditeurs) auditeur()
}

function abonner(rappel: () => void) {
  auditeurs.add(rappel)
  window.addEventListener('storage', rappel)
  return () => {
    auditeurs.delete(rappel)
    window.removeEventListener('storage', rappel)
  }
}

function lireBrut(cle: string): string | null {
  try {
    return window.localStorage.getItem(PREFIXE + cle)
  } catch {
    return null
  }
}

/** Texte brut mémorisé sur le poste (null si rien, ou côté serveur) ; se met à jour quand on l'écrit. */
export function useStockageBrut(cle: string): string | null {
  return useSyncExternalStore(
    abonner,
    () => lireBrut(cle),
    () => null,
  )
}

export function ecrireStockage(cle: string, valeur: unknown): void {
  try {
    window.localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur))
  } catch {
    /* Le tableau reste utilisable sans mémorisation. */
  }
  notifier()
}

export function effacerStockage(cle: string): void {
  try {
    window.localStorage.removeItem(PREFIXE + cle)
  } catch {
    /* Idem. */
  }
  notifier()
}
