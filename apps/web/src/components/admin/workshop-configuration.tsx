import { useState } from 'react'
import {
  WorkshopConfigurationsSchema,
  WorkshopConfigurationSchema,
  WorkshopConfigurationInputSchema,
  ProductionFlowSchema,
  PRODUCTION_FLOW_LABELS,
  SCHEDULING_CRITERION_LABELS,
  schedulingCriteriaFor,
} from '@circe/shared'
import { apiRequest, apiPost, ApiError } from '../../lib/api-client.ts'
import { useApi } from '../../lib/use-api.ts'
import { ErrorMessage } from '../error-message.tsx'
import { Button } from '../button.tsx'
import { Modale } from '../ui/modale.tsx'

type Catalogue = ReturnType<typeof WorkshopConfigurationsSchema.parse>
type Configuration = ReturnType<typeof WorkshopConfigurationSchema.parse>
type Flow = ReturnType<typeof ProductionFlowSchema.parse>
type Criterion = Configuration['schedulingCriteria'][number]
const field = 'rounded border border-slate-300 px-2 py-1'
function moved<T>(items: T[], index: number, offset: number) {
  const next = [...items]
  const target = index + offset
  if (target < 0 || target >= items.length) return items
  const item = next[index]
  const other = next[target]
  if (item === undefined || other === undefined) return items
  next[index] = other
  next[target] = item
  return next
}

