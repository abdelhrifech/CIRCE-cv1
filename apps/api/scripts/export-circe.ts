// Q-437 / Q-438 (TRANCHÉES le 2026-11-24) : export en CSV de la copie de la base réelle CIRCE (conteneur Docker SQL
// Server), pour alimenter la base de DEV (`import-circe.ts`). LECTURE SEULE ABSOLUE : chaque requête envoyée est un
// `SELECT` (garde-fou `selectSeul`), jamais d'écriture, de DDL, de BACKUP ni de RESTORE.
// Les fichiers sont écrits HORS du dépôt (refus sinon) : les données réelles n'entrent jamais dans git.
//
// Usage : CIRCE_SQL_PASSWORD=… pnpm --filter @circe/api export:circe [dossier]
//   dossier : défaut CIRCE_EXPORT_DIR, sinon ~/circe-export.
//   Variables : CIRCE_SQL_CONTAINER (circe-sql), CIRCE_SQL_USER (sa), CIRCE_SQL_DB (CIRCE), DOCKER_BIN (docker sur le
//   PATH, sinon l'exécutable de Docker Desktop macOS). Le mot de passe passe par l'environnement (jamais en argument).
//
// Format des fichiers `<table>.csv` (UTF-8) : 1re ligne = noms des colonnes, puis une ligne par enregistrement ;
// séparateur = caractère de contrôle US (0x1F), absent des données (vérifié) ; `\N` = NULL ; dates en ISO 8601
// (CONVERT 126, heure locale de SQL Server, sans fuseau) ; retours chariot, sauts de ligne et tabulations des textes
// remplacés par une espace ; espaces de fin des textes retirées (colonnes char(n)) ; binaires remplacés par leur taille
// (colonne `<nom>__octets`) ; rowversion non exportée.
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { createInterface } from 'node:readline'

export const SEPARATEUR = '\x1f'
export const NUL = '\\N'

/** Tables reprises ou utiles à la reprise (rapports A et B de docs/_travail/base-reelle-2026-11-24). */
export const TABLES_EXPORT = [
  // Référentiels
  'tr_plateforme',
  'tr_atelier',
  'tr_categorie_support',
  'Surface',
  'Transaco_Surface_Format',
  'tr_type_preparation',
  'TypePreparation',
  'tr_instruction_plus',
  'tr_jour_depart',
  'tr_parametre_alternance',
  'tr_imprimeur',
  'tr_transposteur_reception',
  'tr_rouleur',
  'tr_destinataire',
  'tr_dest_adresse',
  'tr_ate_dest_trans',
  'tr_type_destination',
  'tr_transporteur',
  'tr_trans_tarif',
  'tr_format_colis',
  'tr_statut',
  // Réception
  'photo',
  'livraison',
  'affiche',
  'asso_livraison_affiche',
  'asso_livraison_photo',
  'mouvement',
  'Activite',
  'tf_prepa_affiche',
  'tf_dossier_semaine_depart',
  'tf_prepa_Broadcast',
  // Coordination / production / expédition
  'instruction_train',
  'instruction_visuels',
  'instruction_detail',
  'tf_face_train',
  'tf_repart_calcul',
  'tf_UM',
  'tf_UM_colis',
  'tf_colis',
] as const

const racineDepot = resolve(import.meta.dirname, '../../..')

/** Vrai si `chemin` est dans le dépôt git (les données réelles doivent rester dehors, Q-438). */
export function dansLeDepot(chemin: string): boolean {
  const r = relative(racineDepot, resolve(chemin))
  return r === '' || (!r.startsWith('..') && !r.startsWith('/'))
}

const MOTS_INTERDITS =
  /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|EXEC|EXECUTE|BACKUP|RESTORE|TRUNCATE|GRANT|REVOKE|DENY|INTO|SHUTDOWN|DBCC|KILL|RECONFIGURE|OPENROWSET|BULK)\b/i

/** Garde-fou de la lecture seule : la requête est un unique SELECT (identifiants entre crochets ignorés). */
export function selectSeul(sql: string): string {
  const sansIdentifiants = sql.replace(/\[[^\]]*\]/g, '[]').replace(/'[^']*'/g, "''")
  if (!/^SET NOCOUNT ON; SELECT /i.test(sql) || MOTS_INTERDITS.test(sansIdentifiants))
    throw new Error(`Requête refusée (lecture seule) : ${sql.slice(0, 120)}`)
  return sql
}

interface Colonne {
  nom: string
  type: string
}

