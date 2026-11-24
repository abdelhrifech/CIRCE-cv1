import { useState } from 'react'
import { z } from 'zod'
import {
  TransportImportSchema,
  FicheColisSchema,
  type TransportDonnees,
  type TransportListeSchema,
} from '@circe/shared'
import { useApi } from '../../lib/use-api.ts'
import { apiPost, apiRequest } from '../../lib/api-client.ts'
import { ErrorMessage } from '../error-message.tsx'

type Liste = z.infer<typeof TransportListeSchema>
export function TransportDetails({
  transport,
  boucles,
}: {
  transport: Liste['colis'][number]['transport']
  boucles: Liste['boucles']
}) {
  if (!transport) return <span>Non renseigné</span>
  const d = transport.donnees,
    b = boucles.find((b) => b.id === d.boucleId)
  return (
    <div className="space-y-1 text-xs">
      <p>
        {d.canal === 'MILK_RUN' ? 'Milk run' : 'Messagerie'} · {b?.nom ?? 'Boucle non renseignée'}
      </p>
      <p>
        N° de suivi : {d.numeroSuivi ?? '—'} · Récépissé : {d.recepisse ?? '—'}
      </p>
      <p>
        État transporteur : {d.etatTransporteur ?? 'Indisponible'} ·{' '}
        {d.dateEtat ? new Date(d.dateEtat).toLocaleString('fr-FR') : 'Date non renseignée'}
      </p>
      <p>
        Livraison attestée :{' '}
        {d.dateLivraison ? new Date(d.dateLivraison).toLocaleString('fr-FR') : 'Non renseignée'}
      </p>
      {d.suiviUrl && (
        <a href={d.suiviUrl} target="_blank" rel="noreferrer" className="mr-2 underline">
          Suivi enregistré
        </a>
      )}
      {d.preuveUrl && (
        <a href={d.preuveUrl} target="_blank" rel="noreferrer" className="mr-2 underline">
          Preuve enregistrée
        </a>
      )}
      {d.images.map((url, n) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="mr-2 underline">
          Image {n + 1}
        </a>
      ))}
      <p>
        Source : {d.provenance} · {d.referenceSource}
      </p>
    </div>
  )
}
export function TransportSaisie({
  colis,
  boucles,
  onSauvee,
}: {
  colis: Liste['colis'][number]
  boucles: Liste['boucles']
  onSauvee: () => void
}) {
  const [canalConfirme, setCanalConfirme] = useState(Boolean(colis.transport))
  const [ouvert, setOuvert] = useState(false),
    [erreur, setErreur] = useState<unknown>(null),
    [busy, setBusy] = useState(false)
  const [d, setD] = useState<TransportDonnees>(
    colis.transport?.donnees ?? {
      canal: 'MESSAGERIE',
      boucleId: null,
      numeroSuivi: null,
      recepisse: null,
      etatTransporteur: null,
      dateEtat: null,
      dateLivraison: null,
      preuveUrl: null,
      images: [],
      suiviUrl: null,
      provenance: '',
      referenceSource: '',
    },
  )
  async function sauver() {
    setBusy(true)
    setErreur(null)
    try {
      const body = TransportImportSchema.parse({
        colisId: colis.id,
        version: colis.transport?.version ?? 0,
        donnees: d,
      })
      await apiPost('/api/transport/colis/import', {
        schema: z.object({ message: z.string(), version: z.number() }),
        body,
      })
      setOuvert(false)
      onSauvee()
    } catch (e) {
      setErreur(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-2 text-xs">
      <button
        type="button"
        className="underline"
        onClick={() => {
          setOuvert(!ouvert)
        }}
      >
        Renseigner les données vérifiées
      </button>
      {ouvert && (
        <div className="space-y-2 rounded border bg-white p-3">
          <p>
            Source réelle obligatoire. Cette saisie ne modifie ni le statut du colis ni le stock.
          </p>
          <label>
            Canal explicitement vérifié
            <select
              value={canalConfirme ? d.canal : ''}
              onChange={(e) => {
                setCanalConfirme(Boolean(e.target.value))
                if (e.target.value)
                  setD({ ...d, canal: e.target.value as TransportDonnees['canal'], boucleId: null })
              }}
            >
              <option value="">Choisir le canal vérifié</option>
              <option value="MESSAGERIE">Messagerie</option>
              <option value="MILK_RUN">Milk run</option>
            </select>
          </label>
          <label className="block">
            Boucle configurée
            <select
              value={d.boucleId ?? ''}
              onChange={(e) => {
                setD({ ...d, boucleId: e.target.value ? Number(e.target.value) : null })
              }}
            >
              <option value="">Non renseignée</option>
              {boucles
                .filter(
                  (b) => b.canal === d.canal && b.destinataires.includes(colis.destinataire.id),
                )
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nom}
                  </option>
                ))}
            </select>
          </label>
          {(
            [
              ['numeroSuivi', 'N° de suivi'],
              ['recepisse', 'Récépissé'],
              ['etatTransporteur', 'Libellé transporteur exact'],
              ['dateEtat', 'Date état (ISO avec fuseau)'],
              ['dateLivraison', 'Date livraison attestée (ISO avec fuseau)'],
              ['suiviUrl', 'URL réelle de suivi'],
              ['preuveUrl', 'URL réelle de preuve'],
              ['provenance', 'Provenance'],
              ['referenceSource', 'Référence de la source'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              {label}
              <input
                className="ml-2 rounded border p-1"
                value={d[key] ?? ''}
                onChange={(e) => {
                  setD({ ...d, [key]: e.target.value || null })
                }}
              />
            </label>
          ))}
          <label className="block">
            Images (une URL HTTPS réelle par ligne)
            <textarea
              value={d.images.join('\n')}
              onChange={(e) => {
                setD({ ...d, images: e.target.value.split('\n').filter(Boolean) })
              }}
            />
          </label>
          {erreur !== null && <ErrorMessage error={erreur} />}
          <button
            type="button"
            disabled={busy || !canalConfirme}
            onClick={() => void sauver()}
            className="rounded border p-2"
          >
            Enregistrer la vérification
          </button>
        </div>
      )}
    </div>
  )
}
export function GeodisIndisponible() {
  return (
    <p className="my-3 rounded border bg-slate-50 p-3 text-sm">
      Connexion Geodis indisponible : contrat et identifiants non configurés. Les informations
      ci-dessous proviennent des sources vérifiées enregistrées.
    </p>
  )
}