// EX-ADM-NEW-005 — maquette Paramétrage : références persistantes, indépendantes du moteur gelé.
export function WorkshopConfigurationPanel({ machineRevision = 0 }: { machineRevision?: number }) {
  const { etat, recharger } = useApi(`admin-workshop-configurations-${machineRevision}`, (signal) =>
    apiRequest('GET', '/api/admin/workshop-configurations', {
      schema: WorkshopConfigurationsSchema,
      signal,
    }),
  )
  const [editing, setEditing] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  return (
    <section
      className="mt-6 space-y-3 rounded border bg-white p-5"
      aria-label="Configuration des ateliers"
    >
      <h2 className="text-lg font-semibold">Ateliers, formats, machines et gammes</h2>
      <p className="text-sm text-slate-600">
        Un atelier appartient à un site. Associez ses formats et ses machines, puis définissez sa
        gamme et l’ordre des critères d’ordonnancement.
      </p>
      <p className="text-sm text-amber-800">
        Ces paramètres sont enregistrés comme référentiel. Leur application au générateur et aux
        traitements de production reste à valider ; les traitements actuels sont conservés.
      </p>
      <Button onClick={recharger}>Actualiser les références</Button>
      {message && <p role="status">{message}</p>}
      {etat.kind === 'loading' && <p>Chargement des configurations…</p>}
      {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
      {etat.kind === 'ready' && (
        <>
          {etat.data.workshops.length === 0 ? (
            <p>Aucun atelier référencé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Associations et gammes configurées">
                <thead>
                  <tr className="border-b text-left">
                    <th>Site</th>
                    <th>Atelier</th>
                    <th>Mode</th>
                    <th>Formats</th>
                    <th>Machines</th>
                    <th>Gamme de fabrication</th>
                    <th>Critères d’ordonnancement</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {etat.data.workshops.map((workshop) => {
                    const config = etat.data.configurations.find(
                      (c) => c.workshopId === workshop.id,
                    )
                    return (
                      <tr key={workshop.id} className="border-b align-top">
                        <td className="p-2">{workshop.site}</td>
                        <td className="p-2">{workshop.label}</td>
                        <td className="p-2">
                          {config ? PRODUCTION_FLOW_LABELS[config.productionFlow] : 'À configurer'}
                        </td>
                        <td className="p-2">
                          {config?.formatIds
                            .map(
                              (id) =>
                                etat.data.formats.find((f) => f.id === id)?.label ??
                                `Référence indisponible (${id})`,
                            )
                            .join(', ') || 'Non renseignés'}
                        </td>
                        <td className="p-2">
                          {config?.machineIds
                            .map(
                              (id) =>
                                etat.data.machines.find((m) => m.id === id)?.label ??
                                `Référence indisponible (${id})`,
                            )
                            .join(', ') || 'Non renseignées'}
                        </td>
                        <td className="p-2">
                          {config?.productionSteps.length ? (
                            <ol>
                              {config.productionSteps.map((step, index) => (
                                <li key={index}>
                                  {index + 1}. {step.label} · {step.statusLabel}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            'Non renseignée'
                          )}
                        </td>
                        <td className="p-2">
                          {config?.schedulingCriteria.length ? (
                            <ol>
                              {config.schedulingCriteria.map((criterion, index) => (
                                <li key={criterion}>
                                  {index + 1}. {SCHEDULING_CRITERION_LABELS[criterion]}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            'Non renseignés'
                          )}
                        </td>
                        <td className="p-2">
                          <button
                            className="underline"
                            aria-label={`Configurer ${workshop.label} · ${workshop.site}`}
                            onClick={() => {
                              setEditing(workshop.id)
                            }}
                          >
                            Configurer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {editing !== null && (
            <WorkshopEditor
              key={editing}
              workshopId={editing}
              catalogue={etat.data}
              onClose={() => {
                setEditing(null)
              }}
              onSaved={() => {
                setEditing(null)
                setMessage('Configuration de l’atelier enregistrée.')
                recharger()
              }}
            />
          )}
        </>
      )}
    </section>
  )
}

function WorkshopEditor({
  workshopId,
  catalogue,
  onClose,
  onSaved,
}: {
  workshopId: number
  catalogue: Catalogue
  onClose: () => void
  onSaved: () => void
}) {
  const current = catalogue.configurations.find((c) => c.workshopId === workshopId)
  const [flow, setFlow] = useState<Flow | ''>(current?.productionFlow ?? '')
  const [formats, setFormats] = useState(current?.formatIds ?? [])
  const [machines, setMachines] = useState(current?.machineIds ?? [])
  const [steps, setSteps] = useState(current?.productionSteps ?? [])
  const [criteria, setCriteria] = useState<Criterion[]>(current?.schedulingCriteria ?? [])
  const [error, setError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const available = flow ? schedulingCriteriaFor(flow) : []
  const toggle = (values: number[], id: number) =>
    values.includes(id) ? values.filter((v) => v !== id) : [...values, id]
  const workshop = catalogue.workshops.find((w) => w.id === workshopId)
  return (
    <Modale
      titre={`Configurer ${workshop?.label ?? 'l’atelier'} · ${workshop?.site ?? ''}`}
      ouverte
      onOuverture={(open) => {
        if (!open && !saving) onClose()
      }}
      large
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          const parsed = WorkshopConfigurationInputSchema.safeParse({
            version: current?.version ?? 0,
            productionFlow: flow,
            formatIds: formats,
            machineIds: machines,
            productionSteps: steps,
            schedulingCriteria: criteria,
          })
          if (!parsed.success) {
            setError(
              new ApiError(400, {
                code: 'VALIDATION',
                message: parsed.error.issues.map((issue) => issue.message).join(' '),
              }),
            )
            return
          }
          setSaving(true)
          setError(null)
          void apiPost(`/api/admin/workshop-configurations/${workshopId}`, {
            body: parsed.data,
            schema: WorkshopConfigurationSchema,
          })
            .then(onSaved)
            .catch(setError)
            .finally(() => {
              setSaving(false)
            })
        }}
      >
        <label className="block">
          Mode de fabrication{' '}
          <select
            required
            className={field}
            value={flow}
            disabled={saving}
            onChange={(event) => {
              const value = ProductionFlowSchema.parse(event.target.value)
              setFlow(value)
              setCriteria((previous) =>
                previous.filter((criterion) => schedulingCriteriaFor(value).includes(criterion)),
              )
            }}
          >
            <option value="" disabled>
              Choisir un mode
            </option>
            {ProductionFlowSchema.options.map((value) => (
              <option key={value} value={value}>
                {PRODUCTION_FLOW_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <fieldset disabled={saving} className="space-y-2">
          <legend className="font-semibold">Formats</legend>
          {catalogue.formats.length === 0 && <p>Aucun format référencé.</p>}
          <div className="flex flex-wrap gap-3">
            {catalogue.formats.map((format) => (
              <label key={format.id}>
                <input
                  type="checkbox"
                  checked={formats.includes(format.id)}
                  onChange={() => {
                    setFormats(toggle(formats, format.id))
                  }}
                />{' '}
                {format.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={saving} className="space-y-2">
          <legend className="font-semibold">Machines de l’atelier</legend>
          {catalogue.machines.length === 0 && (
            <p>Aucune machine référencée. Ajoutez-la dans « Machines et fichiers ».</p>
          )}
          <div className="flex flex-wrap gap-3">
            {catalogue.machines.map((machine) => (
              <label key={machine.id}>
                <input
                  type="checkbox"
                  checked={machines.includes(machine.id)}
                  onChange={() => {
                    setMachines(toggle(machines, machine.id))
                  }}
                />{' '}
                {machine.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={saving} className="space-y-2">
          <legend className="font-semibold">Gamme de fabrication</legend>
          <p className="text-sm text-slate-600">
            Étapes et libellés de statut de référence, dans l’ordre. Aucune transition
            opérationnelle n’est modifiée.
          </p>
          {steps.length === 0 && <p>Aucune étape renseignée.</p>}
          {steps.map((step, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <span>{index + 1}.</span>
              <input
                required
                maxLength={200}
                className={field}
                aria-label={`Étape ${index + 1}`}
                placeholder="Étape"
                value={step.label}
                onChange={(event) => {
                  setSteps(
                    steps.map((s, j) => (j === index ? { ...s, label: event.target.value } : s)),
                  )
                }}
              />
              <input
                required
                maxLength={100}
                className={field}
                aria-label={`Statut de l’étape ${index + 1}`}
                placeholder="Libellé du statut"
                value={step.statusLabel}
                onChange={(event) => {
                  setSteps(
                    steps.map((s, j) =>
                      j === index ? { ...s, statusLabel: event.target.value } : s,
                    ),
                  )
                }}
              />
              <button
                type="button"
                disabled={index === 0}
                aria-label={`Monter l’étape ${index + 1}`}
                onClick={() => {
                  setSteps(moved(steps, index, -1))
                }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === steps.length - 1}
                aria-label={`Descendre l’étape ${index + 1}`}
                onClick={() => {
                  setSteps(moved(steps, index, 1))
                }}
              >
                ↓
              </button>
              <button
                type="button"
                className="underline"
                aria-label={`Retirer l’étape ${index + 1}`}
                onClick={() => {
                  setSteps(steps.filter((_, j) => j !== index))
                }}
              >
                Retirer
              </button>
            </div>
          ))}
          <Button
            type="button"
            disabled={steps.length >= 50}
            onClick={() => {
              setSteps([...steps, { label: '', statusLabel: '' }])
            }}
          >
            Ajouter une étape
          </Button>
        </fieldset>
        <fieldset disabled={saving} className="space-y-2">
          <legend className="font-semibold">Critères d’ordonnancement par priorité</legend>
          {flow === 'BUS' && (
            <p>
              Les critères Bus ne sont pas définis dans les spécifications ; aucun ordre n’est
              imposé.
            </p>
          )}
          {criteria.length === 0 && <p>Aucun critère renseigné.</p>}
          <ol>
            {criteria.map((criterion, index) => (
              <li key={criterion} className="flex items-center gap-3">
                <span>
                  {index + 1}. {SCHEDULING_CRITERION_LABELS[criterion]}
                </span>
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={`Monter ${SCHEDULING_CRITERION_LABELS[criterion]}`}
                  onClick={() => {
                    setCriteria(moved(criteria, index, -1))
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === criteria.length - 1}
                  aria-label={`Descendre ${SCHEDULING_CRITERION_LABELS[criterion]}`}
                  onClick={() => {
                    setCriteria(moved(criteria, index, 1))
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setCriteria(criteria.filter((c) => c !== criterion))
                  }}
                >
                  Retirer <span className="sr-only">{SCHEDULING_CRITERION_LABELS[criterion]}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            {available
              .filter((criterion) => !criteria.includes(criterion))
              .map((criterion) => (
                <Button
                  key={criterion}
                  type="button"
                  onClick={() => {
                    setCriteria([...criteria, criterion])
                  }}
                >
                  Ajouter « {SCHEDULING_CRITERION_LABELS[criterion]} »
                </Button>
              ))}
          </div>
        </fieldset>
        {error !== null && <ErrorMessage error={error} />}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving || flow === ''}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button type="button" disabled={saving} onClick={onClose}>
            Annuler
          </Button>
        </div>
      </form>
    </Modale>
  )
}
