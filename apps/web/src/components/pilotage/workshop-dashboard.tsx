import { useState } from 'react'
import {
  DashboardSchema,
  SuiviAtelierSchema,
  type Dashboard,
  type DashboardVisual,
} from '@circe/shared'
import { useApi } from '../../lib/use-api.ts'
import { apiRequest } from '../../lib/api-client.ts'
import { ErrorMessage } from '../error-message.tsx'
import { TableMetier } from '../ui/table-metier.tsx'
import { SidePanel } from '../overlays/side-panel.tsx'
import { BarreFiltres, enOptionsFiltre } from '../ui/barre-filtres.tsx'
import { DeliveryForecastEditor } from './delivery-forecast.tsx'

const receiptLabels = {
  MISSING: 'Non reçu',
  PARTIAL: 'Partiel',
  COMPLETE: 'Reçu',
  SURPLUS: 'Surplus',
  UNKNOWN: 'Attendu non déterminé',
}
const progressLabels: Record<string, string> = {
  attente: 'En attente d’affiches',
  cours: 'Prêt ou en production',
  termine: 'Terminé',
  sans: 'Pas encore d’unité',
}
function progressOf(visual: DashboardVisual) {
  return !visual.units.total
    ? 'sans'
    : visual.units.waiting > 0
      ? 'attente'
      : visual.units.completed < visual.units.total
        ? 'cours'
        : 'termine'
}
function Metrics({ data }: { data: Dashboard }) {
  return (
    <div className="my-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Unités à produire (A)', data.kpis.total],
        ['OK pour production (B)', data.kpis.ready],
        ['En attente d’affiches (A − B)', data.kpis.waiting],
        ['Faits (C)', data.kpis.completed],
      ].map(([title, value]) => (
        <section key={title} className="rounded-lg border bg-white p-4">
          <h2 className="text-sm text-slate-600">{title}</h2>
          <strong className="mt-2 block text-3xl text-violet-950">
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
          </strong>
        </section>
      ))}
    </div>
  )
}
function SelectedMetrics({ params }: { params: URLSearchParams }) {
  const { etat, recharger } = useApi(`workshop-selection-${params.toString()}`, (signal) =>
    apiRequest('GET', `/api/pilotage/dashboard?${params.toString()}`, {
      schema: DashboardSchema,
      signal,
    }),
  )
  return etat.kind === 'ready' ? (
    <Metrics data={etat.data} />
  ) : etat.kind === 'error' ? (
    <ErrorMessage error={etat.error} onRetry={recharger} />
  ) : (
    <p role="status">Calcul des unités de la sélection…</p>
  )
}
export function WorkshopDashboard({
  pour,
  dossier,
  depart,
}: {
  pour: 'fixe' | 'pliage' | 'deroulant'
  dossier?: number
  depart?: string
}) {
  const [filters, setFilters] = useState({
    dossier: dossier ? String(dossier) : '',
    depart: depart ?? '',
    atelier: '',
    format: '',
    annonceur: '',
    destination: '',
  })
  const [progress, setProgress] = useState<string[]>([])
  const [opened, setOpened] = useState<DashboardVisual | null>(null)
  const [editing, setEditing] = useState<DashboardVisual | null>(null)
  const params = new URLSearchParams({ pour })
  const validDossier = !filters.dossier || /^\d+(?:[,;\s]+\d+)*$/.test(filters.dossier)
  for (const [key, value] of Object.entries(filters))
    if (value && (key !== 'dossier' || validDossier)) params.set(key, value)
  const { etat, recharger } = useApi(`workshop-dashboard-${params.toString()}`, (signal) =>
    apiRequest('GET', `/api/pilotage/dashboard?${params.toString()}`, {
      schema: DashboardSchema,
      signal,
    }),
  )
  const legacyParams = new URLSearchParams({ pour })
  if (/^\d+$/.test(filters.dossier)) legacyParams.set('dossier', filters.dossier)
  const { etat: legacy, recharger: reloadLegacy } = useApi(
    `workshop-steps-${legacyParams.toString()}`,
    (signal) =>
      apiRequest('GET', `/api/pilotage/suivi?${legacyParams.toString()}`, {
        schema: SuiviAtelierSchema,
        signal,
      }),
  )
  const data = etat.kind === 'ready' ? etat.data : null
  const steps = new Map(
    legacy.kind === 'ready' ? legacy.data.items.map((row) => [String(row.id), row]) : [],
  )
  const rows =
    data?.visuals.filter((visual) => !progress.length || progress.includes(progressOf(visual))) ??
    []
  const selectedParams = new URLSearchParams(params)
  selectedParams.set('visualIds', rows.map((row) => row.id).join(','))
  const title =
    pour === 'deroulant' ? 'Suivi déroulant' : pour === 'fixe' ? 'Suivi 2 m² fixe' : 'Suivi pliage'
  const link = (row: DashboardVisual, path: string, label: string) =>
    row.dossier ? (
      <a
        className="block rounded border border-slate-200 p-2 underline"
        href={`${path}${path.includes('?') ? '&' : '?'}dossier=${row.dossier}`}
      >
        {label}
      </a>
    ) : (
      label
    )
  return (
    <main className="mx-auto max-w-[1700px] p-6">
      <p className="text-sm text-slate-500">Pilotage</p>
      <h1 className="mb-3 text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-slate-600">
        Une ligne par visuel ; les unités physiques sont dédupliquées dans les indicateurs. Chaque
        étape ouvre sa page de travail sur le dossier.
      </p>
      <div className="my-5">
        <BarreFiltres
          libelle="Filtres du suivi"
          dossier={{
            valeur: filters.dossier,
            onChange: (v) => {
              setFilters({ ...filters, dossier: v })
            },
          }}
          filtres={[
            ...(
              [
                ['depart', 'Départ', ',', true],
                ['atelier', 'Atelier', ',', false],
                ['format', 'Format', '|', false],
                ['annonceur', 'Annonceur', '|', false],
              ] as const
            ).map(([key, libelle, separateur, toutesValeurs]) => ({
              id: key,
              libelle,
              options: enOptionsFiltre(data?.options[key] ?? []),
              selection: filters[key].split(separateur).filter(Boolean),
              onChange: (values: string[]) => {
                setFilters({ ...filters, [key]: values.join(separateur) })
              },
              toutesValeurs,
            })),
            {
              id: 'avancement',
              libelle: 'Avancement',
              options: Object.entries(progressLabels).map(([valeur, libelle]) => ({
                valeur,
                libelle,
                nombre: (data?.visuals ?? []).filter((visual) => progressOf(visual) === valeur)
                  .length,
              })),
              selection: progress,
              onChange: setProgress,
            },
            {
              id: 'destination',
              libelle: 'Destination',
              options: enOptionsFiltre(data?.options.destination ?? []),
              selection: filters.destination.split(',').filter(Boolean),
              onChange: (values: string[]) => {
                setFilters({ ...filters, destination: values.join(',') })
              },
            },
          ]}
          onReinitialiser={() => {
            setFilters({
              dossier: '',
              depart: '',
              atelier: '',
              format: '',
              annonceur: '',
              destination: '',
            })
            setProgress([])
          }}
        />
      </div>
      {!validDossier && (
        <p role="alert">
          Saisissez des numéros de dossier séparés par des virgules, espaces ou points-virgules.
        </p>
      )}
      {etat.kind === 'loading' && <p role="status">Chargement du suivi…</p>}
      {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
      {legacy.kind === 'error' && <ErrorMessage error={legacy.error} onRetry={reloadLegacy} />}
      {data && (
        <>
          {progress.length ? <SelectedMetrics params={selectedParams} /> : <Metrics data={data} />}
          {(data.gaps.unmaterializedPreparations > 0 || data.kpis.unknownCoverage > 0) && (
            <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
              {data.gaps.unmaterializedPreparations} préparation(s) sans UM matérialisée, exclues de
              A ; {data.kpis.unknownCoverage} unité(s) à couverture indéterminée.
            </p>
          )}
          <TableMetier
            nom={title}
            lignes={rows}
            cle={(row) => row.id}
            colonnes={[
              {
                id: 'dossier',
                titre: 'Dossier',
                valeur: (row) => row.dossier,
                rendu: (row) => (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      setOpened(row)
                    }}
                  >
                    {row.dossier ?? 'Sans dossier'}
                  </button>
                ),
              },
              {
                id: 'visuel',
                titre: 'Visuel',
                valeur: (row) => `${row.advertiser ?? ''} · ${row.theme}`,
                rendu: (row) => (
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => {
                      setOpened(row)
                    }}
                  >
                    <strong>{row.advertiser ?? 'Annonceur non renseigné'}</strong>
                    <span className="block underline">{row.theme}</span>
                    <span className="text-xs text-slate-500">{row.format}</span>
                  </button>
                ),
              },
              { id: 'depart', titre: 'Départ', valeur: (row) => row.week },
              {
                id: 'prepa',
                titre: 'Pré-prod',
                valeur: (row) => steps.get(row.id)?.preparation ?? 'Non renseigné',
                rendu: (row) =>
                  link(
                    row,
                    `/coordination?pour=${pour}&aFaire=TOUS`,
                    `${steps.get(row.id)?.preparation ?? 'Non renseigné'} · ${row.posters.filter((poster) => poster.validated).length}/${row.posters.length} affiche(s) validée(s)`,
                  ),
              },
              {
                id: 'reception',
                titre: 'Réception',
                valeur: (row) => `${row.received}/${row.expected ?? '—'}`,
                rendu: (row) =>
                  link(
                    row,
                    '/reception/affiches',
                    `${row.received}/${row.expected ?? '—'} · ${steps.get(row.id)?.reception ?? receiptLabels[row.state]}`,
                  ),
              },
              {
                id: 'production',
                titre: 'Production',
                valeur: (row) =>
                  `${row.units.completed}/${row.units.total} · ${progressLabels[progressOf(row)]}`,
                rendu: (row) =>
                  link(
                    row,
                    pour === 'deroulant'
                      ? '/coordination/trains'
                      : `/coordination/unitaire?type=${pour}`,
                    `${row.units.completed}/${row.units.total} · ${progressLabels[progressOf(row)]}`,
                  ),
              },
              {
                id: 'expedition',
                titre: 'Expédition',
                valeur: (row) => row.units.shipped,
                rendu: (row) =>
                  link(
                    row,
                    '/expedition/colis',
                    `${row.units.shipped}/${row.units.total} expédiée(s)`,
                  ),
              },
              {
                id: 'nc',
                titre: 'Non-conformité',
                valeur: (row) => steps.get(row.id)?.nc ?? null,
                rendu: (row) =>
                  link(
                    row,
                    '/non-conformite?tab=suivi',
                    `${steps.get(row.id)?.nc ?? '—'} NC ouverte(s)`,
                  ),
              },
              { id: 'site', titre: 'Site', valeur: (row) => row.site, cachee: true },
              { id: 'atelier', titre: 'Atelier', valeur: (row) => row.workshop, cachee: true },
              { id: 'format', titre: 'Format', valeur: (row) => row.format, cachee: true },
              { id: 'attendu', titre: 'Attendu', valeur: (row) => row.expected, cachee: true },
              { id: 'recu', titre: 'Reçu', valeur: (row) => row.received, cachee: true },
              {
                id: 'reste',
                titre: 'Reste à recevoir',
                valeur: (row) => row.remaining,
                cachee: true,
              },
              {
                id: 'avancement',
                titre: 'Avancement',
                valeur: (row) => progressLabels[progressOf(row)],
                cachee: true,
              },
              {
                id: 'trains',
                titre: 'Trains',
                valeur: (row) => row.units.trainIds.join(', '),
                cachee: true,
              },
            ]}
          />
        </>
      )}
      {opened && (
        <SidePanel
          title={`Dossier ${opened.dossier ?? 'sans numéro'} · ${opened.theme}`}
          open
          onOpenChange={(open) => {
            if (!open) setOpened(null)
          }}
          wide
        >
          <p>
            {opened.site} · {opened.workshop} · {opened.week} · {opened.format}
          </p>
          <p className="my-3">
            Reçu : {opened.received} / {opened.expected ?? 'Attendu inconnu'} ·{' '}
            {progressLabels[progressOf(opened)]}
          </p>
          {opened.posters.length === 0 && <p>Aucune affiche rattachée.</p>}
          {opened.posters.map((poster) => (
            <section key={poster.id} className="my-3 rounded border p-3">
              <p>
                Affiche {poster.id} · {poster.received} rattachées · Emplacement {poster.location} ·{' '}
                {poster.validated ? 'Validée' : 'Non validée'}
              </p>
              {poster.photoId !== null ? (
                <img
                  className="mt-2 max-h-72 object-contain"
                  src={`/api/photos/${poster.photoId}`}
                  alt={`Visuel de l’affiche ${poster.id}`}
                />
              ) : (
                <p className="text-sm text-slate-500">Photo non renseignée</p>
              )}
            </section>
          ))}
          <p className="my-3">
            Livraison prévue : {opened.forecast ?? 'Non renseignée'} · {opened.forecastComment}
          </p>
          {data?.canEditForecast && (
            <button
              type="button"
              className="rounded border p-2"
              onClick={() => {
                setEditing(opened)
                setOpened(null)
              }}
            >
              Prévoir la livraison
            </button>
          )}
        </SidePanel>
      )}
      {editing && (
        <DeliveryForecastEditor
          visual={editing}
          onClose={() => {
            setEditing(null)
          }}
          onSaved={() => {
            setEditing(null)
            recharger()
          }}
        />
      )}
    </main>
  )
}
