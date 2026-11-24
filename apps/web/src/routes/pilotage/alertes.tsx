import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import {
  AcquitterAlertesResultatSchema,
  ListeAlertesSchema,
  formatSemaineIso,
  lundiSemaineIso,
  semaineIsoDe,
  type AlertePilotage,
} from '@circe/shared'
import { useState } from 'react'
import { FacetFilters } from '../../components/filters/facet-filters.tsx'
import { alertFacets, filteredAlerts } from '../../lib/pilotage-alert-filters.ts'
import type { FacetSelection } from '../../lib/faceted-filters.ts'
import { z } from 'zod'
import { ErrorMessage } from '../../components/error-message.tsx'
import { Pastille } from '../../components/ui/pastille.tsx'
import { exporterExcel } from '../../lib/excel.ts'
import { apiRequest } from '../../lib/api-client.ts'
import { requirePermission } from '../../lib/session.ts'
import { useApi } from '../../lib/use-api.ts'

// ECR-TRA-01 — Pilotage › Alertes (RG-COO-075) : toutes les exceptions au même endroit, Réception (RG-REC-182 à
// 189) et Coordination / Pré-Prod (RG-COO-030 à 033, 053, 066 à 074, 086, 103, 116, 122). Alertes calculées
// par l'API ; chaque alerte ouvre l'écran où agir. Acquittement : droit non ouvert tant que Q-220 n'a pas
// désigné qui acquitte.

const SearchSchema = z.object({
  dossier: z.coerce.number().int().optional(),
  dossiers: z
    .string()
    .regex(/^\d+(,\d+)*$/)
    .optional(),
  /** Semaines de départ séparées par des virgules ; « TOUTES » = sans filtre ; absent = S et S+1. */
  depart: z.string().optional(),
  type: z.string().optional(),
  etat: z.enum(['OUVERTES', 'ACQUITTEES']).optional(),
  vue: z.enum(['ouvertes', 'archivees']).optional(),
  site: z.coerce.number().int().optional(),
  sites: z
    .string()
    .regex(/^\d+(,\d+)*$/)
    .optional(),
})
type Search = z.infer<typeof SearchSchema>

export const Route = createFileRoute('/pilotage/alertes')({
  validateSearch: SearchSchema,
  beforeLoad: requirePermission('alerte.consulter'),
  component: Alertes,
})

/** S et S+1 (maquette : filtre Départ par défaut). */
function departsParDefaut(maintenant = new Date()) {
  const s = semaineIsoDe(maintenant)
  const s1 = semaineIsoDe(new Date(lundiSemaineIso(s).getTime() + 7 * 86_400_000))
  return [formatSemaineIso(s), formatSemaineIso(s1)]
}

const liste = (v: string | undefined) => (v ? v.split(',').filter(Boolean) : [])
const semaine = (s: string) => `S${s.slice(6)}`
const dateCourte = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })

