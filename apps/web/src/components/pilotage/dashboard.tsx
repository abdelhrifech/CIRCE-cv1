import { useState, type ReactNode } from 'react'
import { DashboardSchema, formatSemaineIso, semaineIsoDe, type Dashboard } from '@circe/shared'
import { apiRequest } from '../../lib/api-client.ts'
import { useApi } from '../../lib/use-api.ts'
import { ErrorMessage } from '../error-message.tsx'
import { TableMetier } from '../ui/table-metier.tsx'
import { DashboardFilter } from './dashboard-filter.tsx'
import { ProductionBars, StageLegend } from './dashboard-charts.tsx'
import { DeliveryForecastEditor } from './delivery-forecast.tsx'

const number = (n: number | null) => (n === null ? 'Non déterminé' : n.toLocaleString('fr-FR'))
const day = (value: string) =>
  new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  })
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b px-5 py-4 text-lg font-semibold">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  )
}
function Kpi({
  title,
  value,
  children,
  href,
}: {
  title: string
  value: string
  children: ReactNode
  href?: string
}) {
  const body = (
    <>
      <h2 className="text-sm font-medium text-slate-600">{title}</h2>
      <strong className="my-2 block text-3xl">{value}</strong>
      <p className="text-sm text-slate-600">{children}</p>
    </>
  )
  return href ? (
    <a
      href={href}
      className="rounded-lg border bg-white p-5 hover:border-violet-500 focus-visible:outline-2"
    >
      {body}
    </a>
  ) : (
    <section className="rounded-lg border bg-white p-5">{body}</section>
  )
}
const noOptions: Dashboard['options'] = {
  dossier: [],
  depart: [],
  atelier: [],
  format: [],
  annonceur: [],
  destination: [],
}
export function ProductionDashboard({ dossier, depart }: { dossier?: number; depart?: string }) {
  const [filters, setFilters] = useState({
    dossier: dossier ? String(dossier) : '',
    depart: depart ?? (dossier ? '' : formatSemaineIso(semaineIsoDe(new Date()))),
    atelier: '',
    format: '',
    annonceur: '',
    destination: '',
  })
  const [more, setMore] = useState(false)
  const [forecastVisual, setForecastVisual] = useState<Dashboard['visuals'][number] | null>(null)
  const [message, setMessage] = useState('')
  const [lastOptions, setLastOptions] = useState(noOptions)
  const params = new URLSearchParams()
  const validDossier = !filters.dossier || /^\d+(?:[,;\s]+\d+)*$/.test(filters.dossier)
  for (const [key, value] of Object.entries(filters))
    if (value && (key !== 'dossier' || validDossier)) params.set(key, value)
  const { etat, recharger } = useApi(`production-dashboard-${params}`, (signal) =>
    apiRequest('GET', `/api/pilotage/dashboard?${params}`, { schema: DashboardSchema, signal }),
  )
  const data = etat.kind === 'ready' ? etat.data : null
  if (data && data.options !== lastOptions) setLastOptions(data.options)
  const options = data?.options ?? lastOptions
  const change = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }))
  }
  const linkParams = filters.dossier ? `&dossier=${encodeURIComponent(filters.dossier)}` : ''
  const missingLink = `/pilotage/reservations?ou=AFFICHES,PARTIEL${linkParams}`
  return (
    <main className="space-y-5 p-6">
      {message && (
        <p role="status" className="rounded border border-green-300 bg-green-50 p-3 text-sm">
          {message}
        </p>
      )}
      {forecastVisual && (
        <DeliveryForecastEditor
          key={forecastVisual.id}
          visual={forecastVisual}
          onClose={() => {
            setForecastVisual(null)
          }}
          onSaved={() => {
            setForecastVisual(null)
            setMessage('Prévision de livraison enregistrée.')
            recharger()
          }}
        />
      )}
      <header>
        <p className="mb-1 text-sm text-slate-600">Pilotage · Suivi de prod</p>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </header>
      <div
        className="flex flex-wrap items-end gap-3"
        role="group"
        aria-label="Filtres du dashboard"
      >
        <label className="text-sm font-medium">
          N° de dossier
          <input
            aria-label="Dossier(s)"
            className="mt-1 block rounded border p-2"
            placeholder="Saisir ou coller plusieurs numéros"
            value={filters.dossier}
            onChange={(e) => {
              change('dossier', e.target.value)
            }}
          />
        </label>
        {(['depart', 'atelier', 'format'] as const).map((key) => (
          <DashboardFilter
            key={key}
            label={{ depart: 'Départ', atelier: 'Atelier', format: 'Format' }[key]}
            options={options[key]}
            selected={filters[key].split(key === 'format' ? '|' : ',').filter(Boolean)}
            onChange={(values) => {
              change(key, values.join(key === 'format' ? '|' : ','))
            }}
          />
        ))}
        <DashboardFilter
          label="Annonceur"
          options={options.annonceur}
          selected={filters.annonceur.split('|').filter(Boolean)}
          onChange={(v) => {
            change('annonceur', v.join('|'))
          }}
        />
        <button
          type="button"
          className="rounded border px-3 py-2 text-sm"
          aria-expanded={more}
          onClick={() => {
            setMore(!more)
          }}
        >
          + Filtre
        </button>
        {(more || filters.destination) && (
          <DashboardFilter
            label="Destination"
            options={options.destination}
            selected={filters.destination.split(',').filter(Boolean)}
            onChange={(v) => {
              change('destination', v.join(','))
            }}
          />
        )}
        <button
          type="button"
          className="p-2 text-sm underline"
          onClick={() => {
            setFilters({
              dossier: '',
              depart: '',
              atelier: '',
              format: '',
              annonceur: '',
              destination: '',
            })
          }}
        >
          Réinitialiser
        </button>
      </div>
      {!validDossier && (
        <p role="alert" className="text-sm text-amber-800">
          Saisissez des numéros de dossier séparés par des virgules, espaces ou points-virgules.
        </p>
      )}
      {etat.kind === 'loading' && <p role="status">Chargement du dashboard…</p>}
      {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
            <section className="rounded-lg border-2 border-violet-800 bg-white p-5">
              <h2 className="text-sm font-medium">
                Avancement · {filters.depart || 'tous les départs'}
              </h2>
              <strong className="my-3 block text-5xl text-violet-950">
                {data.kpis.progress === null ? '—' : `${Math.floor(data.kpis.progress * 100)} %`}
              </strong>
              <progress
                aria-label="Avancement C / A"
                max={data.kpis.total || 1}
                value={data.kpis.completed}
                className="h-3 w-full accent-violet-900"
              />
              <p className="mt-2 text-sm">
                C / A : {number(data.kpis.completed)} unités colisées ou expédiées sur{' '}
                {number(data.kpis.total)} à produire
              </p>
            </section>
            <Kpi title="Reste à recevoir" value={number(data.kpis.remaining)} href={missingLink}>
              {number(data.kpis.received)} reçues sur {number(data.kpis.expected)} attendues,
              entretien compris
            </Kpi>
            <Kpi title="OK pour production (B)" value={number(data.kpis.ready)}>
              sur {number(data.kpis.total)} unités à produire (A) : trains, UM, lots
            </Kpi>
            <Kpi title="En attente (A − B)" value={number(data.kpis.waiting)} href={missingLink}>
              unités dont la couverture n’est pas complète
              {data.kpis.unknownCoverage
                ? `, dont ${data.kpis.unknownCoverage} non déterminée(s)`
                : ''}
            </Kpi>
            <Kpi title="Terminées (C)" value={number(data.kpis.completed)}>
              scannées au colisage
            </Kpi>
          </div>
          {(data.gaps.unmaterializedPreparations > 0 || data.gaps.unknownQuantities > 0) && (
            <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
              {data.gaps.unmaterializedPreparations > 0 &&
                `${number(data.gaps.unmaterializedPreparations)} répartition(s) sans unité matérialisée : exclue(s) de A pour ne pas compter des lignes comme des UM. `}
              {data.gaps.unknownQuantities > 0 &&
                `${number(data.gaps.unknownQuantities)} visuel(s) sans quantité attendue connue : reste à recevoir non déterminé.`}
            </p>
          )}
          <StageLegend />
          <div className="grid gap-5 xl:grid-cols-2">
            <Card title="Avancement par atelier">
              <p className="mb-4 text-sm text-slate-600">Cliquer une ligne pour filtrer</p>
              <ProductionBars
                label="Avancement par atelier"
                rows={data.workshops.map((r) => ({ ...r, id: String(r.id), sub: r.site }))}
                onSelect={(id) => {
                  change('atelier', id)
                }}
              />
            </Card>
            <Card title="Avancement par départ camion">
              <p className="mb-4 text-sm text-slate-600">Geodis : milk run et messagerie</p>
              <ProductionBars
                label="Avancement par départ camion"
                rows={data.departures.map((r) => ({
                  ...r,
                  sub: `${r.site} · ${day(r.date)} · ${r.channel === 'MILK_RUN' ? 'Milk run' : 'Messagerie'}${new Date(r.date).getTime() < new Date(data.computedAt).getTime() ? ' · date passée' : ''}`,
                }))}
              />
              {data.gaps.withoutDeparture > 0 && (
                <p className="mt-3 text-sm text-amber-800">
                  {number(data.gaps.withoutDeparture)} unité(s) sans boucle unique et horaire
                  renseignés : départ non déterminé.
                </p>
              )}
            </Card>
            <Card title="Reste à recevoir par annonceur">
              <p className="mb-3 text-sm text-slate-600">8 premiers</p>
              {!data.advertisers.length && <p>Aucun reste à recevoir connu dans ce périmètre.</p>}
              <ul className="space-y-4">
                {data.advertisers.map((r) => (
                  <li key={r.label}>
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => {
                        change('annonceur', r.label)
                      }}
                    >
                      {r.label}
                    </button>
                    <div className="my-1 h-4 rounded bg-amber-100" aria-hidden="true">
                      <div
                        className="h-full rounded bg-amber-400"
                        style={{
                          width: `${(100 * r.remaining) / Math.max(1, ...data.advertisers.map((a) => a.remaining))}%`,
                        }}
                      />
                    </div>
                    <p className="text-sm">
                      {number(r.remaining)} / {number(r.expected)} affiches
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Alertes du périmètre">
              <a href="/pilotage/alertes" className="mb-3 block text-sm underline">
                Toutes les alertes
              </a>
              {!data.alertsAvailable ? (
                <p>La consultation des alertes n’est pas autorisée pour ce profil.</p>
              ) : !data.alerts.length ? (
                <p>Aucune alerte.</p>
              ) : (
                <ul className="divide-y">
                  {data.alerts.map((a) => (
                    <li key={a.cle} className="py-3">
                      <strong>{a.titre}</strong>
                      <span className="ml-2 rounded border px-1 text-xs">
                        {a.gravite === 'CRITIQUE'
                          ? 'Critique'
                          : a.gravite === 'IMPORTANT'
                            ? 'Important'
                            : a.gravite === 'A_SURVEILLER'
                              ? 'À surveiller'
                              : 'Information'}
                      </span>
                      <p className="my-1 text-sm">{a.message}</p>
                      <a className="text-sm underline" href={a.lien}>
                        Ouvrir
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card title="Visuels qui bloquent la production">
            <p className="mb-3 text-sm text-slate-600">
              Liste des visuels en attente (A − B). Un train peut être bloqué par plusieurs visuels.
            </p>
            <TableMetier
              nom="Visuels qui bloquent la production"
              lignes={data.blocking}
              cle={(v) => v.id}
              actions={
                data.canEditForecast
                  ? (v) => (
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-sm"
                        onClick={() => {
                          setForecastVisual(v)
                        }}
                      >
                        Prévoir la livraison
                      </button>
                    )
                  : undefined
              }
              colonnes={[
                {
                  id: 'visual',
                  titre: 'Visuel',
                  valeur: (v) => `${v.advertiser ?? ''} · ${v.theme}`,
                },
                {
                  id: 'dossier',
                  titre: 'Dossier',
                  valeur: (v) => v.dossier,
                  rendu: (v) =>
                    v.dossier === null ? (
                      '—'
                    ) : (
                      <a className="underline" href={`/pilotage/reservations?dossier=${v.dossier}`}>
                        {v.dossier}
                      </a>
                    ),
                },
                {
                  id: 'atelier',
                  titre: 'Atelier',
                  valeur: (v) => `${v.site} · ${v.workshop ?? 'Non renseigné'}`,
                },
                {
                  id: 'remaining',
                  titre: 'Reste à recevoir',
                  valeur: (v) => v.remaining,
                  rendu: (v) => number(v.remaining),
                },
                { id: 'blocked', titre: 'Unités bloquées', valeur: (v) => v.blockedUnits },
                {
                  id: 'forecast',
                  titre: 'Livraison prévue',
                  valeur: (v) => v.forecast,
                  rendu: (v) => (
                    <span>
                      {v.forecast
                        ? new Date(v.forecast).toLocaleDateString('fr-FR', { timeZone: 'UTC' })
                        : 'Non renseignée'}
                      {v.forecastComment && (
                        <span className="mt-1 block text-xs">{v.forecastComment}</span>
                      )}
                      {v.forecastUpdatedBy && (
                        <span className="mt-1 block text-xs text-slate-500">
                          Par {v.forecastUpdatedBy}
                          {v.forecastUpdatedAt ? ` · ${day(v.forecastUpdatedAt)}` : ''}
                        </span>
                      )}
                    </span>
                  ),
                },
                {
                  id: 'state',
                  titre: 'État',
                  valeur: (v) =>
                    ({
                      MISSING: 'Non reçu',
                      PARTIAL: 'Partiel',
                      COMPLETE: 'Reçu',
                      SURPLUS: 'Surplus > 10 %',
                      UNKNOWN: 'Attendu non déterminé',
                    })[v.state],
                },
              ]}
            />
          </Card>
          <p className="text-xs text-slate-500">
            Données calculées le {day(data.computedAt)}. A compte les trains physiques et les
            UM/lots matérialisés ; aucun état de production n’est modifié.
          </p>
        </>
      )}
    </main>
  )
}
