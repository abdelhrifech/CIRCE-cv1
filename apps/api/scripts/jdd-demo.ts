// Jeux de données de DÉMONSTRATION dans la base de DEV, pour essayer tous les scénarios dans l'application
// (`pnpm jdd:demo [--seed=<1..999>] [--volume=<n>] [--scenarios=a,b]`). Réutilise les générateurs reproductibles de
// `test/jdd` (mêmes services métier, mêmes statuts : réceptions, contrôles, inconnues, dossiers, instructions, trains,
// export, colisage, colis) avec la base de dev comme cible, SANS purge. Données fictives, même seed = mêmes données.
// Ensuite, les utilisateurs dev.* reçoivent le périmètre de tous les sites générés. Refuse toute base autre que dev.db.
// Arrêtez l'application (Ctrl+C sur `pnpm start:all`) avant de lancer : SQLite n'accepte qu'un écrivain à la fois.
import { chargerEnvDev, executerJdd } from '../test/jdd/run.ts'
import { createDb } from '../src/core/db.ts'

/** Familles à alimentation utile en démonstration (les familles de rejets ne laissent pas de données exploitables). */
const SCENARIOS_DEMO = [
  'nominal',
  'statuts',
  'incomplet',
  'limites',
  'profils',
  'inter-modules',
  'aleatoire',
  'demo',
]

function lireArgs(argv: string[]) {
  const o: Record<string, string> = {}
  for (const a of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a)
    if (m?.[1]) o[m[1]] = m[2] ?? 'true'
  }
  return o
}

const args = lireArgs(process.argv.slice(2))
chargerEnvDev()
const seed = Number(args['seed'] ?? 7)
const volume = Number(args['volume'] ?? 60)
const scenarios = args['scenarios']?.split(',').filter(Boolean) ?? SCENARIOS_DEMO

const db = createDb(process.env['DATABASE_URL'] ?? '')
try {
  // Idempotence : les n° de dossier d'une seed tiennent dans une plage propre à (seed mod 9) (cf. `creerJdd`).
  const bas = 100_000 + (seed % 9) * 100_000
  const deja = await db.dossier.count({ where: { contNum: { gt: bas, lte: bas + 99_999 } } })
  if (deja > 0 && args['force'] !== 'true') {
    console.log(
      `Données de démo de la seed ${String(seed)} déjà présentes (${String(deja)} dossiers) : rien à faire. ` +
        'Choisissez une autre seed (--seed=8) ou --force.',
    )
    process.exit(0)
  }
  const avant = (await db.plateforme.findMany({ select: { id: true } })).map((p) => p.id)

  const rapport = await executerJdd({ seed, volume, scenarios, purge: false, cible: 'dev' })
  console.log(
    `seed=${String(seed)} volume=${String(volume)} : ${String(rapport.totalEnregistrements)} enregistrements en ${String(rapport.dureeMs)} ms`,
  )
  for (const s of rapport.scenarios)
    console.log(
      `  ${s.nom.padEnd(16)} ${String(s.dureeMs).padStart(7)} ms  ${Object.entries(s.compteurs)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ')}`,
    )

  // Sites générés : nom lisible, puis périmètre des utilisateurs dev.* (l'administrateur voit déjà tout).
  const nouveaux = await db.plateforme.findMany({
    where: { id: { notIn: avant } },
    orderBy: { id: 'asc' },
  })
  for (const p of nouveaux)
    await db.plateforme.update({
      where: { id: p.id },
      data: { nom: `Démo ${String(p.id)} · ${p.nom}` },
    })
  const plateformes = await db.plateforme.findMany({ select: { id: true } })
  const devs = await db.utilisateur.findMany({
    where: { identifiantExterne: { startsWith: 'dev.' } },
    select: { id: true, identifiantExterne: true },
  })
  for (const u of devs) {
    const existants = new Set(
      (await db.utilisateurPerimetre.findMany({ where: { utilisateurId: u.id } })).map(
        (l) => `${String(l.plateformeId)}:${String(l.atelierId)}`,
      ),
    )
    for (const p of plateformes)
      if (!existants.has(`${String(p.id)}:null`))
        await db.utilisateurPerimetre.create({ data: { utilisateurId: u.id, plateformeId: p.id } })
  }
  console.log(
    `${String(nouveaux.length)} site(s) de démo créé(s) ; périmètre de ${String(devs.length)} utilisateur(s) dev.* étendu à ${String(plateformes.length)} plateformes.`,
  )
  const echecs = rapport.scenarios.flatMap((s) => s.verifications.filter((v) => !v.ok))
  for (const v of echecs)
    console.error(`  KO [${v.scenario}] ${v.nom} : attendu ${v.attendu}, obtenu ${v.obtenu}`)
  if (echecs.length > 0) process.exitCode = 1
} finally {
  await db.$disconnect()
}