function Alertes() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const archived =
    search.etat === 'ACQUITTEES' || (search.etat === undefined && search.vue === 'archivees')
  const { etat, recharger } = useApi('pilotage-alertes-completes', async (signal) => {
    // L’API renvoie des listes complètes, déjà contrôlées par les permissions et le périmètre.
    // Les facettes portent sur toute la liste de l’onglet, jamais sur une page partielle.
    const [open, archived] = await Promise.all([
      apiRequest('GET', '/api/alertes?etat=OUVERTES', { schema: ListeAlertesSchema, signal }),
      apiRequest('GET', '/api/alertes?etat=ACQUITTEES', { schema: ListeAlertesSchema, signal }),
    ])
    return { open, archived }
  })
  const [selection, setSelection] = useState<string[]>([])
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<unknown>(null)
  const [message, setMessage] = useState<string | null>(null)
  const changer = (p: Partial<Search>) => {
    setSelection([])
    void navigate({ search: (prev) => ({ ...prev, ...p }), replace: true })
  }
  const acquitter = async (cles: string[]) => {
    setEnvoi(true)
    setErreur(null)
    setMessage(null)
    try {
      const r = await apiRequest(
        'POST',
        archived ? '/api/alertes/restaurations' : '/api/alertes/acquittements',
        {
          schema: AcquitterAlertesResultatSchema,
          body: { cles },
          idempotencyKey: true,
        },
      )
      setMessage(r.message)
      setSelection([])
      recharger()
    } catch (e) {
      setErreur(e)
    } finally {
      setEnvoi(false)
    }
  }
  const all = etat.kind === 'ready' ? etat.data : null
  const data = all ? (archived ? all.archived : all.open) : null
  const selected: FacetSelection = {
    dossier: liste(
      search.dossiers ?? (search.dossier === undefined ? undefined : String(search.dossier)),
    ),
    depart:
      search.depart === 'TOUTES'
        ? []
        : search.depart
          ? liste(search.depart)
          : (data?.departsParDefaut ?? departsParDefaut()),
    type: liste(search.type),
    site: liste(search.sites ?? (search.site === undefined ? undefined : String(search.site))),
  }
  const alerts = data?.alertes ?? []
  const rows = filteredAlerts(alerts, selected, archived)
  const facets = alertFacets(alerts, selected.depart).map((facet) =>
    facet.id === 'type' ? { ...facet, label: `Type (${selected.type?.length || 'tous'})` } : facet,
  )
  const changeFacets = (next: FacetSelection) => {
    changer({
      dossiers: next.dossier?.join(',') || undefined,
      dossier: undefined,
      depart: next.depart?.join(',') || 'TOUTES',
      type: next.type?.join(',') || undefined,
      sites: next.site?.join(',') || undefined,
      site: undefined,
    })
  }
  const exportAlerts = (items: AlertePilotage[]) => {
    exporterExcel(
      archived ? 'alertes-archivees' : 'alertes',
      [
        'Alerte',
        'Message',
        'Site',
        'Départ',
        'Échéance / date',
        ...(archived ? ['Archivée le', 'Archivée par'] : []),
        'Règle',
      ],
      items.map((alert) => [
        alert.titre,
        alert.message,
        alert.site ?? '',
        alert.depart ?? '',
        alert.date ?? '',
        ...(archived ? [alert.acquittee?.le ?? '', alert.acquittee?.par ?? ''] : []),
        alert.regle,
      ]),
    )
  }
  const peutAcquitter = data?.peutAcquitter ?? false
  const motifAcquittement = peutAcquitter
    ? undefined
    : 'Acquittement non ouvert : qui acquitte une alerte reste à décider (Q-220).'
  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Pilotage</p>
          <h1 className="text-2xl font-semibold">Alertes</h1>
        </div>
        <Link
          to="/admin/alertes"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          Règles et destinataires
        </Link>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Les exceptions remplacent les mails et les pointages Excel. Chaque alerte permet d’ouvrir
        l’écran concerné.
      </p>
      <div
        role="tablist"
        aria-label="Alertes ouvertes ou archivées"
        className="mt-4 flex flex-wrap items-center gap-3"
      >
        {(['OUVERTES', 'ACQUITTEES'] as const).map((value) => {
          const active = archived === (value === 'ACQUITTEES')
          return (
            <button
              type="button"
              key={value}
              role="tab"
              aria-selected={active}
              className="min-w-44 rounded border px-4 py-2 font-semibold aria-selected:bg-slate-800 aria-selected:text-white"
              onClick={() => {
                changer({ etat: value, vue: undefined })
              }}
            >
              {active ? '✓ ' : ''}
              {value === 'OUVERTES' ? 'Ouvertes' : 'Archivées'} (
              {all
                ? value === 'OUVERTES'
                  ? all.open.alertes.length
                  : all.archived.alertes.length
                : '…'}
              )
            </button>
          )
        })}
        <p className="text-sm text-slate-600">
          {archived
            ? 'Une alerte archivée par erreur : « Restaurer » la remet dans les ouvertes.'
            : '« Archiver » range l’alerte dans l’onglet Archivées, d’où on peut la restaurer.'}
        </p>
      </div>
      {data && (
        <FacetFilters rows={alerts} facets={facets} selected={selected} onChange={changeFacets} />
      )}
      <p className="text-xs text-slate-500">
        Les alertes sans semaine de départ ou sans site restent affichées. Plusieurs valeurs d’un
        même filtre se cumulent.
      </p>

      {message && (
        <p
          role="status"
          className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm"
        >
          {message}
        </p>
      )}
      {erreur !== null && (
        <div className="mt-3">
          <ErrorMessage error={erreur} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          className="underline"
          disabled={!rows.length}
          onClick={() => {
            exportAlerts(rows)
          }}
        >
          Exporter
        </button>
        {selection.length > 0 && (
          <button
            type="button"
            className="underline"
            onClick={() => {
              exportAlerts(rows.filter((alert) => selection.includes(alert.cle)))
            }}
          >
            Exporter la sélection ({selection.length})
          </button>
        )}
        <span className="text-slate-500">{rows.length} alerte(s)</span>
        <button
          type="button"
          disabled={!peutAcquitter || selection.length === 0 || envoi}
          title={motifAcquittement}
          className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          onClick={() => void acquitter(selection)}
        >
          {archived ? 'Restaurer' : 'Archiver'}
          {selection.length ? ` (${String(selection.length)})` : ''}
        </button>
      </div>

      <section className="mt-2 rounded-lg border border-slate-200 bg-white">
        {etat.kind === 'loading' && <p className="p-3 text-sm text-slate-500">Chargement…</p>}
        {etat.kind === 'error' && (
          <div className="p-3">
            <ErrorMessage error={etat.error} onRetry={recharger} />
          </div>
        )}
        {data && rows.length === 0 && (
          <p className="p-3 text-sm text-slate-600">
            {archived
              ? 'Aucune alerte archivée avec ces filtres.'
              : 'Aucune alerte ouverte avec ces filtres.'}
          </p>
        )}
        {data && rows.length > 0 && (
          <table className="w-full text-sm" aria-label="Alertes">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2">
                  <input
                    type="checkbox"
                    disabled={envoi}
                    aria-label="Sélectionner toutes les alertes affichées"
                    checked={rows.every((alert) => selection.includes(alert.cle))}
                    onChange={(event) => {
                      setSelection(event.target.checked ? rows.map((alert) => alert.cle) : [])
                    }}
                  />
                </th>
                {[
                  'Alerte',
                  'Site',
                  'Départ',
                  'Échéance / date',
                  ...(archived ? ['Archivée le'] : []),
                  'Règle',
                  '',
                ].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <LigneAlerte
                  key={a.cle}
                  a={a}
                  archived={archived}
                  selectionnee={selection.includes(a.cle)}
                  onSelection={(oui) => {
                    setSelection((s) => (oui ? [...s, a.cle] : s.filter((c) => c !== a.cle)))
                  }}
                  peutAcquitter={peutAcquitter}
                  motif={motifAcquittement}
                  envoi={envoi}
                  onAcquitter={() => void acquitter([a.cle])}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

function LigneAlerte({
  a,
  archived,
  selectionnee,
  onSelection,
  peutAcquitter,
  motif,
  envoi,
  onAcquitter,
}: {
  a: AlertePilotage
  archived: boolean
  selectionnee: boolean
  onSelection: (oui: boolean) => void
  peutAcquitter: boolean
  motif: string | undefined
  envoi: boolean
  onAcquitter: () => void
}) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2">
        {
          <input
            type="checkbox"
            disabled={envoi}
            aria-label={`Sélectionner l’alerte ${a.titre}`}
            checked={selectionnee}
            onChange={(e) => {
              onSelection(e.target.checked)
            }}
          />
        }
      </td>
      <td className="max-w-xl px-3 py-2">
        <strong>{a.titre}</strong>
        <div className="text-xs text-slate-600">{a.message}</div>
        <div className="text-xs text-slate-500">Pour : {a.destinataires.join(', ')}</div>
      </td>
      <td className="px-3 py-2">{a.site ?? '—'}</td>
      <td className="px-3 py-2">{a.depart ? semaine(a.depart) : '—'}</td>
      <td className="px-3 py-2">{a.date ? dateCourte(a.date) : '—'}</td>
      {archived && (
        <td className="px-3 py-2">
          {a.acquittee
            ? `${dateCourte(a.acquittee.le)}${a.acquittee.par ? ` · ${a.acquittee.par}` : ''}`
            : '—'}
        </td>
      )}
      <td className="px-3 py-2">
        <Pastille ton="neutre">{a.regle}</Pastille>
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <a className="inline-block rounded bg-slate-800 px-3 py-1 text-white" href={a.lien}>
          Ouvrir
        </a>
        <button
          type="button"
          className="rounded border px-3 py-1"
          disabled={!peutAcquitter || envoi}
          title={motif}
          onClick={onAcquitter}
        >
          {a.acquittee ? 'Restaurer' : 'Archiver'}
        </button>
      </td>
    </tr>
  )
}
