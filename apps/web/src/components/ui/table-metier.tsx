// EX-NEW16-TRA-001 / DESIGN.md §4.5 : tableau métier. Vue (colonnes affichées, ordre, densité) gardée sur le poste ;
// bouton « Colonnes n/N » avec « Vue par défaut » ; densité confort (40 px) ou compacte (32 px) ; filtre d'en-tête (icône
// entonnoir). Première colonne (demande du 23/11) : case à cocher de la ligne et actions, figée à gauche, avec une ombre
// quand le tableau défile en largeur. Sélection (facultative) : case « tout » dans l'en-tête et sélection de plusieurs lignes
// en faisant glisser la souris (EX-NEW-REC-002, lib/selection-glissee.ts). Fond blanc ; ligne cochée grisée ;
// une ligne en exception porte un liseré coloré à gauche (DESIGN.md §4.5).
import * as Popover from '@radix-ui/react-popover'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { useHauteurTableau } from '../../lib/hauteur-tableau.ts'
import { filtreTableau, type Operateur } from '../../lib/filtres-tableau.ts'
import { effacerStockage, ecrireStockage, useStockageBrut } from '../../lib/stockage-local.ts'
import { exporterExcel, type CelluleExcel } from '../../lib/excel.ts'
import { useSelectionGlissee } from '../../lib/selection-glissee.ts'
import { FiltreColonne } from './filtre-colonne.tsx'
import { Icone } from './icone.tsx'

export interface ColonneMetier<T> {
  id: string
  titre: string
  valeur: (r: T) => CelluleExcel
  rendu?: (r: T) => ReactNode
  cachee?: boolean
  somme?: boolean
  ajout?: boolean
}

/** Sélection de lignes : cle peut regrouper plusieurs lignes (ex. les lignes d'un même dossier). */
export interface SelectionTable<T, K extends string | number> {
  cle: (r: T) => K
  choisis: K[]
  onChange: (choisis: K[]) => void
  /** Ligne cochable (toutes par défaut). */
  possible?: (r: T) => boolean
  /** Nom accessible de la case d'une ligne. */
  libelle?: (r: T) => string
}

export type Lisere = 'critique' | 'attention' | 'bon'
const COULEUR_LISERE: Record<Lisere, string> = {
  critique: 'border-l-red-500',
  attention: 'border-l-amber-400',
  bon: 'border-l-emerald-500',
}

interface VueStockee {
  visibles: string[] | null
  compact: boolean
}

/** Vue mémorisée sur le poste : toute valeur illisible est ignorée (vue par défaut). */
function analyserVue(brut: string | null): VueStockee {
  const defaut: VueStockee = { visibles: null, compact: false }
  if (brut === null) return defaut
  try {
    const v: unknown = JSON.parse(brut)
    if (typeof v !== 'object' || v === null) return defaut
    const visibles = 'visibles' in v ? v.visibles : null
    const compact = 'compact' in v ? v.compact : false
    return {
      visibles:
        Array.isArray(visibles) && visibles.every((x) => typeof x === 'string') ? visibles : null,
      compact: compact === true,
    }
  } catch {
    return defaut
  }
}

/** Export Excel : bouton vert bien visible (demande du 23/11). */
export const EXPORT =
  'inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600'

/** Bouton à icône seule (nom accessible et infobulle obligatoires). */
const ICONE =
  'inline-flex size-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600'

const BOUTON =
  'inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600'

