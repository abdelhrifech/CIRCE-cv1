// MNT-012 : vérifie que les messages de commit suivent Conventional Commits 1.0.0, sans dépendance.
// Usage : node scripts/verifier-commits.mjs [plage]   (défaut : origin/main..HEAD ; « --tout » pour tout l'historique)
import { spawnSync } from 'node:child_process'

const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
]
const FORMAT = new RegExp(`^(${TYPES.join('|')})(\\([\\w./-]+\\))?!?: \\S.*$`)

const arg = process.argv[2]
const plage = arg === '--tout' ? 'HEAD' : (arg ?? 'origin/main..HEAD')
const r = spawnSync('git', ['log', '--no-merges', '--format=%H%x1f%s', plage], { encoding: 'utf8' })
if (r.status !== 0) {
  console.error(r.stderr.trim() || `git log ${plage} a échoué`)
  process.exit(2)
}
const commits = r.stdout
  .split('\n')
  .filter(Boolean)
  .map((l) => l.split('\x1f'))
const fautifs = commits.filter(([, sujet]) => !FORMAT.test(sujet ?? ''))
for (const [sha, sujet] of fautifs) console.error(`✖ ${sha?.slice(0, 7)} ${sujet}`)
console.log(`${commits.length} commit(s) vérifié(s), ${fautifs.length} non conforme(s) (${plage}).`)
process.exit(fautifs.length > 0 ? 1 : 0)
