// `npm install` à la racine (postinstall) : installe tout le monorepo avec pnpm (version de `packageManager`), sans
// pnpm global ni shim .cmd (Windows). npm n'a installé que les outils de la racine ; pnpm reprend `node_modules` à sa
// façon (purge sans question). Sous pnpm (`pnpm install` lance aussi ce postinstall), ne fait rien.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
if (!(process.env.npm_config_user_agent ?? '').startsWith('npm/')) process.exit(0)

const version = /^pnpm@(.+)$/.exec(
  JSON.parse(readFileSync(resolve(racine, 'package.json'), 'utf8')).packageManager ?? '',
)?.[1]
const npx = resolve(dirname(process.env.npm_execpath ?? ''), 'npx-cli.js')
if (!version || !existsSync(npx)) {
  console.error('Installation : npx introuvable. Installez pnpm puis lancez « pnpm install ».')
  process.exit(1)
}
// Les variables npm_* de npm fausseraient la configuration de pnpm.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.toLowerCase().startsWith('npm_')),
)
console.log(`\n▶ Installation du projet avec pnpm ${version}`)
const r = spawnSync(
  process.execPath,
  [
    npx,
    '--yes',
    `pnpm@${version}`,
    'install',
    '--frozen-lockfile',
    '--config.confirm-modules-purge=false',
  ],
  { cwd: racine, stdio: 'inherit', env },
)
if (r.error) console.error(r.error.message)
process.exit(r.status ?? 1)
