import { buildApp } from './app.ts'
import { loadConfig } from './core/config.ts'
import { createDb } from './core/db.ts'
import { creerMailPort } from './core/ports/mail.ts'
import { demarrerOrdonnanceur } from './modules/taches/service.ts'
import { BroadcastNonConfigure } from './core/ports/broadcast.ts'
import { demarrerPlanificateur } from './modules/coordination/integration-broadcast.ts'

const config = loadConfig()
const db = createDb(config.DATABASE_URL)
// Q-005 : aucune source Broadcast réelle ; le planificateur (RG-COO-103) ne démarre que si elle est configurée.
const broadcast = new BroadcastNonConfigure()
const mail = creerMailPort(config)
const app = buildApp({ config, db, broadcast, mail, closeDb: () => db.$disconnect() })
// D-20 (Q-410) : ordonnanceur interne, désactivable (ORDONNANCEUR_ACTIF=false) ; sans horaire configuré il n'exécute rien.
const arreterOrdonnanceur =
  config.ORDONNANCEUR_ACTIF === 'true'
    ? demarrerOrdonnanceur({ db, mail }, (message, erreur) => {
        app.log.error({ err: erreur }, message)
      })
    : () => undefined
const arreterPlanificateur = demarrerPlanificateur({ db, broadcast }, (message, erreur) => {
  app.log.error({ err: erreur }, message)
})
app.addHook('onClose', () => {
  arreterPlanificateur()
  arreterOrdonnanceur()
  return Promise.resolve()
})

async function stop(signal: string): Promise<void> {
  app.log.info({ signal }, 'Arrêt demandé')
  await app.close()
  process.exit(0)
}
process.on('SIGINT', () => void stop('SIGINT'))
process.on('SIGTERM', () => void stop('SIGTERM'))

await app.listen({ host: config.API_HOST, port: config.API_PORT })
