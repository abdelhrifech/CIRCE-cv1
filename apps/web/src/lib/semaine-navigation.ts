// « À traiter » (2 m² fixe, pliage) : recherche par semaine de départ, au format ISO « 2026-W48 » (celui de
// `<input type="week">` et de `formatSemaineIso`). Par défaut : la semaine en cours (demande du 23/11).
import { formatSemaineIso, semaineIsoDe } from '@circe/shared'

const FORMAT = /^(\d{4})-W(\d{2})$/

export const estSemaineIso = (v: string) => FORMAT.test(v)

export const semaineCourante = (maintenant = new Date()) =>
  formatSemaineIso(semaineIsoDe(maintenant))

/** Semaine de départ par défaut des écrans « À traiter » et « Préparation » : la semaine en cours + 1 (demande du 23/11). */
export const semaineParDefaut = (maintenant = new Date()) =>
  decalerSemaine(semaineCourante(maintenant), 1)

/** Lundi (UTC) d'une semaine ISO. */
function lundi(v: string): Date | null {
  const m = FORMAT.exec(v)
  if (!m) return null
  const annee = Number(m[1]),
    semaine = Number(m[2])
  const quatreJanvier = new Date(Date.UTC(annee, 0, 4))
  const jour = quatreJanvier.getUTCDay() || 7
  return new Date(Date.UTC(annee, 0, 4 - (jour - 1) + (semaine - 1) * 7))
}

/** Semaine décalée de `n` semaines (n négatif : vers le passé) ; la valeur est rendue telle quelle si elle est invalide. */
export function decalerSemaine(v: string, n: number): string {
  const l = lundi(v)
  if (!l) return v
  return formatSemaineIso(semaineIsoDe(new Date(l.getTime() + n * 7 * 86_400_000)))
}

/** Une semaine (ou une liste de semaines) est-elle dans l'intervalle [de, a] ? Une borne vide n'est pas une borne. */
export function dansIntervalle(semaine: string | null | undefined, de: string, a: string): boolean {
  const deValide = estSemaineIso(de),
    aValide = estSemaineIso(a)
  if (!deValide && !aValide) return true
  if (!semaine || !estSemaineIso(semaine)) return false
  return (!deValide || semaine >= de) && (!aValide || semaine <= a)
}