export function CodesUnites({ id }: { id: number }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div>
      <button
        className="underline"
        type="button"
        onClick={() => {
          setOuvert(!ouvert)
        }}
      >
        Voir les références UM / trains
      </button>
      {ouvert && <CodesUnitesContenu id={id} />}
    </div>
  )
}
function CodesUnitesContenu({ id }: { id: number }) {
  const { etat, recharger } = useApi(`transport-codes-${id}`, (signal) =>
    apiRequest('GET', `/api/coordination/colis/${id}`, { schema: FicheColisSchema, signal }),
  )
  if (etat.kind === 'loading') return <p>Chargement des unités…</p>
  if (etat.kind === 'error') return <ErrorMessage error={etat.error} onRetry={recharger} />
  return (
    <div className="mt-2 text-xs">
      <p>
        CAB colis Circé : <code>{etat.data.code}</code>
      </p>
      <ul>
        {etat.data.unites.map((u) => (
          <li key={u.uniteId}>
            Référence UM : <code>{u.code}</code> · {u.quantite} affiche(s)
          </li>
        ))}
        {etat.data.trains.map((t) => (
          <li key={t.trainId}>
            Identifiant train : <code>{t.trainId}</code> · {t.faces} face(s)
          </li>
        ))}
      </ul>
    </div>
  )
}
