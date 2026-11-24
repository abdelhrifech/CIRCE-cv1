import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AteliersPerimetreSchema,
  ETAPES_RESERVATION,
  GRAINS_RESERVATIONS,
  LIBELLES_GRAINS,
  PHASES_RESERVATION,
  ReservationsSchema,
  type EtapeReservation,
  type LigneReservation,
} from '@circe/shared'
import { useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { exporterExcel } from '../../lib/excel.ts'
import {
  RESERVATION_COLUMNS,
  defaultReservationColumns,
  reservationValue,
  loadReservationExport,
  type ReservationColumn,
} from '../../lib/reservation-presentation.ts'
import { z } from 'zod'
import { ErrorMessage } from '../../components/error-message.tsx'
import { Pastille, type Ton } from '../../components/ui/pastille.tsx'
import { apiRequest, ApiError } from '../../lib/api-client.ts'
import { requirePermission } from '../../lib/session.ts'
import { useApi } from '../../lib/use-api.ts'

// ECR-PIL-03 — État des réservations vivant (RG-COO-107, 108, 101) : une base (lignes attendues de la semaine
// en cours et suivantes), des vues (« Afficher par »). Regroupements et totaux conservés côté serveur.
// TODO(question-ouverte): reservations.js:54–66, 190–202 prévoit grains destinataire/afficheur/unité/
// colis/départ et filtres reçue/repère/format/pôle/destinataire. Leur ajout exige de modifier le contrat
// et le service Coordination gelés ; aucun filtre sur une seule page ne doit simuler ces calculs.

const SearchSchema = z.object({
  par: z.enum(GRAINS_RESERVATIONS).optional(),
  dossier: z.coerce.number().int().optional(),
  depart: z
    .string()
    .regex(/^\d{4}-W\d{2}$/)
    .optional(),
  atelierId: z.coerce.number().int().optional(),
  /** Une ou plusieurs étapes séparées par des virgules (une tuile pose toutes les étapes de sa phase). */
  ou: z
    .string()
    .regex(new RegExp(`^(${ETAPES_RESERVATION.join('|')})(,(${ETAPES_RESERVATION.join('|')}))*$`))
    .optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
})
type Search = z.infer<typeof SearchSchema>

export const Route = createFileRoute('/pilotage/reservations')({
  validateSearch: SearchSchema,
  beforeLoad: requirePermission('reservations.consulter'),
  component: EtatDesReservations,
})

/** Liseré gauche de la ligne (maquette `tone`). */
const LISERE: Record<string, string> = {
  critique: 'border-l-4 border-l-red-500',
  surveiller: 'border-l-4 border-l-amber-400',
  info: 'border-l-4 border-l-sky-400',
  ok: 'border-l-4 border-l-emerald-500',
}

/** Libellés et tons de la maquette (« Où en est-il »). */
export const OU: Record<EtapeReservation, { libelle: string; ton: Ton }> = {
  DA_ACTIVEE: { libelle: 'DA activée, IP à saisir', ton: 'surveiller' },
  IP_SAISIES: { libelle: 'IP saisies, prépa attendue', ton: 'info' },
  PREPA_RECUE: { libelle: 'Prépa reçue, affiches attendues', ton: 'critique' },
  RECUES_EN_PARTIE: { libelle: 'Affiches reçues en partie', ton: 'important' },
  VALIDATION_A_CONFIRMER: {
    libelle: 'Affiches reçues, validation admin à confirmer',
    ton: 'important',
  },
  EN_PRODUCTION: { libelle: 'Prêt ou en production', ton: 'info' },
  PRODUIT: { libelle: 'Produit, à expédier', ton: 'ok' },
  EXPEDIE: { libelle: 'Expédié', ton: 'ok' },
  LIVRE: { libelle: 'Livré (preuve reçue)', ton: 'ok' },
  ANNULE: { libelle: 'Annulé', ton: 'info' },
}

const RECUE: Record<string, { libelle: string; ton: Ton }> = {
  OUI: { libelle: 'Oui', ton: 'ok' },
  OUI_SURPLUS: { libelle: 'Oui, surplus', ton: 'surveiller' },
  PARTIELLE: { libelle: 'Partielle', ton: 'important' },
  NON: { libelle: 'Non', ton: 'critique' },
  SANS_ATTENDU: { libelle: 'Sans attendu', ton: 'surveiller' },
}

function query(s: Search) {
  const p = new URLSearchParams()
  p.set('grain', s.par ?? 'THEME')
  for (const k of ['dossier', 'depart', 'atelierId', 'ou', 'page'] as const) {
    if (s[k] !== undefined) p.set(k, String(s[k]))
  }
  if (s.q) p.set('annonceur', s.q)
  return p.toString()
}

function EtatDesReservations() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const q = query(search)
  const { etat, recharger } = useApi(`reservations?${q}`, (signal) =>
    apiRequest('GET', `/api/coordination/reservations?${q}`, {
      schema: ReservationsSchema,
      signal,
    }),
  )
  const { etat: refAteliers } = useApi('coo-ateliers', (signal) =>
    apiRequest('GET', '/api/coordination/ateliers', { schema: AteliersPerimetreSchema, signal }),
  )
  const ateliers = refAteliers.kind === 'ready' ? refAteliers.data.ateliers : []
  const [saisieInvalide, setSaisieInvalide] = useState(false)
  const [departInvalide, setDepartInvalide] = useState(false)
  const [visibleByGrain, setVisibleByGrain] = useState<Record<string, ReservationColumn[]>>({})
  const [showColumns, setShowColumns] = useState(false)
  const [selection, setSelection] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<unknown>(null)
  const changer = (p: Partial<Search>) => {
    setSelection([])
    void navigate({
      search: (prev) => ({ ...prev, ...p, page: p.page ?? undefined }),
      replace: true,
    })
  }
  const grain = search.par ?? 'THEME'
  const columns = visibleByGrain[grain] ?? defaultReservationColumns(grain)
  const chosenStages = (search.ou?.split(',') ?? []) as EtapeReservation[]
  const champ = 'ml-1 rounded-md border border-slate-300 px-2 py-1 text-sm'
  // Un clic sur une tuile filtre TOUTES les étapes de sa phase (maquette `voir(PHASES.x)`).
  const tuile = (
    libelle: string,
    valeur: number | undefined,
    etapes?: readonly EtapeReservation[],
  ) => (
    <button
      type="button"
      className="rounded-lg border border-slate-200 bg-white p-3 text-left"
      aria-pressed={etapes ? etapes.join(',') === search.ou : !search.ou}
      onClick={() => {
        changer({ ou: etapes?.join(',') })
      }}
    >
      <span className="block text-xs text-slate-500">{libelle}</span>
      <span className="text-xl font-semibold">{valeur ?? '…'}</span>
    </button>
  )
  const ind = etat.kind === 'ready' ? etat.data.indicateurs : undefined
  return (
    <main className="mx-auto max-w-7xl p-6">
      <p className="text-sm text-slate-500">Pilotage</p>
      <h1 className="text-2xl font-semibold">État des réservations vivant</h1>
      <p className="mt-1 text-sm text-slate-600">
        Tous les dossiers dont la DA est activée, pour les départs de la semaine en cours et des
        suivantes.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Indicateurs">
        {tuile('Dossiers', ind?.dossiers)}
        {tuile('En pré-production', ind?.enPreProduction, PHASES_RESERVATION.enPreProduction)}
        {tuile('Affiches attendues', ind?.affichesAttendues, PHASES_RESERVATION.affichesAttendues)}
        {tuile('En production', ind?.enProduction, PHASES_RESERVATION.enProduction)}
        {tuile(
          'Produits ou expédiés',
          ind?.produitsOuExpedies,
          PHASES_RESERVATION.produitsOuExpedies,
        )}
      </div>
      <p className="mt-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm" role="note">
        Une base, des vues : chaque ligne vient des lignes attendues ; « Afficher par » regroupe. Le
        reçu et le reste sont comptés une fois par thème (un dossier sur deux semaines n’est pas
        compté deux fois).
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
        <label>
          Afficher par
          <select
            className={champ}
            value={grain}
            onChange={(e) => {
              changer({ par: e.target.value as Search['par'] })
            }}
          >
            {GRAINS_RESERVATIONS.map((g) => (
              <option key={g} value={g}>
                {LIBELLES_GRAINS[g]}
              </option>
            ))}
          </select>
        </label>
        <label>
          N° de dossier
          <input
            className={`${champ} w-28`}
            key={`dossier-${search.dossier ?? ''}`}
            defaultValue={search.dossier ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = e.currentTarget.value.trim()
                const invalide = v !== '' && !/^\d+$/.test(v)
                setSaisieInvalide(invalide)
                if (!invalide) changer({ dossier: v ? Number(v) : undefined })
              }
            }}
          />
          {saisieInvalide && (
            <span role="alert" className="ml-2 text-xs text-red-700">
              Un n° de dossier ne contient que des chiffres.
            </span>
          )}
        </label>
        <label>
          Départ
          <input
            className={`${champ} w-28`}
            placeholder="2026-W43"
            key={`depart-${search.depart ?? ''}`}
            defaultValue={search.depart ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = e.currentTarget.value.trim()
                const invalid = v !== '' && !/^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/.test(v)
                setDepartInvalide(invalid)
                if (!invalid) changer({ depart: v || undefined })
              }
            }}
          />
          {departInvalide && (
            <span role="alert" className="ml-2 text-xs text-red-700">
              Saisir une semaine au format AAAA-W01 à AAAA-W53.
            </span>
          )}
        </label>
        <label>
          Atelier
          <select
            className={champ}
            value={search.atelierId ?? ''}
            onChange={(e) => {
              changer({ atelierId: e.target.value ? Number(e.target.value) : undefined })
            }}
          >
            <option value="">Tous</option>
            {ateliers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle} · {a.plateforme}
              </option>
            ))}
          </select>
        </label>
        <label>
          Où en est-il
          <select
            className={champ}
            value={chosenStages.length === 1 ? chosenStages[0] : ''}
            onChange={(event) => {
              changer({ ou: event.target.value || undefined })
            }}
          >
            <option value="">
              {chosenStages.length > 1 ? 'Plusieurs étapes sélectionnées' : 'Toutes les étapes'}
            </option>
            {ETAPES_RESERVATION.map((stage) => (
              <option key={stage} value={stage}>
                {OU[stage].libelle}
              </option>
            ))}
          </select>
        </label>
        <Popover.Root>
          <Popover.Trigger
            className="rounded-full border border-slate-300 px-3 py-2"
            aria-label="Filtrer Avancement (plusieurs)"
          >
            Avancement (plusieurs){chosenStages.length ? ` · ${chosenStages.length}` : ''}{' '}
            <span aria-hidden>⌄</span>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              sideOffset={6}
              className="z-50 max-h-96 w-96 overflow-auto rounded border bg-white p-4 shadow-lg"
            >
              <fieldset>
                <legend className="mb-2 font-semibold">Où en est-il</legend>
                {ETAPES_RESERVATION.map((stage) => (
                  <label key={stage} className="mb-2 block text-sm">
                    <input
                      type="checkbox"
                      checked={chosenStages.includes(stage)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...chosenStages, stage]
                          : chosenStages.filter((value) => value !== stage)
                        changer({ ou: next.join(',') || undefined })
                      }}
                    />{' '}
                    {OU[stage].libelle}
                  </label>
                ))}
              </fieldset>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => {
                  changer({ ou: undefined })
                }}
              >
                Toutes les étapes
              </button>
              <Popover.Close className="float-right text-sm underline">Fermer</Popover.Close>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <label>
          Annonceur
          <input
            className={champ}
            key={`annonceur-${search.q ?? ''}`}
            defaultValue={search.q ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') changer({ q: e.currentTarget.value.trim() || undefined })
            }}
          />
        </label>
        <button
          type="button"
          className="underline"
          onClick={() => {
            setSelection([])
            setSaisieInvalide(false)
            setDepartInvalide(false)
            void navigate({ search: {}, replace: true })
          }}
        >
          Effacer les filtres
        </button>
      </div>
      {exportError !== null && <ErrorMessage error={exportError} />}
      <p className="mt-3 text-xs text-slate-500">
        N° d’affiche : ✓ validation admin confirmée par la Coordination ; • rattachement proposé à
        confirmer. Les totaux portent sur toutes les lignes filtrées ; l’export de la page reprend
        les lignes affichées.
      </p>
      <section className="mt-4 rounded-lg border border-slate-200 bg-white">
        {etat.kind === 'loading' && <p className="p-3 text-sm text-slate-500">Chargement…</p>}
        {etat.kind === 'error' && (
          <div className="p-3">
            <ErrorMessage error={etat.error} onRetry={recharger} />
          </div>
        )}
        {etat.kind === 'ready' && etat.data.items.length === 0 && (
          <p className="p-3 text-sm text-slate-500">Aucune ligne avec ces filtres à ce grain.</p>
        )}
        {etat.kind === 'ready' && (
          <div className="flex flex-wrap items-center gap-4 border-b p-3 text-sm">
            <details
              className="relative"
              onToggle={(event) => {
                setShowColumns(event.currentTarget.open)
              }}
            >
              <summary className="cursor-pointer">Colonnes</summary>
              {showColumns && (
                <fieldset className="absolute z-10 max-h-80 w-72 overflow-auto rounded border bg-white p-3 shadow">
                  <legend className="sr-only">Colonnes visibles</legend>
                  {(Object.keys(RESERVATION_COLUMNS) as ReservationColumn[]).map((column) => (
                    <label key={column} className="mb-2 block">
                      <input
                        type="checkbox"
                        checked={columns.includes(column)}
                        disabled={columns.length === 1 && columns.includes(column)}
                        onChange={(event) => {
                          setVisibleByGrain({
                            ...visibleByGrain,
                            [grain]: event.target.checked
                              ? [...columns, column]
                              : columns.filter((value) => value !== column),
                          })
                        }}
                      />{' '}
                      {RESERVATION_COLUMNS[column]}
                    </label>
                  ))}
                </fieldset>
              )}
            </details>
            <button
              type="button"
              className="underline"
              disabled={exporting || !etat.data.total}
              onClick={() => {
                setExporting(true)
                setExportError(null)
                const parameters = new URLSearchParams(q)
                parameters.set('pageSize', '100')
                void loadReservationExport(async (page) => {
                  parameters.set('page', String(page))
                  return apiRequest('GET', `/api/coordination/reservations?${parameters}`, {
                    schema: ReservationsSchema,
                  })
                })
                  .then((rows) => {
                    exporterExcel(
                      `etat-des-reservations-${grain.toLocaleLowerCase('fr')}`,
                      columns.map((column) => RESERVATION_COLUMNS[column]),
                      rows.map((row) => columns.map((column) => exportValue(row, column))),
                    )
                  })
                  .catch((error: unknown) => {
                    setExportError(
                      error instanceof Error
                        ? new ApiError(409, { code: 'EXPORT_INTERROMPU', message: error.message })
                        : error,
                    )
                  })
                  .finally(() => {
                    setExporting(false)
                  })
              }}
            >
              {exporting ? 'Export en cours…' : 'Exporter toutes les lignes filtrées'}
            </button>
            <button
              type="button"
              className="underline"
              disabled={!etat.data.items.length}
              onClick={() => {
                exporterExcel(
                  `etat-des-reservations-${grain.toLocaleLowerCase('fr')}-page-${etat.data.page}`,
                  columns.map((column) => RESERVATION_COLUMNS[column]),
                  etat.data.items.map((row) => columns.map((column) => exportValue(row, column))),
                )
              }}
            >
              Exporter la page
            </button>
            {selection.length > 0 && (
              <button
                type="button"
                className="underline"
                onClick={() => {
                  exporterExcel(
                    'selection-etat-des-reservations',
                    columns.map((column) => RESERVATION_COLUMNS[column]),
                    etat.data.items
                      .filter((row) => selection.includes(row.cle))
                      .map((row) => columns.map((column) => exportValue(row, column))),
                  )
                }}
              >
                Exporter la sélection ({selection.length})
              </button>
            )}
            <span className="ml-auto text-slate-500">
              {etat.data.items.length} ligne(s) sur {etat.data.total}
            </span>
          </div>
        )}
        {etat.kind === 'ready' && etat.data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="État des réservations">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  {columns.map((column, index) => (
                    <th className="p-2" key={column}>
                      {index === 0 && (
                        <input
                          type="checkbox"
                          className="mr-2"
                          aria-label="Sélectionner toutes les lignes de la page"
                          checked={etat.data.items.every((row) => selection.includes(row.cle))}
                          onChange={(event) => {
                            setSelection(
                              event.target.checked ? etat.data.items.map((row) => row.cle) : [],
                            )
                          }}
                        />
                      )}
                      {RESERVATION_COLUMNS[column]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {etat.data.items.map((row) => (
                  <tr
                    key={row.cle}
                    className={`border-t border-slate-100 ${row.lisere ? (LISERE[row.lisere] ?? '') : ''}`}
                  >
                    {columns.map((column, index) => (
                      <td
                        key={column}
                        className={`p-2 ${['attendu', 'recu', 'reste', 'themes', 'dossiers'].includes(column) ? 'text-right' : ''}`}
                      >
                        {index === 0 && (
                          <input
                            type="checkbox"
                            className="mr-2"
                            aria-label={`Sélectionner ${row.dossier ?? row.format ?? row.cle}`}
                            checked={selection.includes(row.cle)}
                            onChange={(event) => {
                              setSelection(
                                event.target.checked
                                  ? [...selection, row.cle]
                                  : selection.filter((key) => key !== row.cle),
                              )
                            }}
                          />
                        )}
                        {cell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 font-medium">
                <tr>
                  {columns.map((column, index) => (
                    <td key={column} className="p-2 text-right">
                      {column === 'attendu'
                        ? etat.data.totaux.attendu
                        : column === 'recu'
                          ? etat.data.totaux.recu
                          : column === 'reste'
                            ? etat.data.totaux.resteARecevoir
                            : index === 0
                              ? `Total (${etat.data.total} ligne(s))`
                              : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {etat.kind === 'ready' && etat.data.total > etat.data.pageSize && (
          <nav className="flex gap-2 p-2 text-sm" aria-label="Pagination">
            <button
              type="button"
              disabled={etat.data.page <= 1}
              onClick={() => {
                changer({ page: etat.data.page - 1 })
              }}
            >
              Précédent
            </button>
            <span>Page {etat.data.page}</span>
            <button
              type="button"
              disabled={etat.data.page * etat.data.pageSize >= etat.data.total}
              onClick={() => {
                changer({ page: etat.data.page + 1 })
              }}
            >
              Suivant
            </button>
          </nav>
        )}
      </section>
    </main>
  )
}

function exportValue(row: LigneReservation, column: ReservationColumn) {
  if (column === 'ou') return OU[row.ou].libelle
  if (column === 'reception')
    return row.afficheRecue ? (RECUE[row.afficheRecue]?.libelle ?? '—') : '—'
  return reservationValue(row, column)
}
function cell(row: LigneReservation, column: ReservationColumn): ReactNode {
  if (column === 'ou') return <Pastille ton={OU[row.ou].ton}>{OU[row.ou].libelle}</Pastille>
  if (column === 'reception') {
    const received = row.afficheRecue ? RECUE[row.afficheRecue] : null
    return received ? <Pastille ton={received.ton}>{received.libelle}</Pastille> : '—'
  }
  if (column === 'numeros')
    return row.numerosAffiche.length
      ? row.numerosAffiche.map((number) => (
          <span
            key={number.id}
            className="mr-2 whitespace-nowrap"
            title={
              number.marque === '✓'
                ? 'Validation admin confirmée par la Coordination'
                : 'Rattachement proposé, à confirmer par la Coordination'
            }
          >
            {number.id} {number.marque}
          </span>
        ))
      : '—'
  if (column === 'reperes')
    return row.reperes.length
      ? row.reperes.map((marker) => (
          <Pastille key={marker} ton="surveiller">
            {marker === 'MULTI_SEMAINES' ? 'Multi-semaines' : 'IP à saisir'}
          </Pastille>
        ))
      : '—'
  if (column === 'visuel')
    return (
      <>
        {row.annonceur ? `${row.annonceur} · ` : ''}
        {reservationValue(row, column)}
        {row.reperes.includes('MULTI_SEMAINES') && (
          <span className="ml-1">
            <Pastille ton="surveiller">Multi-semaines</Pastille>
          </span>
        )}
      </>
    )
  const value = reservationValue(row, column)
  return value === '' ? '—' : value
}
