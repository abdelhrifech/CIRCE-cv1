import type { StockLigne } from '@circe/shared'
import { SidePanel } from '../overlays/side-panel.tsx'
export function StockDetails({
  poster,
  canSeePhoto,
  canSeePlanning,
  onClose,
}: {
  poster: StockLigne
  canSeePhoto: boolean
  canSeePlanning: boolean
  onClose: () => void
}) {
  return (
    <SidePanel
      title={`Affiche n° ${poster.id} · ${poster.theme ?? 'Visuel non renseigné'}`}
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <p className="mb-4">
        {poster.annonceur ?? 'Annonceur non renseigné'} · {poster.format} · {poster.site}
      </p>
      {poster.photoId != null && canSeePhoto ? (
        <img
          src={`/api/photos/${poster.photoId}`}
          alt={`Visuel de l’affiche ${poster.id}`}
          className="mb-5 max-h-[50vh] w-full object-contain"
        />
      ) : (
        <p className="mb-5 text-sm text-slate-500">
          {poster.photoId == null
            ? 'Photo non renseignée'
            : 'Photo réservée aux profils autorisés à consulter les affiches'}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 rounded border bg-slate-50 p-4">
        <dt>Emplacement</dt>
        <dd>{poster.emplacement}</dd>
        <dt>Reçu</dt>
        <dd>{poster.recu}</dd>
        <dt>Sorties expédition</dt>
        <dd>{poster.sorties}</dd>
        <dt>Rebut</dt>
        <dd>{poster.rebut}</dd>
        <dt>Disponible</dt>
        <dd>{poster.disponible}</dd>
        <dt>À conserver</dt>
        <dd>{poster.conserver ? 'Oui' : 'Non'}</dd>
        <dt>Départs</dt>
        <dd>{poster.semaines.join(' + ') || 'Sans semaine renseignée'}</dd>
      </dl>
      <h2 className="mb-2 mt-5 font-semibold">Dossiers rattachés</h2>
      {!poster.dossiers.length && <p>Aucun dossier rattaché.</p>}
      <ul className="space-y-2">
        {poster.dossiers.map((number) => (
          <li key={number}>
            {canSeePlanning ? (
              <a className="underline" href={`/pilotage/suivi?dossier=${number}`}>
                Dossier {number} · ouvrir le suivi
              </a>
            ) : (
              `Dossier ${number}`
            )}
          </li>
        ))}
      </ul>
    </SidePanel>
  )
}
