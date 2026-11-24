import { FacetFilters } from '../../components/filters/facet-filters.tsx'
import type { FacetSelection } from '../../lib/faceted-filters.ts'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MouvementsStocksSchema, StocksSchema } from '@circe/shared'
import { requirePermission } from '../../lib/session.ts'
import { apiRequest } from '../../lib/api-client.ts'
import { useApi } from '../../lib/use-api.ts'
import { TableMetier } from '../../components/ui/table-metier.tsx'
import { ErrorMessage } from '../../components/error-message.tsx'
import { PageStocks, IndicateursStocks, champStock } from '../../components/stocks/commun.tsx'
export const Route = createFileRoute('/stocks/mouvements')({
  beforeLoad: requirePermission('stock.consulter'),
  component: Page,
})
function Page() {
  const [multi, setMulti] = useState<FacetSelection>({})
  const [f, setF] = useState({ dossier: '', type: '', auto: '', par: '', du: '', au: '' }),
    [page, setPage] = useState(1)
  const qs = new URLSearchParams(
    Object.entries({ ...f, page: String(page) }).filter(([, v]) => v !== ''),
  )
  if (multi.type?.length) qs.set('types', JSON.stringify(multi.type))
  if (multi.par?.length) qs.set('auteurs', JSON.stringify(multi.par))
  const { etat, recharger } = useApi(`mouvements-${qs}`, (signal) =>
    apiRequest('GET', `/api/stocks/mouvements?${qs}`, { schema: MouvementsStocksSchema, signal }),
  )
  // Maquette stock.js : indicateurs de stock, indépendants des filtres du journal.
  const { etat: stock, recharger: reloadStock } = useApi('movement-stock', (signal) =>
    apiRequest('GET', '/api/stocks', { schema: StocksSchema, signal }),
  )
  return (
    <PageStocks titre="Mouvements">
      {stock.kind === 'loading' && <p>Chargement des indicateurs de stock…</p>}
      {stock.kind === 'error' && <ErrorMessage error={stock.error} onRetry={reloadStock} />}
      {stock.kind === 'ready' && (
        <IndicateursStocks
          items={[
            { titre: 'Affiches en stock', valeur: stock.data.indicateurs.disponible },
            {
              titre: 'Reliquats d’entretien à conserver',
              valeur: stock.data.indicateurs.reliquats,
              detail: `${stock.data.indicateurs.visuelsConserves} visuels`,
            },
            { titre: 'Rebut', valeur: stock.data.indicateurs.rebut },
            {
              titre: 'Sorties automatiques aujourd’hui',
              valeur: stock.data.indicateurs.sortiesAujourdhui,
            },
          ]}
        />
      )}

      <div className="mb-5 flex flex-wrap items-end gap-3">
        {(['dossier', 'du', 'au'] as const).map((k) => (
          <label key={k}>
            {{ dossier: 'Dossier(s)', type: 'Mouvement', par: 'Par', du: 'Du', au: 'Au' }[k]}
            <input
              type={k === 'du' || k === 'au' ? 'date' : 'text'}
              className={champStock}
              value={f[k]}
              onChange={(e) => {
                setF({ ...f, [k]: e.target.value })
                setPage(1)
              }}
            />
          </label>
        ))}
        <label>
          Automatique
          <select
            className={champStock}
            value={f.auto}
            onChange={(e) => {
              setF({ ...f, auto: e.target.value })
              setPage(1)
            }}
          >
            <option value="">Tous</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </select>
        </label>
      </div>
      <FacetFilters
        rows={[]}
        facets={[
          { id: 'type', label: 'Mouvement', values: () => [] },
          { id: 'par', label: 'Par', values: () => [] },
        ]}
        selected={multi}
        optionsByFacet={etat.kind === 'ready' ? etat.data.facets : undefined}
        onChange={(value) => {
          setMulti(value)
          setPage(1)
        }}
      />
      {etat.kind === 'loading' && <p>Chargement des mouvements…</p>}
      {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
      {etat.kind === 'ready' && (
        <>
          <TableMetier
            nom="Mouvements de stock"
            lignes={etat.data.items}
            cle={(m) => m.id}
            colonnes={[
              {
                id: 'date',
                titre: 'Date',
                valeur: (m) => new Date(m.date).toLocaleString('fr-FR'),
              },
              { id: 'affiche', titre: 'N° affiche', valeur: (m) => m.afficheId },
              { id: 'type', titre: 'Mouvement', valeur: (m) => m.type },
              {
                id: 'qte',
                titre: 'Quantité',
                valeur: (m) => m.quantite,
                rendu: (m) =>
                  new Intl.NumberFormat('fr-FR', { signDisplay: 'exceptZero' }).format(m.quantite),
              },
              { id: 'par', titre: 'Par', valeur: (m) => m.par },
              { id: 'auto', titre: 'Automatique', valeur: (m) => (m.automatique ? 'Oui' : 'Non') },
              { id: 'motif', titre: 'Motif', valeur: (m) => m.motif },
              { id: 'site', titre: 'Site', valeur: (m) => m.site, cachee: true },
              {
                id: 'dossier',
                titre: 'Dossiers',
                valeur: (m) => m.dossiers.join(', '),
                cachee: true,
              },
            ]}
          />
          <div className="mt-4 flex justify-between">
            <span>{etat.data.total} mouvement(s) · export de la page affichée</span>
            <div>
              <button
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1)
                }}
              >
                Précédente
              </button>
              <span className="mx-3">Page {page}</span>
              <button
                disabled={page * etat.data.pageSize >= etat.data.total}
                onClick={() => {
                  setPage(page + 1)
                }}
              >
                Suivante
              </button>
            </div>
          </div>
        </>
      )}
    </PageStocks>
  )
}
