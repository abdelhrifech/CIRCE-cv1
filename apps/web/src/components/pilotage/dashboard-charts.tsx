import type { Dashboard } from '@circe/shared'

export const PRODUCTION_STAGES = [
  { key: 'WAITING', label: 'En attente d’affiches', color: '#f9db7c', pattern: undefined },
  {
    key: 'READY',
    label: 'Prêt à produire',
    color: '#f7a35a',
    pattern: 'repeating-linear-gradient(45deg,transparent 0 5px,#0003 5px 6px)',
  },
  {
    key: 'PRODUCTION',
    label: 'En production / produit',
    color: '#e0607e',
    pattern: 'repeating-linear-gradient(0deg,transparent 0 5px,#0003 5px 6px)',
  },
  {
    key: 'PACKED',
    label: 'Colisé',
    color: '#9c3f8f',
    pattern: 'repeating-linear-gradient(90deg,transparent 0 5px,#fff4 5px 6px)',
  },
  { key: 'SHIPPED', label: 'Expédié', color: '#3b1a47', pattern: undefined },
  { key: 'UNKNOWN', label: 'Couverture non déterminée', color: '#64748b', pattern: undefined },
] as const
type Stages = Dashboard['workshops'][number]['stages']
export function ProductionBars({
  rows,
  label,
  onSelect,
}: {
  rows: { id: string; label: string; sub: string; stages: Stages }[]
  label: string
  onSelect?: (id: string) => void
}) {
  const totals = rows.map((r) => PRODUCTION_STAGES.reduce((n, s) => n + r.stages[s.key], 0))
  const maximum = Math.max(1, ...totals)
  return (
    <div aria-label={label} className="space-y-4">
      {!rows.length && (
        <p className="p-3 text-sm text-slate-600">Aucune unité dans ce périmètre.</p>
      )}
      {rows.map((row, i) => (
        <div
          key={row.id}
          className="grid gap-2 border-b border-slate-100 pb-3 sm:grid-cols-[11rem_1fr]"
        >
          <div>
            {onSelect ? (
              <button
                type="button"
                className="text-left font-semibold underline underline-offset-2"
                onClick={() => {
                  onSelect(row.id)
                }}
              >
                {row.label}
              </button>
            ) : (
              <strong>{row.label}</strong>
            )}
            <p className="text-xs text-slate-600">{row.sub}</p>
          </div>
          <div>
            <div
              className="flex min-h-6 overflow-hidden rounded bg-slate-50"
              aria-hidden="true"
              style={{ width: `${((totals[i] ?? 0) / maximum) * 100}%` }}
            >
              {PRODUCTION_STAGES.map(
                (s) =>
                  row.stages[s.key] > 0 && (
                    <span
                      key={s.key}
                      title={`${s.label} : ${row.stages[s.key]}`}
                      style={{
                        width: `${(row.stages[s.key] / (totals[i] || 1)) * 100}%`,
                        backgroundColor: s.color,
                        backgroundImage: s.pattern,
                      }}
                    />
                  ),
              )}
            </div>
            <p className="mt-1 text-xs">
              {totals[i]} unité(s) ·{' '}
              {PRODUCTION_STAGES.filter((s) => row.stages[s.key] > 0)
                .map((s) => `${s.label} : ${row.stages[s.key]}`)
                .join(' · ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
export function StageLegend() {
  return (
    <ul aria-label="Légende des étapes" className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
      {PRODUCTION_STAGES.map((s) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-5 rounded-sm"
            style={{ backgroundColor: s.color, backgroundImage: s.pattern }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  )
}