/** Expression SQL Server qui rend la colonne en texte (NULL → `\N`), ou null si la colonne n'est pas exportée. */
export function expression(c: Colonne): { alias: string; sql: string } | null {
  const col = `[${c.nom.replace(/]/g, ']]')}]`
  const t = c.type.toLowerCase()
  let sql: string
  let alias = c.nom
  if (t === 'timestamp' || t === 'rowversion') return null
  if (['binary', 'varbinary', 'image'].includes(t)) {
    sql = `CONVERT(varchar(30), DATALENGTH(${col}))`
    alias = `${c.nom}__octets`
  } else if (['date', 'datetime', 'smalldatetime', 'datetime2', 'datetimeoffset'].includes(t))
    sql = `CONVERT(varchar(40), ${col}, 126)`
  else if (['float', 'real'].includes(t))
    sql = `CONVERT(varchar(60), CAST(${col} AS decimal(38, 6)))`
  else if (['char', 'varchar', 'nchar', 'nvarchar', 'text', 'ntext'].includes(t))
    sql = `RTRIM(REPLACE(REPLACE(REPLACE(CAST(${col} AS nvarchar(max)), CHAR(13), ' '), CHAR(10), ' '), CHAR(9), ' '))`
  else sql = `CONVERT(varchar(60), ${col})`
  return { alias, sql: `ISNULL(${sql}, '${NUL}')` }
}

function dockerBin(): string {
  if (process.env['DOCKER_BIN']) return process.env['DOCKER_BIN']
  const surLePath = spawnSync('docker', ['--version'], { stdio: 'ignore' })
  return surLePath.status === 0
    ? 'docker'
    : '/Applications/Docker.app/Contents/Resources/bin/docker'
}

function argsSqlcmd(sql: string): string[] {
  return [
    'exec',
    '-e',
    'SQLCMDPASSWORD',
    process.env['CIRCE_SQL_CONTAINER'] ?? 'circe-sql',
    '/opt/mssql-tools18/bin/sqlcmd',
    '-S',
    '127.0.0.1',
    '-U',
    process.env['CIRCE_SQL_USER'] ?? 'sa',
    '-d',
    process.env['CIRCE_SQL_DB'] ?? 'CIRCE',
    '-C',
    '-b',
    '-y',
    '0',
    '-f',
    'o:65001',
    '-Q',
    selectSeul(sql),
  ]
}

