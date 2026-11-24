import { useState } from 'react'
import { DeliveryForecastSchema, type DashboardVisual } from '@circe/shared'
import { apiPost } from '../../lib/api-client.ts'
import { Modale } from '../ui/modale.tsx'
import { ErrorMessage } from '../error-message.tsx'

export function DeliveryForecastEditor({
  visual,
  onClose,
  onSaved,
}: {
  visual: DashboardVisual
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(visual.forecast ?? '')
  const [comment, setComment] = useState(visual.forecastComment)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await apiPost(`/api/pilotage/dashboard/visuels/${visual.id}/livraison`, {
        schema: DeliveryForecastSchema,
        body: { version: visual.forecastVersion, date: date || null, comment },
      })
      onSaved()
    } catch (cause) {
      setError(cause)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modale
      titre={`Livraison prévue · ${visual.dossier ?? 'Sans dossier'} · ${visual.theme}`}
      ouverte
      onOuverture={(open) => {
        if (!open) onClose()
      }}
    >
      <form
        onSubmit={(event) => {
          void save(event)
        }}
        className="space-y-4"
      >
        <p className="text-sm">
          {visual.site} · {visual.advertiser} · {visual.week}
        </p>
        <label className="block text-sm font-medium">
          Date de livraison prévue
          <input
            className="mt-1 block w-full rounded border p-2"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
            }}
          />
        </label>
        <label className="block text-sm font-medium">
          Commentaire
          <textarea
            className="mt-1 block w-full rounded border p-2"
            maxLength={4000}
            rows={4}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value)
            }}
          />
        </label>
        <p className="text-xs text-slate-600">
          Cette prévision informe les équipes. Elle ne change ni la réception, ni le stock, ni la
          préparation.
        </p>
        {error !== null && <ErrorMessage error={error} />}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded border px-3 py-2"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-violet-900 px-3 py-2 text-white"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer la prévision'}
          </button>
        </div>
      </form>
    </Modale>
  )
}