export function TableMetier<T, K extends string | number = string | number>({
  lignes,
  colonnes,
  cle,
  nom,
  onOuvrir,
  actions,
  vide = 'Aucune ligne avec ces filtres.',
  tableProps,
  lisere,
  selection,
  recherche: avecRecherche = true,
  outils,
  resume,
  compteur = true,
  densite = true,
  boutonsEnHaut = false,
  resumeDroite,
  outilsDroite,
}: {
  lignes: T[]
  colonnes: ColonneMetier<T>[]
  cle: (r: T) => string | number
  nom: string
  onOuvrir?: (r: T) => void
  actions?: (r: T) => ReactNode
  tableProps?: HTMLAttributes<HTMLTableElement>
  vide?: string
  /** Ligne en exception : liseré coloré à gauche, le fond reste blanc (DESIGN.md §4.5). */
  lisere?: (r: T) => Lisere | null
  selection?: SelectionTable<T, K>
  /** Champ « Rechercher… » au-dessus du tableau (masqué quand un champ « N° de dossier » en tient lieu, DESIGN.md §4.3). */
  recherche?: boolean
  /** Filtres de l'écran, dans le cadre du tableau, sur la ligne d'outils (DESIGN.md §4.3). */
  outils?: ReactNode
  /** Résumé de l'écran (totaux, actualiser), à gauche du nombre de lignes. */
  resume?: ReactNode
  /** « N ligne(s) » sur la ligne d'outils (masqué quand l'écran affiche son propre total). */
  compteur?: boolean
  /** Bouton « Compact » (densité des lignes) ; masqué quand l'écran n'en veut pas. */
  densite?: boolean
  /** Disposition « À traiter » (demande du 23/11) : Exporter en haut à droite après les outils de droite ; Colonnes en
   *  icône, après le résumé de droite de la ligne des filtres ; ni compteur ni Compact. */
  boutonsEnHaut?: boolean
  /** Disposition « À traiter » : à droite de la ligne des filtres (avant l'icône Colonnes). */
  resumeDroite?: ReactNode
  /** Disposition « À traiter » : en haut à droite, avant Exporter. */
  outilsDroite?: ReactNode
}) {
  const cleVue = `table:${nom}:vue`
  const vue = analyserVue(useStockageBrut(cleVue))
  const signatureDefaut = colonnes
    .filter((c) => !c.cachee)
    .map((c) => c.id)
    .join('\u0000')
  const defaut = useMemo(
    () => (signatureDefaut ? signatureDefaut.split('\u0000') : []),
    [signatureDefaut],
  )
  const [recherche, setRecherche] = useState(''),
    [tri, setTri] = useState<{ id: string; asc: boolean } | null>(null),
    [filtres, setFiltres] = useState<Record<string, string>>({}),
    [operateurs, setOperateurs] = useState<Record<string, Operateur>>({})
  const [hauteur, setHauteur] = useHauteurTableau(nom)
  // Colonnes affichées : celles de la vue gardée qui existent encore, sinon la vue par défaut.
  const stockees = (vue.visibles ?? []).filter((id) => colonnes.some((c) => c.id === id))
  const visibles = stockees.length > 0 ? stockees : defaut
  const cols = visibles.flatMap((id) => colonnes.filter((c) => c.id === id))
  const compact = vue.compact
  const aUneVueGardee = vue.visibles !== null || vue.compact
  function garder(suivantes: string[], compacte: boolean) {
    ecrireStockage(cleVue, { visibles: suivantes, compact: compacte })
  }
  function deplacer(id: string, sens: number) {
    const next = [...visibles],
      i = next.indexOf(id),
      j = i + sens
    const gauche = next[i],
      droite = next[j]
    if (gauche === undefined || droite === undefined) return
    next[i] = droite
    next[j] = gauche
    garder(next, compact)
  }
  // Colonnes déplaçables en faisant glisser leur titre (DESIGN.md §4.5) ; la vue est gardée sur le poste.
  const [colonneGlissee, setColonneGlissee] = useState<string | null>(null)
  const [colonneCible, setColonneCible] = useState<string | null>(null)
  function deposer(source: string, cible: string) {
    const de = visibles.indexOf(source),
      vers = visibles.indexOf(cible)
    if (de < 0 || vers < 0 || de === vers) return
    const next = [...visibles]
    next.splice(de, 1)
    next.splice(vers, 0, source)
    garder(next, compact)
  }
  const filtresPoses =
    Object.values(filtres).some((v) => v !== '') ||
    Object.values(operateurs).some((o) => o !== 'contient')
  const rows = useMemo(() => {
    const lire = (r: T, id: string) => colonnes.find((c) => c.id === id)?.valeur(r)
    const rs = lignes.filter(
      (r) =>
        (!recherche || cols.some((c) => filtreTableau(c.valeur(r), recherche))) &&
        colonnes.every((c) =>
          filtreTableau(lire(r, c.id), filtres[c.id] ?? '', operateurs[c.id] ?? 'contient'),
        ),
    )
    if (tri)
      rs.sort((a, b) => {
        const x = lire(a, tri.id),
          y = lire(b, tri.id)
        return (
          (typeof x === 'number' && typeof y === 'number'
            ? x - y
            : String(x ?? '').localeCompare(String(y ?? ''), 'fr', { numeric: true })) *
          (tri.asc ? 1 : -1)
        )
      })
    return rs
  }, [lignes, colonnes, cols, recherche, filtres, operateurs, tri])

  // Sélection : seules les lignes affichées (filtres compris) et cochables comptent pour « tout » et le glissement.
  const choisis: K[] = selection?.choisis ?? []
  const selectionnables: K[] = selection
    ? [...new Set(rows.filter((r) => selection.possible?.(r) ?? true).map(selection.cle))]
    : []
  const glisse = useSelectionGlissee<K>(selectionnables, choisis, (ids) => {
    selection?.onChange(ids)
  })
  const toutCoche = selectionnables.length > 0 && selectionnables.every((k) => choisis.includes(k))
  const enPartie = !toutCoche && selectionnables.some((k) => choisis.includes(k))
  const estCochee = (r: T) => (selection ? choisis.includes(selection.cle(r)) : false)
  // Ligne cochée grisée, les autres blanches (demande du 23/11).
  const fondLigne = (r: T) => (estCochee(r) ? 'bg-slate-100' : 'bg-white')

  // Ombre à droite de la première colonne figée quand des colonnes passent dessous (défilement en largeur).
  const defilement = useRef<HTMLDivElement>(null)
  const [ombre, setOmbre] = useState(false)
  const mesurer = useCallback(() => {
    const zone = defilement.current
    if (zone) setOmbre(zone.scrollLeft > 0)
  }, [])
  useEffect(() => {
    const zone = defilement.current
    if (!zone || typeof ResizeObserver === 'undefined') return
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(zone)
    const tableau = zone.querySelector('table')
    if (tableau) observateur.observe(tableau)
    return () => {
      observateur.disconnect()
    }
  }, [mesurer, cols.length])

  const cellule = compact ? 'px-3 py-1' : 'px-3 py-2.5'
  const premiere = Boolean(selection) || Boolean(actions)
  const colonnePremiere = `sticky left-0 z-[1] ${ombre ? 'shadow-[6px_0_6px_-6px_rgba(15,23,42,0.35)]' : ''}`
  const bordure = (r: T) => {
    const l = lisere?.(r)
    return lisere ? `border-l-4 ${l ? COULEUR_LISERE[l] : 'border-l-transparent'}` : ''
  }
  const boutonCompact = densite && (
    <button
      type="button"
      aria-pressed={compact}
      title="Densité des lignes : confort (40 px) ou compacte (32 px)"
      className={`${BOUTON} ${compact ? 'border-sky-600 bg-sky-50 text-sky-900' : ''}`}
      onClick={() => {
        garder(visibles, !compact)
      }}
    >
      <Icone nom="arrows-sort" />
      Compact
    </button>
  )
  // « Colonnes n/N » ; en icône seule dans la disposition « À traiter » (demande du 23/11).
  const boutonColonnes = (
    <Popover.Root>
      <Popover.Trigger
        className={boutonsEnHaut ? ICONE : BOUTON}
        aria-label={`Colonnes ${String(cols.length)}/${String(colonnes.length)}`}
        title={`Colonnes affichées / disponibles : ${String(cols.length)}/${String(colonnes.length)}`}
      >
        <Icone nom="layout-columns" />
        {!boutonsEnHaut && `Colonnes ${String(cols.length)}/${String(colonnes.length)}`}
      </Popover.Trigger>{' '}
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          className="z-50 max-h-80 w-72 overflow-auto rounded-md border border-slate-200 bg-white p-3 shadow-lg"
        >
          <button
            type="button"
            className="mb-2 text-xs underline disabled:cursor-default disabled:no-underline disabled:opacity-50"
            disabled={!aUneVueGardee}
            onClick={() => {
              effacerStockage(cleVue)
            }}
          >
            Vue par défaut
          </button>
          {colonnes.map((c) => (
            <label key={c.id} className="mb-2 block">
              <input
                type="checkbox"
                checked={visibles.includes(c.id)}
                onChange={(e) => {
                  garder(
                    e.target.checked ? [...visibles, c.id] : visibles.filter((x) => x !== c.id),
                    compact,
                  )
                }}
              />{' '}
              {c.titre}
              {visibles.includes(c.id) && (
                <span className="ml-2 inline-flex gap-2">
                  <button
                    type="button"
                    aria-label={`Déplacer ${c.titre} à gauche`}
                    disabled={visibles.indexOf(c.id) === 0}
                    onClick={() => {
                      deplacer(c.id, -1)
                    }}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label={`Déplacer ${c.titre} à droite`}
                    disabled={visibles.indexOf(c.id) === visibles.length - 1}
                    onClick={() => {
                      deplacer(c.id, 1)
                    }}
                  >
                    →
                  </button>
                </span>
              )}
            </label>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
  const boutonExport = (
    <button
      type="button"
      className={EXPORT}
      title="Exporter en Excel les lignes et colonnes affichées"
      onClick={() => {
        exporterExcel(
          nom,
          cols.map((c) => c.titre),
          rows.map((r) => cols.map((c) => c.valeur(r))),
        )
      }}
    >
      <Icone nom="file-spreadsheet" />
      Exporter en Excel
    </button>
  )
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Bande d'actions : fond gris très clair plutôt qu'un trait de séparation (demande du 23/11). */}
      {(outils || boutonsEnHaut) && (
        <div className="flex flex-wrap items-center gap-3 rounded-t-lg bg-slate-50 px-4 py-3 text-sm">
          {outils}
          {boutonsEnHaut && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {outilsDroite}
              {boutonExport}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 text-sm">
        {avecRecherche && (
          <input
            type="search"
            aria-label={`Rechercher dans ${nom}`}
            placeholder="Rechercher…"
            className="rounded border border-slate-300 px-3 py-2"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value)
            }}
          />
        )}
        {resume}
        {filtresPoses && (
          <button
            type="button"
            className="text-xs underline"
            onClick={() => {
              setFiltres({})
              setOperateurs({})
            }}
          >
            Effacer les filtres des colonnes
          </button>
        )}
        {/* Groupés à droite (DESIGN.md §4.3), même quand la ligne passe à la ligne. */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {boutonsEnHaut ? (
            <>
              {resumeDroite}
              {boutonColonnes}
            </>
          ) : (
            <>
              {compteur && <span className="text-xs text-slate-500">{rows.length} ligne(s)</span>}
              {boutonCompact}
              {boutonColonnes}
              {boutonExport}
            </>
          )}
        </div>
      </div>{' '}
      <div
        ref={defilement}
        className="overflow-auto"
        style={{ maxHeight: hauteur }}
        onScroll={mesurer}
      >
        <table
          {...tableProps}
          {...(selection ? glisse : {})}
          aria-label={nom}
          className={`w-full text-sm ${selection ? 'select-none' : ''}`}
        >
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {premiere && (
                <th className={`${colonnePremiere} bg-slate-50 text-left font-medium ${cellule}`}>
                  <span className="flex items-center gap-2">
                    {selection && (
                      <input
                        type="checkbox"
                        aria-label="Sélectionner toutes les lignes affichées"
                        title="Tout cocher / tout décocher (lignes affichées)"
                        disabled={selectionnables.length === 0}
                        checked={toutCoche}
                        ref={(el) => {
                          if (el) el.indeterminate = enPartie
                        }}
                        onChange={(e) => {
                          selection.onChange(
                            e.target.checked
                              ? [...new Set([...choisis, ...selectionnables])]
                              : choisis.filter((k) => !selectionnables.includes(k)),
                          )
                        }}
                      />
                    )}
                    {/* Pas de mention « Actions » dans la disposition « À traiter » (demande du 23/11). */}
                    {actions && !boutonsEnHaut && 'Actions'}
                  </span>
                </th>
              )}
              {cols.map((c) => (
                <th
                  key={c.id}
                  className={`min-w-28 text-left font-medium ${cellule} ${
                    colonneCible === c.id && colonneGlissee !== c.id
                      ? 'shadow-[inset_3px_0_0_#0284c7]'
                      : ''
                  }`}
                  onDragOver={(e) => {
                    if (!colonneGlissee) return
                    e.preventDefault()
                    if (colonneCible !== c.id) setColonneCible(c.id)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (colonneGlissee) deposer(colonneGlissee, c.id)
                    setColonneGlissee(null)
                    setColonneCible(null)
                  }}
                >
                  <FiltreColonne
                    titre={c.titre}
                    valeur={filtres[c.id] ?? ''}
                    operateur={operateurs[c.id] ?? 'contient'}
                    onChange={(v) => {
                      setFiltres((f) => ({ ...f, [c.id]: v }))
                    }}
                    onOperateur={(o) => {
                      setOperateurs((x) => ({ ...x, [c.id]: o }))
                    }}
                  >
                    <button
                      type="button"
                      draggable
                      title="Cliquer pour trier ; faire glisser pour déplacer la colonne"
                      className={`cursor-grab text-left active:cursor-grabbing ${colonneGlissee === c.id ? 'opacity-50' : ''}`}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', c.id)
                        setColonneGlissee(c.id)
                      }}
                      onDragEnd={() => {
                        setColonneGlissee(null)
                        setColonneCible(null)
                      }}
                      onClick={() => {
                        setTri((t) => ({ id: c.id, asc: t?.id === c.id ? !t.asc : true }))
                      }}
                    >
                      <span className={c.ajout ? 'font-bold text-red-700' : undefined}>
                        {c.titre}
                      </span>
                      {tri?.id === c.id ? (tri.asc ? ' ↑' : ' ↓') : ''}
                    </button>
                  </FiltreColonne>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                data-selection-id={selection ? selection.cle(r) : cle(r)}
                key={cle(r)}
                aria-selected={selection ? estCochee(r) : undefined}
                className={`group border-t border-slate-100 ${fondLigne(r)} ${onOuvrir ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                onClick={() => onOuvrir?.(r)}
              >
                {premiere && (
                  <td
                    className={`${colonnePremiere} ${bordure(r)} ${fondLigne(r)} ${onOuvrir ? 'group-hover:bg-slate-50' : ''} ${cellule}`}
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {selection && (selection.possible?.(r) ?? true) && (
                        <input
                          type="checkbox"
                          aria-label={selection.libelle?.(r) ?? 'Sélectionner la ligne'}
                          checked={estCochee(r)}
                          onChange={(e) => {
                            const k = selection.cle(r)
                            selection.onChange(
                              e.target.checked
                                ? [...new Set([...choisis, k])]
                                : choisis.filter((x) => x !== k),
                            )
                          }}
                        />
                      )}
                      {actions?.(r)}
                    </span>
                  </td>
                )}
                {cols.map((c, i) => (
                  <td
                    data-colonne={c.id}
                    key={c.id}
                    className={`max-w-md whitespace-pre-wrap ${!premiere && i === 0 ? bordure(r) : ''} ${cellule}`}
                  >
                    {c.rendu ? c.rendu(r) : String(c.valeur(r) ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {cols.some((c) => c.somme) && (
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
              <tr>
                {premiere && <td className={`${colonnePremiere} bg-slate-50 ${cellule}`} />}
                {cols.map((c, i) => (
                  <td data-colonne={c.id} key={c.id} className={cellule}>
                    {c.somme
                      ? rows.reduce((s, r) => s + Number(c.valeur(r) ?? 0), 0)
                      : i === 0
                        ? 'Total'
                        : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
        {!rows.length && <p className="p-6 text-slate-600">{vide}</p>}
      </div>
      <div
        role="separator"
        aria-label="Hauteur du tableau"
        aria-orientation="horizontal"
        aria-valuenow={hauteur}
        aria-valuemin={160}
        tabIndex={0}
        className="cursor-ns-resize bg-slate-100 p-1 text-center text-xs text-slate-600"
        style={{ touchAction: 'none' }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            setHauteur((v) => Math.max(160, v + (e.key === 'ArrowDown' ? 60 : -60)))
          }
        }}
        onDoubleClick={() => {
          setHauteur(600)
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          e.currentTarget.dataset.y = String(e.clientY)
          e.currentTarget.dataset.h = String(hauteur)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            setHauteur(
              Math.max(
                160,
                Number(e.currentTarget.dataset.h) + e.clientY - Number(e.currentTarget.dataset.y),
              ),
            )
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId)
        }}
      >
        ⇕ Glisser pour agrandir ou réduire le tableau
      </div>
    </div>
  )
}