/** Exécute un SELECT d'une seule colonne et renvoie ses lignes (petits résultats). */
function lireLignes(sql: string): string[] {
  const r = spawnSync(dockerBin(), argsSqlcmd(sql), {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (r.status !== 0) throw new Error(`sqlcmd en échec : ${r.stderr || r.stdout}`)
  return r.stdout.split('\n').filter((l) => l.trim() !== '')
}

/** Exécute un SELECT d'une seule colonne et écrit ses lignes dans le flux, en vérifiant le nombre de champs. */
async function exporterVers(
  sql: string,
  fichier: string,
  entete: string[],
): Promise<{ lignes: number; malFormees: number }> {
  const sortie = createWriteStream(fichier, { encoding: 'utf8' })
  sortie.write(entete.join(SEPARATEUR) + '\n')
  const p = spawn(dockerBin(), argsSqlcmd(sql), { stdio: ['ignore', 'pipe', 'pipe'] })
  let erreur = ''
  p.stderr.on('data', (d: Buffer) => (erreur += d.toString('utf8')))
  // Écouteur posé avant la lecture : la fin du processus peut précéder la fin du flux lu.
  const fin = new Promise<number | null>((ok) => p.on('close', ok))
  let lignes = 0
  let malFormees = 0
  const lecteur = createInterface({ input: p.stdout, crlfDelay: Infinity })
  for await (const l of lecteur) {
    if (l.trim() === '') continue
    if (l.split(SEPARATEUR).length !== entete.length) malFormees++
    lignes++
    if (!sortie.write(l + '\n'))
      await new Promise<void>((ok) =>
        sortie.once('drain', () => {
          ok()
        }),
      )
  }
  const code = await fin
  await new Promise<void>((ok) => sortie.end(ok))
  if (code !== 0) throw new Error(`sqlcmd en échec (${fichier}) : ${erreur}`)
  return { lignes, malFormees }
}

async function principal() {
  if (!process.env['SQLCMDPASSWORD'] && process.env['CIRCE_SQL_PASSWORD'])
    process.env['SQLCMDPASSWORD'] = process.env['CIRCE_SQL_PASSWORD']
  if (!process.env['SQLCMDPASSWORD']) {
    console.error('Mot de passe SQL Server absent : définir CIRCE_SQL_PASSWORD.')
    process.exit(1)
  }
  const dossier = resolve(
    process.argv[2] ?? process.env['CIRCE_EXPORT_DIR'] ?? join(homedir(), 'circe-export'),
  )
  if (dansLeDepot(dossier)) {
    console.error(
      `Refus : ${dossier} est dans le dépôt ; les données réelles restent hors dépôt (Q-438).`,
    )
    process.exit(1)
  }
  mkdirSync(dossier, { recursive: true })
  const debut = Date.now()

  const liste = TABLES_EXPORT.map((t) => `'${t}'`).join(', ')
  const colonnes = new Map<string, Colonne[]>()
  for (const l of lireLignes(
    `SET NOCOUNT ON; SELECT CONCAT_WS('|', TABLE_NAME, COLUMN_NAME, DATA_TYPE) FROM INFORMATION_SCHEMA.COLUMNS ` +
      `WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME IN (${liste}) ORDER BY TABLE_NAME, ORDINAL_POSITION`,
  )) {
    const [table = '', nom = '', type = ''] = l.split('|')
    colonnes.set(table, [...(colonnes.get(table) ?? []), { nom, type }])
  }

  const bilan: Record<string, { lignes: number; source: number }> = {}
  for (const table of TABLES_EXPORT) {
    const cols = colonnes.get(table)
    if (!cols) throw new Error(`Table absente de la base source : ${table}`)
    const exprs = cols
      .map(expression)
      .filter((e): e is { alias: string; sql: string } => e !== null)
    const textes = cols.filter((c) =>
      ['char', 'varchar', 'nchar', 'nvarchar', 'text', 'ntext'].includes(c.type.toLowerCase()),
    )
    // Contrôle du séparateur et du marqueur NULL : aucun texte ne doit les contenir.
    if (textes.length) {
      const cond = textes
        .map(
          (c) =>
            `CAST([${c.nom}] AS nvarchar(max)) LIKE N'%' + NCHAR(31) + N'%' OR CAST([${c.nom}] AS nvarchar(max)) = N'${NUL}'`,
        )
        .join(' OR ')
      const [n = '0'] = lireLignes(
        `SET NOCOUNT ON; SELECT CONVERT(varchar(20), COUNT(*)) FROM [dbo].[${table}] WHERE ${cond}`,
      )
      if (n.trim() !== '0')
        throw new Error(
          `${table} : ${n.trim()} texte(s) contiennent le séparateur 0x1F ou « \\N » : export refusé.`,
        )
    }
    const [source = '0'] = lireLignes(
      `SET NOCOUNT ON; SELECT CONVERT(varchar(20), COUNT(*)) FROM [dbo].[${table}]`,
    )
    const ordre = cols[0] ? `[${cols[0].nom}]` : '1'
    const sql =
      `SET NOCOUNT ON; SELECT CONCAT_WS(CHAR(31), ${exprs.map((e) => e.sql).join(', ')}) ` +
      `FROM [dbo].[${table}] ORDER BY ${ordre}`
    const r = await exporterVers(
      sql,
      join(dossier, `${table}.csv`),
      exprs.map((e) => e.alias),
    )
    if (r.malFormees > 0)
      throw new Error(`${table} : ${r.malFormees} ligne(s) au mauvais nombre de champs.`)
    if (r.lignes !== Number(source))
      throw new Error(`${table} : ${r.lignes} lignes exportées pour ${source.trim()} en source.`)
    bilan[table] = { lignes: r.lignes, source: Number(source) }
    console.log(`${table.padEnd(28)} ${String(r.lignes).padStart(8)} lignes`)
  }
  const info = lireLignes(
    `SET NOCOUNT ON; SELECT CONCAT_WS('=', [cle], [valeur]) FROM [export_meta].[info]`,
  )
  writeFileSync(
    join(dossier, 'export.json'),
    JSON.stringify(
      {
        exporteLe: new Date().toISOString(),
        separateur: '0x1F',
        nul: NUL,
        tables: bilan,
        source: info,
      },
      null,
      2,
    ),
  )
  console.log(`Export terminé en ${((Date.now() - debut) / 1000).toFixed(1)} s dans ${dossier}`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  if (!existsSync(racineDepot)) process.exit(1)
  await principal()
}
