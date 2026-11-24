import { StockDetails } from '../../components/stocks/stock-details.tsx'
import { FacetFilters } from '../../components/filters/facet-filters.tsx'
import { filterFacets, type FacetSelection } from '../../lib/faceted-filters.ts'
import { stockFacets, stockIndicators } from '../../lib/stock-filters.ts'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  StockQuerySchema,
  StocksSchema,
  ResultatStocksSchema,
  MOTIFS_REBUT,
  type StockLigne,
} from '@circe/shared'
import { requirePermission, can, getMe } from '../../lib/session.ts'
import { apiPost, apiRequest } from '../../lib/api-client.ts'
import { useApi } from '../../lib/use-api.ts'
import { TableMetier } from '../../components/ui/table-metier.tsx'
import { Modale } from '../../components/ui/modale.tsx'
import { ErrorMessage } from '../../components/error-message.tsx'
import { Button } from '../../components/button.tsx'
import { PageStocks, IndicateursStocks, champStock } from '../../components/stocks/commun.tsx'
export const Route = createFileRoute('/stocks/')({
  validateSearch: StockQuerySchema,
  beforeLoad: requirePermission('stock.consulter'),
  component: Page,
})
function Page() {
  const initial = Route.useSearch(),
    [facets, setFacets] = useState<FacetSelection>(() =>
      Object.fromEntries(
        Object.entries(initial)
          .filter(([key, value]) => key !== 'q' && value)
          .map(([key, value]) => [key, value.split(',').map((entry) => entry.trim())]),
      ),
    ),
    [opened, setOpened] = useState<StockLigne | null>(null),
    [choix, setChoix] = useState<number[]>([]),
    [action, setAction] = useState<'rebut' | 'conserver' | null>(null),
    [qte, setQte] = useState(1),
    [motif, setMotif] = useState<(typeof MOTIFS_REBUT)[number]>('AFFICHE_DECHIREE'),
    [envoi, setEnvoi] = useState(false),
    [erreur, setErreur] = useState<unknown>(null),
    [message, setMessage] = useState('')
  const { etat, recharger } = useApi('stock-all', (signal) =>
    apiRequest('GET', '/api/stocks', { schema: StocksSchema, signal }),
  )
  const { etat: moi } = useApi('stock-moi', () => getMe())
  const peut = (p: Parameters<typeof can>[1]) => moi.kind === 'ready' && can(moi.data, p)
  const allItems = etat.kind === 'ready' ? etat.data.items : []
  const searched = initial.q
    ? allItems.filter((row) =>
        `${row.id} ${row.annonceur} ${row.theme} ${row.dossiers.join(' ')}`
          .toLocaleLowerCase('fr')
          .includes((initial.q ?? '').toLocaleLowerCase('fr')),
      )
    : allItems
  const items = filterFacets(searched, stockFacets, facets),
    selection = items.filter((a) => choix.includes(a.id))
  const indicators = {
    ...stockIndicators(items),
    sortiesAujourdhui: etat.kind === 'ready' ? etat.data.indicateurs.sortiesAujourdhui : 0,
  }
  async function executer() {
    setEnvoi(true)
    setErreur(null)
    try {
      const resultat = await apiPost(
        action === 'rebut' ? '/api/stocks/rebut' : '/api/stocks/conserver',
        {
          schema: ResultatStocksSchema,
          body: {
            affiches: selection.map((a) => ({ id: a.id, version: a.version })),
            ...(action === 'rebut' ? { quantite: qte, motif } : {}),
          },
        },
      )
      setChoix([])
      setAction(null)
      setMessage(resultat.message)
    } catch (e) {
      setErreur(e)
      setMessage('Opération refusée : aucune affiche du lot n’a été modifiée.')
    } finally {
      setEnvoi(false)
      recharger()
    }
  }
  const colonnes = [
    { id: 'id', titre: 'N° affiche', valeur: (a: StockLigne) => a.id },
    {
      id: 'visuel',
      titre: 'Annonceur · thème',
      valeur: (a: StockLigne) => `${a.annonceur ?? '—'} · ${a.theme ?? '—'}`,
      rendu: (a: StockLigne) => (
        <>
          <button
            type="button"
            className="text-left"
            aria-label={`Voir le visuel de l’affiche ${a.id}`}
            onClick={() => {
              setOpened(a)
            }}
          >
            <strong>{a.annonceur ?? '—'}</strong>
            <span className="block underline">{a.theme ?? '—'}</span>
          </button>
          {a.conserver && <span className="text-sky-800">À conserver</span>}
        </>
      ),
    },
    { id: 'semaine', titre: 'Départ', valeur: (a: StockLigne) => a.semaines.join(' + ') },
    {
      id: 'emplacement',
      titre: 'Emplacement',
      valeur: (a: StockLigne) => `${a.emplacement} · ${a.site}`,
    },
    { id: 'recu', titre: 'Reçu', valeur: (a: StockLigne) => a.recu },
    { id: 'sorties', titre: 'Sorties expédition', valeur: (a: StockLigne) => a.sorties },
    {
      id: 'disponible',
      titre: 'Disponible',
      valeur: (a: StockLigne) => a.disponible,
      rendu: (a: StockLigne) => (
        <>
          {a.rebut > 0 && <span className="mr-2 text-red-800">{a.rebut} rebut</span>}
          {a.disponible}
        </>
      ),
    },
    {
      id: 'derniere',
      titre: 'Dernière sortie auto',
      valeur: (a: StockLigne) =>
        a.derniereSortie ? new Date(a.derniereSortie).toLocaleString('fr-FR') : '—',
    },
    { id: 'annonceur', titre: 'Annonceur', valeur: (a: StockLigne) => a.annonceur, cachee: true },
    { id: 'theme', titre: 'Thème', valeur: (a: StockLigne) => a.theme, cachee: true },
    {
      id: 'conserver',
      titre: 'À conserver',
      valeur: (a: StockLigne) => (a.conserver ? 'Oui' : ''),
      cachee: true,
    },
    { id: 'site', titre: 'Site', valeur: (a: StockLigne) => a.site, cachee: true },
    { id: 'format', titre: 'Format', valeur: (a: StockLigne) => a.format, cachee: true },
    {
      id: 'dossier',
      titre: 'Dossiers',
      valeur: (a: StockLigne) => a.dossiers.join(', '),
      cachee: true,
    },
    { id: 'rebut', titre: 'Rebut', valeur: (a: StockLigne) => a.rebut, cachee: true },
  ]
  return (
    <PageStocks titre="Stock par affiche">
      {opened && (
        <StockDetails
          poster={opened}
          canSeePhoto={peut('affiche.consulter')}
          canSeePlanning={peut('instruction.consulter')}
          onClose={() => {
            setOpened(null)
          }}
        />
      )}

      <FacetFilters
        rows={searched}
        facets={stockFacets}
        selected={facets}
        onChange={(value) => {
          setFacets(value)
          setChoix([])
        }}
      />
      {etat.kind === 'loading' && <p className="my-5">Chargement du stock…</p>}
      {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
      {etat.kind === 'ready' && (
        <>
          <IndicateursStocks
            items={[
              { titre: 'Affiches en stock', valeur: indicators.disponible },
              {
                titre: 'Reliquats d’entretien à conserver',
                valeur: indicators.reliquats,
                detail: `${indicators.visuelsConserves} visuels`,
              },
              { titre: 'Rebut', valeur: indicators.rebut },
              {
                titre: 'Sorties automatiques aujourd’hui',
                valeur: indicators.sortiesAujourdhui,
              },
            ]}
          />
          <div className="my-4 flex flex-wrap items-center gap-3">
            <label>
              <input
                type="checkbox"
                checked={items.length > 0 && selection.length === items.length}
                onChange={(e) => {
                  setChoix(e.target.checked ? items.map((a) => a.id) : [])
                }}
              />{' '}
              Tout sélectionner
            </label>
            <span>{selection.length} sélectionnée(s)</span>
            <Button
              disabled={!peut('stock.rebut') || !selection.length}
              onClick={() => {
                setErreur(null)
                setAction('rebut')
              }}
            >
              Mettre au rebut
            </Button>
            <Button
              disabled={
                !peut('affiche.modifier') ||
                !peut('affiche.conserver') ||
                !selection.length ||
                selection.some((a) => a.fusionnee)
              }
              onClick={() => {
                setErreur(null)
                setAction('conserver')
              }}
            >
              Marquer « à conserver »
            </Button>
          </div>
          {message && (
            <p role="status" className="my-3 text-sky-900">
              {message}
            </p>
          )}
          <TableMetier
            nom="Stock par affiche"
            lignes={items}
            cle={(a) => a.id}
            colonnes={colonnes}
            actions={(a) => (
              <label>
                <input
                  type="checkbox"
                  aria-label={`Sélectionner affiche ${a.id}`}
                  checked={choix.includes(a.id)}
                  onChange={(e) => {
                    setChoix(
                      e.target.checked ? [...choix, a.id] : choix.filter((id) => id !== a.id),
                    )
                  }}
                />{' '}
                Sélectionner
              </label>
            )}
          />
        </>
      )}
      {action && (
        <Modale
          titre={
            action === 'rebut'
              ? `Mise au rebut (${selection.length} affiche(s))`
              : 'Marquer les affiches à conserver'
          }
          ouverte
          onOuverture={(o) => {
            if (!o && !envoi) setAction(null)
          }}
        >
          <p className="mb-4">Affiches : {selection.map((a) => a.id).join(', ')}.</p>
          {action === 'rebut' && (
            <div className="space-y-3">
              <label className="block">
                Quantité par affiche
                <input
                  className={champStock}
                  type="number"
                  min={1}
                  value={qte}
                  onChange={(e) => {
                    setQte(Number(e.target.value))
                  }}
                />
              </label>
              <label className="block">
                Motif
                <select
                  className={champStock}
                  value={motif}
                  onChange={(e) => {
                    setMotif(e.target.value as typeof motif)
                  }}
                >
                  {MOTIFS_REBUT.map((m) => (
                    <option key={m} value={m}>
                      {
                        {
                          AFFICHE_DECHIREE: 'Affiche déchirée',
                          MAUVAIS_VISUEL: 'Mauvais visuel',
                          ERREUR_QUANTITE: 'Erreur de quantité',
                          AUTRE: 'Autre',
                        }[m]
                      }
                    </option>
                  ))}
                </select>
              </label>
              <p>
                La quantité doit être disponible sur chaque affiche. Le serveur refuse tout
                dépassement.
              </p>
            </div>
          )}
          {erreur !== null && <ErrorMessage error={erreur} />}
          <div className="mt-5 flex justify-end gap-3">
            <button
              disabled={envoi}
              onClick={() => {
                setAction(null)
              }}
            >
              Annuler
            </button>
            <Button
              disabled={
                envoi ||
                (action === 'rebut' &&
                  (!Number.isInteger(qte) || qte < 1 || selection.some((a) => qte > a.disponible)))
              }
              onClick={() => {
                void executer()
              }}
            >
              Confirmer
            </Button>
          </div>
        </Modale>
      )}
    </PageStocks>
  )
}
