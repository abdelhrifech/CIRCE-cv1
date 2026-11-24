import { createFileRoute } from '@tanstack/react-router'
import { SuiviAtelierQuerySchema } from '@circe/shared'
import { requirePermission } from '../../lib/session.ts'
import { ProductionDashboard } from '../../components/pilotage/dashboard.tsx'
import { WorkshopDashboard } from '../../components/pilotage/workshop-dashboard.tsx'
export const Route = createFileRoute('/pilotage/suivi')({
  validateSearch: SuiviAtelierQuerySchema,
  beforeLoad: requirePermission('instruction.consulter'),
  component: Page,
})
function Page() {
  const query = Route.useSearch()
  return query.pour ? (
    <WorkshopDashboard
      key={`${query.pour}|${query.dossier ?? ''}|${query.depart ?? ''}`}
      pour={query.pour}
      dossier={query.dossier}
      depart={query.depart}
    />
  ) : (
    <ProductionDashboard
      key={`${query.dossier ?? ''}|${query.depart ?? ''}`}
      dossier={query.dossier}
      depart={query.depart}
    />
  )
}
