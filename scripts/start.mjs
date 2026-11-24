// Démarrage de l'application en UNE commande (pnpm start:all) : base de dev + API + web.
// Étapes : .env (copié de .env.example si absent) -> ports libres -> migrations -> référentiels
// -> utilisateurs de dev (un par rôle) -> API + web. Ctrl+C arrête tout.
// Options : --user=<identifiant> (identité envoyée par le relais web, défaut dev.coord),
//           --api-port=<n> --web-port=<n> --admin-port=<n> (ports préférés), --no-seed (ne touche pas aux données).
// Données (Q-437) : si un dossier d'export de Circé est configuré (--import=<dossier> ou CIRCE_EXPORT_DIR, dans .env ou
// l'environnement ; voir apps/api/scripts/export-circe.ts), la base de dev porte les DONNÉES REPRISES de Circé
// (import:circe, une seule fois sur une base vide), plus les JDD fictifs des seuls concepts sans source réelle (Bus,
// J-3, non-conformités : seed:centres comme socle, puis seed:news) sur des plateformes « … (JDD) » distinctes ;
// --demo ajoute le JDD+ (seed:scenarios), --sans-jdd n'ajoute aucun JDD fictif. Sans dossier d'export : comportement
// historique (JDD fictifs complets sur Wissous / Nîmes / Nanterre, --no-demo pour s'en passer).
// Base livrée (Q-446) : si apps/api/prisma/dev.db est absent, il est restauré depuis apps/api/prisma/donnees/dev.sqlite.gz
// (copie versionnée de la base de dev alimentée par la reprise) ; la base porte alors les données reprises, comme avec
// un dossier d'export, sans relancer l'import.
// Base de DÉVELOPPEMENT uniquement (apps/api/prisma/dev.db), jamais la base de test. Q-001 : pas d'auth réelle.
import { commandePnpm, commandeArretWindows } from './pnpm-process.mjs'
import { spawn, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  renameSync,
} from 'node:fs'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(racine)
const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.split('=')[1]
const drapeau = (nom) => process.argv.includes(`--${nom}`)

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env')
  console.log('• .env créé à partir de .env.example')
}
const env = {}
for (const l of readFileSync('.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())
  if (m) env[m[1]] = m[2]
}
if (env.NODE_ENV === 'production') {
  console.error('Refusé : NODE_ENV=production (fournisseur d’identité de dev, Q-001).')
  process.exit(1)
}
if (!(env.DATABASE_URL ?? '').includes('dev.db')) {
  console.error(`Refusé : DATABASE_URL (${env.DATABASE_URL}) ne vise pas la base de dev (dev.db).`)
  process.exit(1)
}

const dossierExport = arg('import') ?? process.env.CIRCE_EXPORT_DIR ?? env.CIRCE_EXPORT_DIR ?? null
if (dossierExport && !existsSync(resolve(dossierExport, 'export.json'))) {
  console.error(
    `Dossier d'export de Circé introuvable ou incomplet : ${dossierExport} (pnpm --filter @circe/api export:circe).`,
  )
  process.exit(1)
}
if (dossierExport) console.log(`• Données reprises de Circé : ${dossierExport}`)

const baseDev = resolve('apps/api/prisma/dev.db')
const baseLivree = resolve('apps/api/prisma/donnees/dev.sqlite.gz')
if (!existsSync(baseDev) && existsSync(baseLivree) && !drapeau('no-seed')) {
  console.log(
    '\n▶ Base de dev restaurée depuis apps/api/prisma/donnees/dev.sqlite.gz (premier démarrage)',
  )
  await pipeline(createReadStream(baseLivree), createGunzip(), createWriteStream(`${baseDev}.tmp`))
  renameSync(`${baseDev}.tmp`, baseDev)
}
// Données reprises : export configuré, ou base livrée (déjà alimentée : l'import ne serait pas relancé).
const donneesReprises = dossierExport !== null || existsSync(baseLivree)

const libre = (port) =>
  new Promise((ok) => {
    const s = createServer()
    s.once('error', () => ok(false))
    s.once('listening', () => s.close(() => ok(true)))
    s.listen(port, '127.0.0.1')
  })
async function premierLibre(depart, interdits = []) {
  for (let p = depart; p < depart + 100; p++) {
    if (!interdits.includes(p) && (await libre(p))) return p
  }
  throw new Error(`Aucun port libre à partir de ${depart}`)
}
const apiPort = await premierLibre(Number(arg('api-port') ?? env.API_PORT ?? 3001))
const webPort = await premierLibre(Number(arg('web-port') ?? env.WEB_PORT ?? 3000), [apiPort])
const adminPort = await premierLibre(Number(arg('admin-port') ?? env.ADMIN_PORT ?? 9180), [
  apiPort,
  webPort,
])
console.log(`• Sondes techniques : http://127.0.0.1:${adminPort}/healthz/live et /healthz/ready`)
const utilisateur = arg('user') ?? env.DEV_IDENTITY_USER ?? 'dev.coord'
if (apiPort !== Number(env.API_PORT ?? 3001) || webPort !== Number(env.WEB_PORT ?? 3000)) {
  console.log(
    `• Ports habituels occupés : API ${apiPort}, web ${webPort} (le fichier .env n'est pas modifié)`,
  )
}

function etape(titre, args) {
  console.log(`\n▶ ${titre}`)
  const cmd = commandePnpm(args)
  const r = spawnSync(cmd.command, cmd.args, { stdio: 'inherit', env: process.env })
  if (r.error) console.error(r.error.message)
  if (r.status !== 0) {
    console.error(`✖ Échec : pnpm ${args.join(' ')}`)
    process.exit(r.status ?? 1)
  }
}
if (!existsSync('node_modules/.modules.yaml'))
  etape('Installation des dépendances', ['install', '--frozen-lockfile'])
etape('Base de dev : migrations', ['db:up'])
etape('Client de base de données', ['--filter', '@circe/api', 'exec', 'prisma', 'generate'])
if (!drapeau('no-seed')) {
  etape('Référentiels (rôles, paramètres, types)', ['seed:ref'])
  if (dossierExport)
    etape(`Reprise des données de Circé (${dossierExport}) si la base est vide`, [
      '--filter',
      '@circe/api',
      'import:circe',
      dossierExport,
      '--si-base-vide',
    ])
  for (const role of ['coord', 'cheq', 'recep', 'expe', 'admin', 'com']) {
    etape(`Utilisateur de dev dev.${role}`, ['dev:user', `dev.${role}`, role])
  }
  if (donneesReprises) {
    // Q-437 : données reprises de Circé ; les JDD fictifs vont sur des plateformes « … (JDD) » (jdd-centres.ts).
    process.env.JDD_SUFFIXE_CENTRES = process.env.JDD_SUFFIXE_CENTRES || '(JDD)'
    if (!drapeau('sans-jdd')) {
      etape('JDD fictifs (socle des centres « (JDD) »)', ['seed:centres'])
      etape('JDD fictifs sans source réelle : Bus, J-3, non-conformités', ['seed:news'])
      if (drapeau('demo'))
        etape('JDD+ : réception, pilotage, non-conformités et formats 2 m²', ['seed:scenarios'])
    }
  } else if (!drapeau('no-demo')) {
    // JDD sur les trois centres métier ; les plateformes techniques restent réservées aux tests E2E.
    etape('JDD Wissous, Nîmes et Nanterre, profils par centre', ['seed:centres'])
    etape('JDD nouvelles spécifications : Bus, J-3, non-conformités', ['seed:news'])
    etape('JDD+ : réception, pilotage, non-conformités et formats 2 m²', ['seed:scenarios'])
  }
}

const enfants = []
const lancer = (nom, args, extra) => {
  const cmd = commandePnpm(args)
  const p = spawn(cmd.command, cmd.args, { stdio: 'inherit', env: { ...process.env, ...extra } })
  p.on('error', (error) => {
    console.error(`✖ ${nom} : ${error.message}`)
    arreter(1)
  })
  p.on('exit', (code) => {
    console.log(`\n${nom} arrêté (code ${code ?? 'signal'})`)
    arreter(code ?? 0)
  })
  enfants.push(p)
}
let arrete = false
function arreter(code) {
  if (arrete) return
  arrete = true
  for (const p of enfants) {
    if (process.platform === 'win32' && p.pid) {
      const cmd = commandeArretWindows(p.pid)
      spawnSync(cmd.command, cmd.args, { stdio: 'ignore' })
    } else p.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 500)
}
process.on('SIGINT', () => arreter(0))
process.on('SIGTERM', () => arreter(0))

const urlApi = `http://127.0.0.1:${apiPort}`
console.log('\n▶ Démarrage API + web (Ctrl+C pour tout arrêter)')
lancer('API', ['--filter', '@circe/api', 'dev'], {
  API_PORT: String(apiPort),
  ADMIN_PORT: String(adminPort),
})
lancer(
  'Web',
  [
    '--filter',
    '@circe/web',
    'exec',
    'vite',
    'dev',
    '--port',
    String(webPort),
    '--strictPort',
    '--host',
    '127.0.0.1',
  ],
  {
    API_URL: urlApi,
    WEB_PORT: String(webPort),
    DEV_IDENTITY_USER: utilisateur,
    ...(env.DEV_IDENTITY_SECRET ? { DEV_IDENTITY_SECRET: env.DEV_IDENTITY_SECRET } : {}),
  },
)

let pret = false
for (let i = 0; i < 120 && !arrete; i++) {
  try {
    const [a, w] = await Promise.all([
      fetch(`${urlApi}/api/health`, { signal: AbortSignal.timeout(3000) }),
      fetch(`http://127.0.0.1:${webPort}/`, { signal: AbortSignal.timeout(3000) }),
    ])
    if (a.ok && w.ok) {
      pret = true
      console.log(
        `\n✔ Application prête : http://127.0.0.1:${webPort}  (API ${urlApi}, identité ${utilisateur})`,
      )
      console.log(
        '  Autres profils : relancer avec --user=dev.recep | dev.cheq | dev.expe | dev.admin | dev.com',
      )
      break
    }
  } catch {
    // pas encore prêt
  }
  await new Promise((r) => setTimeout(r, 1000))
}

if (!pret && !arrete) {
  console.error('✖ Démarrage incomplet : consultez les erreurs API/web ci-dessus.')
  arreter(1)
}
