// EX-TRA-START-001 : exécuter le CLI JavaScript évite les shims .cmd et tout shell Windows.
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { delimiter, dirname, resolve } from 'node:path'

// Version de pnpm du projet (`packageManager` de la racine).
const PNPM_VERSION = /^pnpm@(.+)$/.exec(
  JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'))
    .packageManager ?? '',
)?.[1]

function parNpx(npx, args) {
  return { command: process.execPath, args: [npx, '--yes', `pnpm@${PNPM_VERSION}`, ...args] }
}

export function commandePnpm(args, env = process.env, platform = process.platform) {
  const cli = env.npm_execpath
  if (cli && /(?:^|[/\\])pnpm\.(?:c?js|mjs)$/i.test(cli) && existsSync(cli)) {
    return { command: process.execPath, args: [cli, ...args] }
  }
  // pnpm natif (pnpm 11+ : exécutable autonome), lancé directement, sans shell.
  if (cli && /(?:^|[/\\])pnpm(?:\.exe)?$/i.test(cli) && existsSync(cli)) {
    return { command: cli, args }
  }
  // `npm install` / `npm start` sans pnpm global : pnpm du projet par le npx livré avec npm (sans shim .cmd).
  const npx =
    cli && /(?:^|[/\\])npm-cli\.js$/i.test(cli) ? resolve(dirname(cli), 'npx-cli.js') : null
  if (npx && PNPM_VERSION && existsSync(npx)) return parNpx(npx, args)
  const path = Object.entries(env).find(([key]) => key.toLowerCase() === 'path')?.[1] ?? ''
  for (const dir of path.split(platform === 'win32' ? ';' : delimiter).filter(Boolean)) {
    const candidats =
      platform === 'win32'
        ? [
            resolve(dir, 'node_modules/pnpm/bin/pnpm.cjs'),
            resolve(dir, 'node_modules/corepack/dist/pnpm.js'),
          ]
        : [resolve(dir, 'pnpm')]
    for (const candidat of candidats) {
      if (!existsSync(candidat)) continue
      const fichier = realpathSync(candidat)
      if (/\.(?:c?js|mjs)$/i.test(fichier))
        return { command: process.execPath, args: [fichier, ...args] }
    }
  }
  if (platform !== 'win32') return { command: 'pnpm', args }
  // Windows sans pnpm dans le PATH : npx installé avec Node (dossier de node.exe).
  const npxNode = resolve(dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js')
  if (PNPM_VERSION && existsSync(npxNode)) return parNpx(npxNode, args)
  throw new Error(
    'pnpm introuvable. Installez-le avec npm.cmd install -g pnpm@12.14.0, puis lancez pnpm.cmd start depuis le dossier du projet.',
  )
}

export function commandeArretWindows(pid, env = process.env) {
  // taskkill reçoit uniquement un PID attribué par Node, jamais une commande utilisateur.
  return {
    command: resolve(env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'),
    args: ['/pid', String(pid), '/T', '/F'],
  }
}
