// Contrôle reproductible de la mission hors Réception/Coordination (20–21/11/2026).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const baseline = JSON.parse(
  readFileSync(resolve(root, 'docs-resources/analysis/GEL-MISSION-2026-11-20.json'), 'utf8'),
)
const hash = (value) => createHash('sha256').update(value).digest('hex')
const changes = []
for (const [path, expected] of Object.entries(baseline.fichiers)) {
  try {
    if (hash(readFileSync(resolve(root, path))) !== expected) changes.push(path)
  } catch {
    changes.push(path)
  }
}
const schema = readFileSync(resolve(root, 'apps/api/prisma/schema.prisma'), 'utf8')
const blocks = new Map(
  [...schema.matchAll(/^(model|enum) (\w+) \{.*?^\}/gms)].map((match) => [
    match[2],
    hash(match[0]),
  ]),
)
for (const [name, expected] of Object.entries(baseline.blocsPrisma)) {
  if (blocks.get(name) !== expected) changes.push(`Prisma : ${name}`)
}
if (changes.length) {
  console.error('Gel non respecté :', changes)
  process.exitCode = 1
} else {
  console.log(
    `${Object.keys(baseline.fichiers).length} fichiers et ${Object.keys(baseline.blocsPrisma).length} blocs Prisma existants inchangés.`,
  )
}
