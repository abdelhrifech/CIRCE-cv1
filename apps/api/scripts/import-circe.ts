// Q-437 / Q-438 (TRANCHÉES le 2026-11-24) : reprise, dans la base de DEV, des données de la copie de la base réelle
// CIRCE (CSV produits par `export-circe.ts`, hors dépôt). Méthode : docs/_travail/base-reelle-2026-11-24/
// (00-SYNTHESE, A-referentiels-reception, B-coordination-production : correspondance colonne par colonne, contrôles
// du §8 bis). Les identifiants de Circé sont conservés partout où le modèle le permet.
//
// RÈGLES MÉTIER (CLAUDE.md §7.4) : rien n'est « corrigé ». Une ligne réelle qui viole une règle cible est REJETÉE et
// comptée dans le rapport (motif + RG), avec ses dépendances (rejet en cascade des clés étrangères). Les champs V2
// sans source reçoivent la valeur par défaut du modèle ou une valeur marquée HYPOTHÈSE (question citée).
//
// Usage : pnpm --filter @circe/api import:circe [dossier des CSV] [--si-base-vide] (défaut CIRCE_EXPORT_DIR, sinon
// ~/circe-export).
// Base de DEV uniquement (apps/api/prisma/dev.db) ; refus d'une base qui contient déjà des données métier (pas de
// second passage : repartir d'une base propre, `pnpm db:up && pnpm seed:ref`). Rapport écrit dans le dossier des CSV.
import { createReadStream, existsSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { createDb, optimiserStatistiques, type Db } from '../src/core/db.ts'
import type {
  Prisma,
  SourceLigne,
  StatutAffiche,
  StatutInstruction,
  StatutLigneAttendue,
  StatutProduction,
  TypeMouvement,
} from '../src/generated/prisma/client.ts'
import { normaliserTheme } from '../src/modules/coordination/validation-admin.ts'
import { attenduDe, statutLigneDe } from '../src/modules/reception/lignes.ts'
import { TYPES_PREPARATION_REF } from '../src/reference/seed-ref.ts'
import { NUL, SEPARATEUR, dansLeDepot } from './export-circe.ts'

// ───────────────────────────── Garde-fous ─────────────────────────────

process.loadEnvFile(resolve(import.meta.dirname, '../../../.env'))
const url = process.env['DATABASE_URL'] ?? ''
const baseDev = resolve(import.meta.dirname, '../prisma/dev.db')
if (
  process.env['NODE_ENV'] === 'production' ||
  !url.startsWith('file:') ||
  resolve(import.meta.dirname, '..', url.slice(5)) !== baseDev
) {
  console.error(`Refus : ${url} n'est pas la base de dev (apps/api/prisma/dev.db).`)
  process.exit(1)
}
const dossierCsv = resolve(
  process.argv.slice(2).find((a) => !a.startsWith('--')) ??
    process.env['CIRCE_EXPORT_DIR'] ??
    join(homedir(), 'circe-export'),
)
/** --si-base-vide (scripts/start.mjs) : une base déjà alimentée n'est pas une erreur, l'import est simplement sauté. */
const siBaseVide = process.argv.includes('--si-base-vide')
if (dansLeDepot(dossierCsv)) {
  console.error(
    `Refus : ${dossierCsv} est dans le dépôt ; les CSV réels restent hors dépôt (Q-438).`,
  )
  process.exit(1)
}
if (!existsSync(join(dossierCsv, 'export.json'))) {
  console.error(`Dossier d'export introuvable ou incomplet : ${dossierCsv} (lancer export:circe).`)
  process.exit(1)
}

// ───────────────────────────── Lecture des CSV ─────────────────────────────

/** Une ligne de CSV : accès par nom de colonne (une colonne inconnue est une erreur de programmation). */
class Ligne {
  constructor(
    private readonly index: Map<string, number>,
    private readonly valeurs: string[],
    readonly table: string,
  ) {}
  v(colonne: string): string | null {
    const i = this.index.get(colonne)
    if (i === undefined) throw new Error(`${this.table} : colonne inconnue ${colonne}`)
    const x = this.valeurs[i]
    return x === undefined || x === NUL ? null : x
  }
}

async function* flux(table: string): AsyncGenerator<Ligne> {
  const lecteur = createInterface({
    input: createReadStream(join(dossierCsv, `${table}.csv`), { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })
  let index: Map<string, number> | null = null
  for await (const brute of lecteur) {
    if (brute === '') continue
    const champs = brute.split(SEPARATEUR)
    if (!index) {
      index = new Map(champs.map((c, i) => [c.charCodeAt(0) === 0xfeff ? c.slice(1) : c, i]))
      continue
    }
    if (champs.length !== index.size)
      throw new Error(`${table} : ligne au mauvais nombre de champs (${String(champs.length)})`)
    yield new Ligne(index, champs, table)
  }
}

async function tout(table: string): Promise<Ligne[]> {
  const res: Ligne[] = []
  for await (const l of flux(table)) res.push(l)
  return res
}

const ent = (v: string | null): number | null => {
  if (v === null || v.trim() === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`Nombre illisible : ${v}`)
  return Math.trunc(n)
}
const grand = (v: string | null): bigint | null =>
  v === null || v.trim() === '' ? null : BigInt(v.split('.')[0] ?? v)
const txt = (v: string | null): string | null => (v === null || v.trim() === '' ? null : v)
const bit = (v: string | null): boolean => v === '1'
const SENTINELLE = '0001-01-01'
/** HYPOTHÈSE (B §3.1) : dates naïves de SQL Server lues telles quelles en UTC (aucun décalage de jour ni de semaine). */
const date = (v: string | null): Date | null => {
  if (v === null || v.startsWith(SENTINELLE)) return null
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00Z` : `${v}Z`)
}

// ───────────────────────────── Rapport ─────────────────────────────

interface Rejet {
  table: string
  motif: string
  regle: string
  n: number
  exemples: string[]
}
const rejets = new Map<string, Rejet>()
/** Rejet tracé : `regle` = RG violée (ou décision Q-xxx quand la cible ne peut pas recevoir la donnée). */
function rejeter(table: string, motif: string, regle: string, id: unknown) {
  const cle = `${table}|${motif}`
  const r = rejets.get(cle) ?? { table, motif, regle, n: 0, exemples: [] }
  r.n++
  if (r.exemples.length < 5) r.exemples.push(String(id))
  rejets.set(cle, r)
}
/** Transformations notables (valeur par défaut, HYPOTHÈSE) : comptées, jamais silencieuses. */
const transformations = new Map<string, number>()
const noter = (motif: string, n = 1) =>
  transformations.set(motif, (transformations.get(motif) ?? 0) + n)
const volumes: Record<string, number> = {}
const durees: Record<string, number> = {}

const TAILLE = 400
async function inserer<T>(modele: string, lignes: T[], creer: (paquet: T[]) => Promise<unknown>) {
  for (let i = 0; i < lignes.length; i += TAILLE) await creer(lignes.slice(i, i + TAILLE))
  volumes[modele] = (volumes[modele] ?? 0) + lignes.length
}

/** Statuts `rpc_statut` de Circé = `tr_statut` 0..10 (A §3.13, B §2 ; Q-004) → enums V2. */
const STATUTS_PRODUCTION: readonly StatutProduction[] = [
  'A_TRAITER',
  'EN_COURS',
  'INSTRUCTION_OK',
  'ERREUR',
  'ANNULE',
  'A_IMPRIMER',
  'PREPARE',
  'A_EXPEDIER',
  'TERMINE',
  'EXPORT_PREPA',
  'AU_ROULAGE',
]
/** Instruction / visuel : codes 0..5 (5 « A imprimer » = PRET_A_PRODUIRE, B §2) ; ≥ 6 sans valeur d'enum. */
const STATUTS_INSTRUCTION: readonly StatutInstruction[] = [
  'A_TRAITER',
  'EN_COURS',
  'INSTRUCTION_OK',
  'ERREUR',
  'ANNULE',
  'PRET_A_PRODUIRE',
]
const statutProduction = (v: string | null) => STATUTS_PRODUCTION[ent(v) ?? -1] ?? null
const statutInstruction = (v: string | null) => STATUTS_INSTRUCTION[ent(v) ?? -1] ?? null

const db: Db = createDb(url)
const chrono = async <T>(etape: string, f: () => Promise<T>): Promise<T> => {
  const t = Date.now()
  const r = await f()
  durees[etape] = (Date.now() - t) / 1000
  console.log(`  ✓ ${etape} (${durees[etape].toFixed(1)} s)`)
  return r
}

try {
  const debut = Date.now()
  // Pas de second passage : la reprise exige une base sans données métier (référentiels de seed:ref seulement).
  const dejaLa = {
    plateformes: await db.plateforme.count(),
    dossiers: await db.dossier.count(),
    affiches: await db.affiche.count(),
    faces: await db.faceTrain.count(),
  }
  if (Object.values(dejaLa).some((n) => n > 0)) {
    if (siBaseVide) {
      console.log(
        `Base de dev déjà alimentée (${JSON.stringify(dejaLa)}) : reprise de Circé non relancée.`,
      )
      process.exit(0)
    }
    console.error(
      `Refus : la base de dev contient déjà des données (${JSON.stringify(dejaLa)}). ` +
        'Repartir d’une base propre : déplacer dev.db, puis pnpm db:up && pnpm seed:ref.',
    )
    process.exit(1)
  }
  if ((await db.role.count()) === 0) {
    console.error('Référentiels absents : lancer d’abord pnpm seed:ref.')
    process.exit(1)
  }
  console.log(`Reprise des données de Circé depuis ${dossierCsv}`)

  // ═════════════════════════ 1. Référentiels (A §3) ═════════════════════════

  const plateformes = new Map<number, { idSiteCcf: number | null; nom: string }>()
  const ateliers = new Map<number, number>() // ate_id → plt_id
  const supports = new Set<number>()
  const types = new Set<number>()
  const destinataires = new Set<number>()
  const rouleurs = new Set<number>()
  const jours = new Set<number>()
  const imprimeurs = new Map<string, number>()
  const livreurs = new Map<string, number>()
  const cleLibelle = (s: string) => s.trim().toUpperCase()

  await chrono('référentiels', async () => {
    // tr_plateforme (A §3.1) : id explicite.
    const pl: Prisma.PlateformeCreateManyInput[] = []
    for (const p of await tout('tr_plateforme')) {
      const id = ent(p.v('plt_id'))
      const nom = txt(p.v('plt_nom'))
      if (id === null || nom === null) {
        rejeter('tr_plateforme', 'identifiant ou nom absent', 'modèle Plateforme', id)
        continue
      }
      const idSiteCcf = ent(p.v('id_site_ccf'))
      plateformes.set(id, { idSiteCcf, nom })
      const creee = date(p.v('plt_dat_cre')) ?? new Date()
      pl.push({
        id,
        nom,
        adresse1: txt(p.v('plt_adr_1')),
        adresse2: txt(p.v('plt_adr_2')),
        codePostal: txt(p.v('plt_postal')),
        localite: txt(p.v('plt_localite')),
        telephone: txt(p.v('plt_tel')),
        mail: txt(p.v('plt_mail')),
        idSiteCcf,
        createdAt: creee,
        updatedAt: date(p.v('plt_dat_maj')) ?? creee,
      })
    }
    await inserer('Plateforme', pl, (d) => db.plateforme.createMany({ data: d }))

    // tr_atelier (A §3.2) : ate_type 1 → FIXE, 2 → SCROLL (schema.prisma:109). L'atelier 0 « inconnu » (ate_type 0)
    // n'a pas de valeur dans TypeAtelier (Q-442) : non chargé ; ses références deviennent « sans atelier » (NULL).
    const at: Prisma.AtelierCreateManyInput[] = []
    for (const a of await tout('tr_atelier')) {
      const id = ent(a.v('ate_id'))
      const plt = ent(a.v('plt_id'))
      const typeLegacy = ent(a.v('ate_type'))
      if (id === null || plt === null || !plateformes.has(plt)) {
        rejeter('tr_atelier', 'plateforme inconnue', 'FK tr_plateforme', id)
        continue
      }
      if (typeLegacy !== 1 && typeLegacy !== 2) {
        rejeter('tr_atelier', 'ate_type hors TypeAtelier (atelier « inconnu »)', 'Q-442', id)
        continue
      }
      ateliers.set(id, plt)
      const creee = date(a.v('ate_dat_cre')) ?? new Date()
      at.push({
        id,
        plateformeId: plt,
        libelle: (txt(a.v('ate_lib')) ?? `Atelier ${String(id)}`).replace(/\s+/g, ' '),
        codeAmt: ent(a.v('ate_code_amt')),
        type: typeLegacy === 2 ? 'SCROLL' : 'FIXE',
        createdAt: creee,
        updatedAt: date(a.v('ate_dat_maj')) ?? creee,
      })
    }
    await inserer('Atelier', at, (d) => db.atelier.createMany({ data: d }))

    // tr_categorie_support (A §3.3) : id explicite, y compris 0 « Support inconnu » (FK affiche.sup_id → 0).
    // est_deroulant = vue legacy v_support_scrolling (sup_id 26, 1026, 1027 ; Q-315).
    const DEROULANTS = new Set([26, 1026, 1027])
    const su: Prisma.CategorieSupportCreateManyInput[] = []
    for (const s of await tout('tr_categorie_support')) {
      const id = ent(s.v('sup_id'))
      if (id === null) continue
      supports.add(id)
      su.push({
        id,
        nom: txt(s.v('sup_nom')) ?? `Support ${String(id)}`,
        bandeaux: ent(s.v('sup_bandeaux')) ?? 0,
        poids: s.v('sup_poids'),
        qteUm: ent(s.v('sup_qte_UM')),
        reception: bit(s.v('reception')),
        estDeroulant: DEROULANTS.has(id),
      })
    }
    await inserer('CategorieSupport', su, (d) => db.categorieSupport.createMany({ data: d }))

    // Surface (A §3.4) : DIRECT.
    const sf: Prisma.SurfaceCreateManyInput[] = (await tout('Surface')).map((s) => {
      const creee = date(s.v('DateCreation')) ?? new Date()
      return {
        id: ent(s.v('IdSurface')) ?? 0,
        libelle: s.v('Libelle') ?? '',
        valeur: ent(s.v('Valeur')) ?? 0,
        createdAt: creee,
        updatedAt: date(s.v('DateModification')) ?? creee,
      }
    })
    await inserer('Surface', sf, (d) => db.surface.createMany({ data: d }))

    // Transaco_Surface_Format → CorrespondanceSupport (RG-COO-081). HYPOTHÈSE (A §3.5) : sup_id 0 = pas de
    // correspondance ; non chargé, pour que l'alimentation signale la référence manquante au lieu de produire des
    // lignes « Support inconnu ».
    const co: Prisma.CorrespondanceSupportCreateManyInput[] = []
    for (const c of await tout('Transaco_Surface_Format')) {
      const sup = ent(c.v('sup_id'))
      if (sup === null || sup === 0 || !supports.has(sup)) {
        noter(
          'CorrespondanceSupport : couple surface × format vers « Support inconnu » non chargé (A §3.5)',
        )
        continue
      }
      co.push({
        idSurface: ent(c.v('IdSurface')) ?? 0,
        idFormat: ent(c.v('IdFormat')) ?? 0,
        supportId: sup,
      })
    }
    await inserer('CorrespondanceSupport', co, (d) =>
      db.correspondanceSupport.createMany({ data: d }),
    )

    // tr_type_preparation (A §3.6, Q-441 OUVERTE). HYPOTHÈSE : l'espace d'identifiants repris est celui de Circé
    // (0..13), cible des clés de toutes les tables de faits (répartitions, UM, détails, visuels). Les types
    // applicatifs de seed:ref (2M2FIXE…, aucune donnée ne les référence sur une base propre) sont renumérotés après.
    const typesCirce = await tout('tr_type_preparation')
    const idsCirce = new Set(typesCirce.map((t) => ent(t.v('tpr_id'))).filter((x) => x !== null))
    const existants = await db.typePreparation.findMany()
    let prochain = Math.max(0, ...existants.map((t) => t.id), ...idsCirce) + 1
    const libellesSeed = new Set<string>(TYPES_PREPARATION_REF.map((t) => t.libelle))
    for (const t of existants.filter((x) => idsCirce.has(x.id))) {
      const refs =
        (await db.repartition.count({ where: { typePreparationId: t.id } })) +
        (await db.uniteManutention.count({ where: { typePreparationId: t.id } })) +
        (await db.instructionDetail.count({ where: { typePreparationId: t.id } })) +
        (await db.instructionVisuel.count({ where: { typePreparationId: t.id } })) +
        (await db.atelierDroitPrepa.count({ where: { typePreparationId: t.id } }))
      if (refs > 0 || !libellesSeed.has(t.libelle))
        throw new Error(`Type de préparation ${String(t.id)} déjà utilisé : reprise impossible.`)
      await db.$executeRaw`UPDATE "type_preparation" SET "id" = ${prochain} WHERE "id" = ${t.id}`
      noter(
        `Type applicatif de seed:ref « ${t.libelle} » renuméroté ${String(t.id)} → ${String(prochain)} (Q-441)`,
      )
      prochain++
    }
    const ty: Prisma.TypePreparationCreateManyInput[] = []
    for (const t of typesCirce) {
      const id = ent(t.v('tpr_id'))
      if (id === null) continue
      types.add(id)
      const creee = date(t.v('tpr_dat_cre')) ?? new Date()
      ty.push({
        id,
        libelle: txt(t.v('tpr_lib')) ?? `Type ${String(id)}`,
        createdAt: creee,
        updatedAt: date(t.v('tpr_dat_maj')) ?? creee,
      })
    }
    await inserer('TypePreparation', ty, (d) => db.typePreparation.createMany({ data: d }))

    // tr_instruction_plus (A §3.8) : codes 0..4 déjà posés par seed:ref (mêmes codes) ; seed:ref réécrit le libellé à
    // chaque passage, les libellés réels ne sont donc pas repris.
    const ip = await db.instructionPlus.findMany({ select: { code: true } })
    const manquants = (await tout('tr_instruction_plus'))
      .map((i) => ({ code: ent(i.v('tip_ins_code')) ?? -1, libelle: i.v('tip_ins_lib') ?? '' }))
      .filter((i) => !ip.some((x) => x.code === i.code))
    await inserer('InstructionPlus', manquants, (d) => db.instructionPlus.createMany({ data: d }))

    // tr_jour_depart, tr_parametre_alternance (A §3.8) : DIRECT.
    const jd: Prisma.JourDepartCreateManyInput[] = (await tout('tr_jour_depart')).map((j) => {
      const id = ent(j.v('jour_depart_id')) ?? 0
      jours.add(id)
      const creee = date(j.v('date_creation')) ?? new Date()
      return {
        id,
        libelle: j.v('libelle') ?? '',
        createdAt: creee,
        updatedAt: date(j.v('date_modification')) ?? creee,
      }
    })
    await inserer('JourDepart', jd, (d) => db.jourDepart.createMany({ data: d }))
    const pa: Prisma.ParametreAlternanceCreateManyInput[] = (
      await tout('tr_parametre_alternance')
    ).map((p) => ({
      id: ent(p.v('parametre_id')) ?? 0,
      code: p.v('code') ?? '',
      valeur: p.v('valeur') ?? '',
      description: txt(p.v('description')),
      estInclus: bit(p.v('est_inclus')),
      estActif: bit(p.v('est_actif')),
    }))
    await inserer('ParametreAlternance', pa, (d) => db.parametreAlternance.createMany({ data: d }))

    // tr_imprimeur / tr_transposteur_reception (A §3.9) : projection id + libellé (contacts non repris).
    for (const [table, cible] of [
      ['tr_imprimeur', imprimeurs],
      ['tr_transposteur_reception', livreurs],
    ] as const) {
      const lignes: { id: number; libelle: string }[] = []
      for (const l of await tout(table)) {
        const id = ent(l.v('id'))
        const libelle = txt(l.v('libelle'))
        if (id === null || libelle === null) {
          rejeter(table, 'libellé absent', 'modèle (libellé obligatoire)', id)
          continue
        }
        lignes.push({ id, libelle })
        if (!cible.has(cleLibelle(libelle))) cible.set(cleLibelle(libelle), id)
      }
      if (table === 'tr_imprimeur')
        await inserer('Imprimeur', lignes, (d) => db.imprimeur.createMany({ data: d }))
      else await inserer('Livreur', lignes, (d) => db.livreur.createMany({ data: d }))
    }

    // tr_destinataire (B §4.12) : colonnes reprises telles quelles. desId = des_id (ancienne clé AMT), desType = type
    // Circé, pexId = des_PexId : la divergence avec l'intégration V2 (QC-B-01, Q-442) est tracée, pas transformée.
    const de: Prisma.DestinataireCreateManyInput[] = []
    for (const d of await tout('tr_destinataire')) {
      const id = ent(d.v('dest_id'))
      if (id === null) continue
      destinataires.add(id)
      const creee = date(d.v('dest_dat_cre')) ?? new Date()
      de.push({
        id,
        nomOrigine:
          txt(d.v('dest_nom_ori')) ?? txt(d.v('dest_nom')) ?? `Destinataire ${String(id)}`,
        nom: txt(d.v('dest_nom')),
        actif: d.v('dest_actif') !== '0',
        dispatch: txt(d.v('dest_dispatch')),
        desId: grand(d.v('des_id')),
        desType: ent(d.v('des_type')),
        mail: txt(d.v('des_mail')),
        telephone: txt(d.v('des_NumTel')),
        pexId: ent(d.v('des_PexId')),
        createdAt: creee,
        updatedAt: date(d.v('dest_dat_maj')) ?? creee,
      })
    }
    await inserer('Destinataire', de, (d) => db.destinataire.createMany({ data: d }))

    // tr_dest_adresse (B §4.14) : adresse1 = n° + type de voie + voie ; adresse2 = cedex ; orphelins rejetés.
    const ad: Prisma.DestinataireAdresseCreateManyInput[] = []
    for (const a of await tout('tr_dest_adresse')) {
      const dest = ent(a.v('dest_id'))
      if (dest === null || !destinataires.has(dest)) {
        rejeter(
          'tr_dest_adresse',
          'destinataire absent (orphelin de la source)',
          'FK tr_destinataire',
          a.v('adr_id'),
        )
        continue
      }
      const creee = date(a.v('adr_dat_cre')) ?? new Date()
      const voie = [a.v('adr_num_voie'), a.v('adr_type_voie'), a.v('adr_voie')]
        .map((x) => txt(x)?.trim())
        .filter(Boolean)
        .join(' ')
      ad.push({
        destinataireId: dest,
        adresse1: voie || null,
        adresse2: txt(a.v('adr_cedex')),
        codePostal: txt(a.v('adr_code_postal')),
        localite: txt(a.v('adr_localite')),
        lieuDit: txt(a.v('adr_lieu_dit')),
        createdAt: creee,
        updatedAt: date(a.v('adr_dat_maj')) ?? creee,
      })
    }
    await inserer('DestinataireAdresse', ad, (d) => db.destinataireAdresse.createMany({ data: d }))

    // tr_ate_dest_trans → TransportDestinataire (RG-COO-120, B §4.11) : orphelins rejetés ; unicité (dest, atelier).
    const vus = new Set<string>()
    const td: Prisma.TransportDestinataireCreateManyInput[] = []
    for (const t of await tout('tr_ate_dest_trans')) {
      const dest = ent(t.v('dest_id'))
      const ate = ent(t.v('ate_id'))
      const cle = `${String(dest)}|${String(ate)}`
      if (dest === null || !destinataires.has(dest) || ate === null || !ateliers.has(ate)) {
        rejeter('tr_ate_dest_trans', 'destinataire ou atelier absent', 'FK', cle)
        continue
      }
      if (vus.has(cle)) {
        rejeter('tr_ate_dest_trans', 'doublon (destinataire, atelier)', 'RG-COO-120', cle)
        continue
      }
      vus.add(cle)
      td.push({
        destinataireId: dest,
        atelierId: ate,
        transporteur: ent(t.v('tsp_id')) ?? 0,
        tarif: t.v('tarif_code') ?? '',
      })
    }
    await inserer('TransportDestinataire', td, (d) =>
      db.transportDestinataire.createMany({ data: d }),
    )

    // tr_rouleur (B §4.16) : id explicite ; atelier « inconnu » → NULL.
    const ro: Prisma.RouleurCreateManyInput[] = []
    for (const r of await tout('tr_rouleur')) {
      const id = ent(r.v('rouleur_id'))
      if (id === null) continue
      const ate = ent(r.v('ate_id'))
      rouleurs.add(id)
      ro.push({
        id,
        atelierId: ate !== null && ateliers.has(ate) ? ate : null,
        nom: txt(r.v('rouleur_nom')) ?? `Rouleur ${String(id)}`,
        dateFin: date(r.v('rouleur_date_fin')),
      })
    }
    await inserer('Rouleur', ro, (d) => db.rouleur.createMany({ data: d }))
  })

  // Atelier « inconnu » (0) ou absent → NULL quand la colonne V2 est facultative (Q-442).
  const atelierOuNull = (v: string | null, table: string) => {
    const a = ent(v)
    if (a === null) return null
    if (ateliers.has(a)) return a
    noter(`${table} : atelier ${String(a)} non repris (« inconnu ») → sans atelier (Q-442)`)
    return null
  }
  const fk = (v: string | null, ensemble: Set<number>): number | null | undefined => {
    const n = ent(v)
    if (n === null) return null
    return ensemble.has(n) ? n : undefined
  }

  // ═════════════════════════ 2. Coordination / production (B §4) ═════════════════════════

  const instructionsGardees = new Set<string>()
  const visuelsGardes = new Set<number>()
  const umGardees = new Set<number>()
  const colisGardes = new Set<number>()

  // Dossiers (B §5) : n° de dossier distincts des tables de faits. Statut (RG-COO-063) : PREPARATION_RECUE quand la
  // copie Broadcast porte un groupe de préparation « Envoyé » pour ce dossier (condition de RG-COO-063) ; sinon
  // A_TRAITER (valeur par défaut du modèle). HYPOTHÈSE Q-442 : IdDossierDeVenteChapeau = cont_num.
  const annonceurs = new Map<number, string | null>()
  const envoyes = new Set<number>()
  const noterDossier = (n: number | null, annonceur: string | null) => {
    if (n === null || n <= 0) return
    if (!annonceurs.get(n)) annonceurs.set(n, annonceur)
  }
  const broadcast = await tout('tf_prepa_Broadcast')
  const instructions = await tout('instruction_train')
  for (const i of instructions) noterDossier(ent(i.v('cont_num')), txt(i.v('instr_annonceur')))
  for (const b of broadcast) {
    const n = ent(b.v('IdDossierDeVenteChapeau'))
    noterDossier(n, txt(b.v('Annonceur')))
    if (n !== null && b.v('StatutPreparation') === 'Envoyé') envoyes.add(n)
  }

  // Visuels lus avant les instructions : RG-COO-043 se vérifie sur leurs pourcentages.
  const visuels = await tout('instruction_visuels')
  const visuelsSource = new Set(visuels.map((v) => ent(v.v('insv_id'))))
  // RG-COO-043 (instruction-ok.ts:42-52) : Σ pourcentages = 100 pour chaque couple (support, type de préparation).
  const sommes = new Map<string, Map<string, number>>()
  for (const v of visuels) {
    const code = v.v('instr_code') ?? ''
    const m = sommes.get(code) ?? new Map<string, number>()
    const cle = `${String(ent(v.v('sup_id')))}|${String(ent(v.v('tpr_id')))}`
    m.set(cle, (m.get(cle) ?? 0) + Number(v.v('insv_pourcentage') ?? 0))
    sommes.set(code, m)
  }
  // Décision de l'utilisateur du 2026-11-24 (Q-445, ECART-127) : un couple dont les visuels totalisent 0 % (thèmes
  // non répartis dans Circé) est accepté à l'import ; tout autre total ≠ 100 % reste rejeté.
  const sommeAdmise = (s: number) => Math.abs(s - 100) < 1e-6 || Math.abs(s) < 1e-6
  const a100 = (code: string) => [...(sommes.get(code)?.values() ?? [])].every(sommeAdmise)

  await chrono('instructions, visuels', async () => {
    const ins: (Prisma.InstructionCreateManyInput & { contNum: number | null })[] = []
    for (const i of instructions) {
      const code = i.v('instr_code')
      const statut = statutInstruction(i.v('rpc_statut'))
      if (code === null || statut === null) {
        rejeter('instruction_train', 'statut hors StatutInstruction (0..5)', 'RG-COO-040', code)
        continue
      }
      // RG-COO-043 : une instruction validée (INSTRUCTION_OK) ou prête (PRET_A_PRODUIRE, passée par l'Instruction OK)
      // doit avoir une répartition des thèmes à 100 %.
      if ((statut === 'INSTRUCTION_OK' || statut === 'PRET_A_PRODUIRE') && !a100(code)) {
        rejeter(
          'instruction_train',
          'instruction validée : répartition des thèmes ≠ 100 %',
          'RG-COO-043',
          code,
        )
        continue
      }
      const tip = ent(i.v('tip_ins_code'))
      const creee = date(i.v('instr_dat_cre')) ?? new Date()
      instructionsGardees.add(code)
      ins.push({
        code,
        atelierId: atelierOuNull(i.v('ate_id'), 'instruction_train'),
        statut,
        tipInsCode: tip !== null && tip >= 0 && tip <= 4 ? tip : null,
        typeInstruction: txt(i.v('instr_type_instruction')),
        reseIdent: ent(i.v('rese_ident')),
        contNum: ent(i.v('cont_num')),
        annonceur: txt(i.v('instr_annonceur')),
        contAnbas: ent(i.v('cont_anbas')),
        contSembas: ent(i.v('cont_sembas')),
        commentaire: txt(i.v('instr_commentaire')),
        entretien: ent(i.v('instr_entretien')),
        commentExtPlay: txt(i.v('instr_CommentExtPlay')),
        conservation: ent(i.v('Conservation')),
        coteCote: ent(i.v('CoteCote')),
        // iokMode / iokParId / iokLe / exporteLe : aucune source (historique non exporté, Q-442) → NULL.
        createdAt: creee,
        updatedAt: date(i.v('instr_dat_maj')) ?? creee,
      })
    }
    // Dossiers des faits (collectés plus bas pour les autres tables) : ceux des instructions et de Broadcast d'abord.
    await creerDossiers()
    const parContNum = await mapDossiers()
    await inserer(
      'Instruction',
      ins.map((x) => ({
        ...x,
        dossierId: x.contNum !== null ? (parContNum.get(x.contNum) ?? null) : null,
      })),
      (d) => db.instruction.createMany({ data: d }),
    )
    noter(
      'Instruction : iokMode / exporteLe sans source → NULL (export des trains impossible, RG-COO-211, Q-442)',
      ins.length,
    )

    const vi: Prisma.InstructionVisuelCreateManyInput[] = []
    for (const v of visuels) {
      const id = ent(v.v('insv_id'))
      const code = v.v('instr_code')
      if (id === null || code === null || !instructionsGardees.has(code)) {
        rejeter(
          'instruction_visuels',
          'instruction rejetée ou absente (cascade)',
          'FK instruction_train',
          id,
        )
        continue
      }
      const sup = fk(v.v('sup_id'), supports)
      const tpr = fk(v.v('tpr_id'), types)
      if (sup === undefined || tpr === undefined) {
        rejeter('instruction_visuels', 'support ou type de préparation inconnu', 'FK', id)
        continue
      }
      let statut: StatutInstruction = 'A_TRAITER'
      if (v.v('rpc_statut') === null)
        noter('InstructionVisuel : statut NULL → A_TRAITER (valeur par défaut du modèle, QC-B-10)')
      else {
        const s = statutInstruction(v.v('rpc_statut'))
        if (s === null) {
          rejeter('instruction_visuels', 'statut hors StatutInstruction', 'RG-COO-040', id)
          continue
        }
        statut = s
      }
      const creee = date(v.v('insv_dat_cre')) ?? new Date()
      visuelsGardes.add(id)
      vi.push({
        id,
        instructionCode: code,
        supportId: sup,
        typePreparationId: tpr,
        statut,
        afchIdent: ent(v.v('insv_afch_ident')),
        theme: txt(v.v('insv_theme')),
        themeOri: txt(v.v('insv_theme_ori')),
        pourcentage: v.v('insv_pourcentage'),
        pourcentageOri: v.v('insv_pourcentage_ori'),
        createdAt: creee,
        updatedAt: date(v.v('insv_dat_maj')) ?? creee,
      })
    }
    await inserer('InstructionVisuel', vi, (d) => db.instructionVisuel.createMany({ data: d }))
  })

  // Dossiers : créés en deux temps (instructions + Broadcast, puis les autres faits) ; un dossier n'est jamais doublé.
  async function creerDossiers() {
    const existants = new Set(
      (await db.dossier.findMany({ select: { contNum: true } })).map((d) => d.contNum),
    )
    const nouveaux = [...annonceurs].filter(([n]) => !existants.has(n))
    await inserer(
      'Dossier',
      nouveaux.map(([contNum, annonceur]) => ({
        contNum,
        annonceur,
        statut: envoyes.has(contNum) ? ('PREPARATION_RECUE' as const) : ('A_TRAITER' as const),
      })),
      (d) => db.dossier.createMany({ data: d }),
    )
  }
  async function mapDossiers() {
    return new Map(
      (await db.dossier.findMany({ select: { id: true, contNum: true } })).map((d) => [
        d.contNum,
        d.id,
      ]),
    )
  }

  await chrono('détails d’instruction', async () => {
    let paquet: Prisma.InstructionDetailCreateManyInput[] = []
    const vider = async () => {
      await inserer('InstructionDetail', paquet, (d) =>
        db.instructionDetail.createMany({ data: d }),
      )
      paquet = []
    }
    for await (const d of flux('instruction_detail')) {
      const id = ent(d.v('insd_id'))
      const code = d.v('instr_code')
      if (id === null || code === null || !instructionsGardees.has(code)) {
        rejeter(
          'instruction_detail',
          'instruction rejetée ou absente (cascade)',
          'FK instruction_train',
          id,
        )
        continue
      }
      const sup = fk(d.v('sup_id'), supports)
      const tpr = fk(d.v('tpr_id'), types)
      if (sup === undefined || tpr === undefined) {
        rejeter('instruction_detail', 'support ou type de préparation inconnu', 'FK', id)
        continue
      }
      const creee = date(d.v('insd_dat_cre')) ?? new Date()
      paquet.push({
        id,
        instructionCode: code,
        cadrIdent: ent(d.v('insd_cadr_ident')),
        cadreLib: txt(d.v('insd_cadre_lib')),
        supportId: sup,
        typePreparationId: tpr,
        afchIdent: ent(d.v('insd_afch_ident')),
        theme: txt(d.v('insd_theme')),
        repiquageIdent: ent(d.v('insd_repiquage_ident')),
        repiquage: txt(d.v('insd_repiquage')),
        type: txt(d.v('insd_type')),
        createdAt: creee,
        updatedAt: date(d.v('ins_dat_maj')) ?? creee,
      })
      if (paquet.length >= 4000) await vider()
    }
    await vider()
  })

  // Faces (B §4.4) : lues en flux (≈ 389 000), insérées par paquets.
  await chrono('faces de train', async () => {
    let paquet: Prisma.FaceTrainCreateManyInput[] = []
    const vider = async () => {
      await inserer('FaceTrain', paquet, (d) => db.faceTrain.createMany({ data: d }))
      paquet = []
    }
    for await (const f of flux('tf_face_train')) {
      const id = ent(f.v('ft_id'))
      const code = f.v('instr_code')
      if (id === null || code === null || !instructionsGardees.has(code)) {
        rejeter(
          'tf_face_train',
          'instruction rejetée ou absente (cascade)',
          'FK instruction_train',
          id,
        )
        continue
      }
      const statut = statutProduction(f.v('rpc_statut'))
      if (statut === null) {
        rejeter('tf_face_train', 'statut hors StatutProduction', 'RG-COO-200', id)
        continue
      }
      const dateDepart = date(f.v('rdep_datdep'))
      const cadrIdent = ent(f.v('cadr_ident'))
      if (dateDepart === null || cadrIdent === null) {
        rejeter('tf_face_train', 'date de départ ou cadre absent', 'modèle FaceTrain', id)
        continue
      }
      const dest = fk(f.v('dest_id'), destinataires)
      const sup = fk(f.v('sup_id'), supports)
      const rou = fk(f.v('rouleur_id'), rouleurs)
      const jour = fk(f.v('IdJourDepart'), jours)
      if (dest === undefined || sup === undefined || rou === undefined || jour === undefined) {
        rejeter('tf_face_train', 'destinataire, support, rouleur ou jour inconnu', 'FK', id)
        continue
      }
      // B §4.4 : 1 108 faces pointent vers un visuel absent de la source → sans visuel (clé V2 facultative ; 31 145
      // faces n'ont déjà aucun visuel en source). Même traitement, compté à part, pour un visuel d'une AUTRE
      // instruction rejetée (la face et son instruction sont valides ; aucune règle n'exige un visuel).
      let visuelId = ent(f.v('insv_id'))
      if (visuelId !== null && !visuelsGardes.has(visuelId)) {
        noter(
          visuelsSource.has(visuelId)
            ? 'FaceTrain : visuel d’une instruction rejetée (RG-COO-043) → sans visuel'
            : 'FaceTrain : visuel absent de la source → sans visuel (B §4.4)',
        )
        visuelId = null
      }
      const creee = date(f.v('ft_dat_cre')) ?? new Date()
      paquet.push({
        id,
        instructionCode: code,
        visuelId,
        destinataireId: dest,
        statut,
        atelierId: atelierOuNull(f.v('ate_id'), 'tf_face_train'),
        supportId: sup,
        rouleurId: rou,
        jourDepartId: jour,
        cadrIdent,
        cadreLib: txt(f.v('cadre_lib')),
        dateDepart,
        contNum: ent(f.v('cont_num')),
        contAnnonc: txt(f.v('cont_annonc')),
        contSembas: ent(f.v('cont_sembas')),
        contAnbas: ent(f.v('cont_anbas')),
        depSembas: ent(f.v('dep_sembas')),
        depAnbas: ent(f.v('dep_anbas')),
        trainId: txt(f.v('train_id')),
        train: ent(f.v('train')),
        rang: ent(f.v('rang')),
        ordrePropose: ent(f.v('ordre_propose')),
        ordreReel: ent(f.v('ordre_reel')),
        ordreCalcule: ent(f.v('ordre_calcule')),
        ordreReelInitial: ent(f.v('ordre_reel_initial')),
        theme: txt(f.v('theme')),
        themeId: ent(f.v('theme_id')),
        repiquage: txt(f.v('repiquage')),
        repiquageId: ent(f.v('repiquage_id')),
        ftType: txt(f.v('ft_type')),
        // B §3.2 : `version` réelle = version du train (RG-COO-067), jamais le verrou optimiste.
        versionTrain: ent(f.v('version')),
        preAssemblage: bit(f.v('pre_assemblage')),
        conservation: ent(f.v('Conservation')),
        coteCote: ent(f.v('CoteCote')),
        colisId: ent(f.v('colis_id')),
        refPanel: txt(f.v('RefPanel')),
        afficheurId: ent(f.v('pers_ident')),
        afficheurNom: txt(f.v('pers_nom')),
        emplSectCode: ent(f.v('empl_sect_code')),
        emplDepaCode: txt(f.v('empl_depa_code')),
        commNumord: ent(f.v('comm_numord')),
        emplNumord: ent(f.v('empl_numord')),
        emplAdresse1: txt(f.v('empl_addresse1')),
        createdAt: creee,
        updatedAt: date(f.v('ft_dat_maj')) ?? creee,
      })
      if (paquet.length >= 4000) await vider()
    }
    await vider()
  })

  // UM, répartitions, colis, UM × colis (B §4.5 à 4.8).
  await chrono('UM, répartitions, colis', async () => {
    const ums = await tout('tf_UM')
    const reps = await tout('tf_repart_calcul')
    const colis = await tout('tf_colis')
    const liens = await tout('tf_UM_colis')
    for (const r of reps) noterDossier(ent(r.v('cont_num')), txt(r.v('rpc_annonceur')))
    for (const u of ums) noterDossier(ent(u.v('cont_num')), txt(u.v('UM_annonceur')))

    // RG-COO-264 (colis.ts:726, HYPOTHÈSE Q-197 (6)) : Σ uc_qte ≤ UM_qte.
    const place = new Map<number, number>()
    for (const l of liens) {
      const u = ent(l.v('UM_id'))
      if (u !== null) place.set(u, (place.get(u) ?? 0) + (ent(l.v('uc_qte')) ?? 0))
    }
    const atelierUm = new Map<number, number | null>()
    const destUm = new Map<number, number | null>()
    const um: Prisma.UniteManutentionCreateManyInput[] = []
    for (const u of ums) {
      const id = ent(u.v('UM_id'))
      const statut = statutProduction(u.v('rpc_statut'))
      if (id === null || statut === null) {
        rejeter('tf_UM', 'statut hors StatutProduction', 'RG-COO-261', id)
        continue
      }
      const qte = ent(u.v('UM_qte'))
      if ((place.get(id) ?? 0) > (qte ?? 0)) {
        rejeter('tf_UM', 'quantité placée en colis (Σ uc_qte) > quantité de l’UM', 'RG-COO-264', id)
        continue
      }
      const tpr = fk(u.v('tpr_id'), types)
      const sup = fk(u.v('sup_id'), supports)
      const dest = fk(u.v('dest_id'), destinataires)
      if (tpr === undefined || sup === undefined || dest === undefined) {
        rejeter('tf_UM', 'type, support ou destinataire inconnu', 'FK', id)
        continue
      }
      const creee = date(u.v('UM_dat_cre')) ?? new Date()
      const atelierId = atelierOuNull(u.v('ate_id'), 'tf_UM')
      umGardees.add(id)
      atelierUm.set(id, atelierId)
      destUm.set(id, dest)
      um.push({
        id,
        typePreparationId: tpr,
        atelierId,
        supportId: sup,
        destinataireId: dest,
        statut,
        semNum: ent(u.v('sem_num')),
        semAnnee: ent(u.v('sem_annee')),
        repartition: grand(u.v('UM_repartition')),
        annonceur: txt(u.v('UM_annonceur')),
        theme: txt(u.v('UM_theme')),
        repiquage: txt(u.v('UM_Repiquage')),
        numAfficheAmt: grand(u.v('UM_num_aff_amt')),
        qte,
        contNum: ent(u.v('cont_num')),
        poids: u.v('UM_poids'),
        codeBarre: txt(u.v('UM_code_barre')),
        codeSynthese: txt(u.v('UM_code_synthese')),
        commentaire: txt(u.v('UM_comment')),
        dateAffichage: date(u.v('UM_date_aff')),
        createdAt: creee,
        updatedAt: date(u.v('UM_dat_maj')) ?? creee,
      })
    }
    await inserer('UniteManutention', um, (d) => db.uniteManutention.createMany({ data: d }))

    const rp: Prisma.RepartitionCreateManyInput[] = []
    for (const r of reps) {
      const id = ent(r.v('rpc_id'))
      const statut = statutProduction(r.v('rpc_statut'))
      if (id === null || statut === null) {
        rejeter('tf_repart_calcul', 'statut hors StatutProduction', 'RG-COO-262', id)
        continue
      }
      const unite = ent(r.v('UM_id'))
      if (unite !== null && !umGardees.has(unite)) {
        rejeter('tf_repart_calcul', 'UM rejetée ou absente (cascade)', 'FK tf_UM', id)
        continue
      }
      const tpr = fk(r.v('tpr_id'), types)
      const sup = fk(r.v('sup_id'), supports)
      const dest = fk(r.v('dest_id'), destinataires)
      if (tpr === undefined || sup === undefined || dest === undefined) {
        rejeter('tf_repart_calcul', 'type, support ou destinataire inconnu', 'FK', id)
        continue
      }
      const creee = date(r.v('rpc_dat_cre')) ?? new Date()
      rp.push({
        id,
        supportId: sup,
        atelierId: atelierOuNull(r.v('ate_id'), 'tf_repart_calcul'),
        typePreparationId: tpr,
        destinataireId: dest,
        uniteId: unite,
        statut,
        semNum: ent(r.v('sem_num')),
        semAnnee: ent(r.v('sem_annee')),
        desId: grand(r.v('des_id')),
        desType: ent(r.v('des_type')),
        desTypeAdr: ent(r.v('des_type_adr')),
        type: ent(r.v('rpc_type')),
        repartition: grand(r.v('rpc_repartition')),
        annonceur: txt(r.v('rpc_annonceur')),
        theme: txt(r.v('rpc_theme')),
        repiquage: txt(r.v('rpc_repiquage')),
        repiquageId: ent(r.v('rpc_repiquageId')),
        numAfficheAmt: grand(r.v('rpc_num_aff_amt')),
        qte: ent(r.v('rpc_qte')),
        dateAffichage: date(r.v('rpc_dat_aff')),
        contNum: ent(r.v('cont_num')),
        numeroReception: txt(r.v('numeroReception')),
        retire: r.v('rpc_retire') === 'O',
        idPreparationDetail: ent(r.v('IdPreparationDetail')),
        // idGroupePreparation : absent de la source (QC-B-06) → NULL.
        createdAt: creee,
        updatedAt: date(r.v('rpc_dat_maj')) ?? creee,
      })
    }
    await inserer('Repartition', rp, (d) => db.repartition.createMany({ data: d }))

    // Colis : plateforme = plateforme de l'atelier (B §4.8) ; adresse figée non modélisée.
    const atelierColis = new Map<number, number>()
    const destColis = new Map<number, number>()
    const co: Prisma.ColisCreateManyInput[] = []
    for (const c of colis) {
      const id = ent(c.v('colis_id'))
      const ate = ent(c.v('ate_id'))
      const dest = ent(c.v('dest_id'))
      const statut = statutProduction(c.v('rpc_statut'))
      const plt = ate !== null ? ateliers.get(ate) : undefined
      if (id === null || statut === null) {
        rejeter('tf_colis', 'statut hors StatutProduction', 'RG-COO-266', id)
        continue
      }
      if (ate === null || plt === undefined || dest === null || !destinataires.has(dest)) {
        rejeter('tf_colis', 'atelier ou destinataire inconnu', 'FK', id)
        continue
      }
      const creee = date(c.v('colis_dat_cre')) ?? new Date()
      const poids = c.v('colis_poids')
      colisGardes.add(id)
      atelierColis.set(id, ate)
      destColis.set(id, dest)
      co.push({
        id,
        plateformeId: plt,
        atelierId: ate,
        destinataireId: dest,
        statut,
        formatCode: ent(c.v('fc_col_id')) ?? 5,
        codeColis: txt(c.v('colis_code')),
        poids: poids === null ? null : Number(poids).toFixed(2),
        transporteur: ent(c.v('tsp_id')),
        tarif: txt(c.v('tarif_code')),
        codeExterne: txt(c.v('colis_code_ext')),
        commentaire: txt(c.v('commentaire')),
        dateExpedition: date(c.v('colis_dat_expe')),
        // RG-COO-271 : NULL → faux (valeur par défaut du modèle ; envoi désactivé, Q-375, QC-B-07).
        mailEnvoye: bit(c.v('Mailcolis_envoye')),
        createdAt: creee,
        updatedAt: date(c.v('colis_dat_maj')) ?? creee,
      })
    }
    await inserer('Colis', co, (d) => db.colis.createMany({ data: d }))

    const uc: Prisma.UniteColisCreateManyInput[] = []
    const vus = new Set<string>()
    for (const l of liens) {
      const u = ent(l.v('UM_id'))
      const c = ent(l.v('colis_id'))
      const cle = `${String(u)}|${String(c)}`
      if (u === null || c === null || !umGardees.has(u) || !colisGardes.has(c)) {
        rejeter('tf_UM_colis', 'UM ou colis rejeté ou absent (cascade)', 'FK', cle)
        continue
      }
      // RG-COO-265 : même destinataire et même atelier que le colis.
      if (destUm.get(u) !== destColis.get(c) || atelierUm.get(u) !== atelierColis.get(c)) {
        rejeter(
          'tf_UM_colis',
          'UM et colis de destinataire ou d’atelier différents',
          'RG-COO-265',
          cle,
        )
        continue
      }
      const quantite = ent(l.v('uc_qte')) ?? 0
      if (quantite < 1) {
        rejeter('tf_UM_colis', 'quantité placée < 1', 'RG-COO-264', cle)
        continue
      }
      if (vus.has(cle)) continue
      vus.add(cle)
      uc.push({
        uniteId: u,
        colisId: c,
        quantite,
        createdAt: date(l.v('uc_dat_cre')) ?? new Date(),
      })
    }
    await inserer('UniteColis', uc, (d) => db.uniteColis.createMany({ data: d }))
  })

  // Copie Broadcast (A §4.9, B §4.10). HYPOTHÈSE QC-B-08 : idSiteCcf déduit de « Plateforme <nom> » via
  // tr_plateforme.id_site_ccf (aucun pour un site absent de tr_plateforme) ; idSurface par le libellé de Surface.
  await chrono('copie Broadcast', async () => {
    const surfaces = new Map(
      (await db.surface.findMany()).map((s) => [s.libelle.trim().toUpperCase(), s.id]),
    )
    const sites = new Map(
      [...plateformes.values()].map((p) => [`PLATEFORME ${p.nom.toUpperCase()}`, p.idSiteCcf]),
    )
    const pb: Prisma.PrepaBroadcastCreateManyInput[] = broadcast.map((b) => {
      const dest = txt(b.v('DestinataireEffectif'))
      const surface = txt(b.v('Surface'))
      const creee = date(b.v('dateCreated')) ?? new Date()
      return {
        id: ent(b.v('id')) ?? 0,
        idSiteCcf: dest ? (sites.get(dest.trim().toUpperCase()) ?? null) : null,
        destinataireEffectif: dest,
        idDossierDeVenteChapeau: ent(b.v('IdDossierDeVenteChapeau')),
        idDaChapeau: ent(b.v('IdDAChapeau')),
        idSurface: surface ? (surfaces.get(surface.trim().toUpperCase()) ?? null) : null,
        annonceur: txt(b.v('Annonceur')),
        surface,
        format: txt(b.v('Format')),
        assistantCommercial: txt(b.v('AssistantCommercial')),
        assistantLogistique: txt(b.v('AssistantLogistique')),
        theme: txt(b.v('Theme')),
        bandeau: txt(b.v('Bandeau')),
        idThemeBandeau: ent(b.v('IdThemeBandeau')),
        quantite: ent(b.v('quantite')),
        statutPreparation: txt(b.v('StatutPreparation')),
        repiquage: txt(b.v('repiquage')),
        semNum: ent(b.v('sem_num')),
        semAnnee: ent(b.v('sem_annee')),
        supportId: ent(b.v('sup_id')),
        createdAt: creee,
        updatedAt: date(b.v('dateModified')) ?? creee,
      }
    })
    await inserer('PrepaBroadcast', pb, (d) => db.prepaBroadcast.createMany({ data: d }))
  })

  // ═════════════════════════ 3. Réception (A §4) ═════════════════════════

  // RG-REC-018 : écart de réception (paramètre global, Q-105).
  const ecart = Number(
    (
      await db.parametre.findFirst({
        where: { cle: 'reception.ecartReception', plateformeId: null },
      })
    )?.valeur ?? '10',
  )
  const attendu = (d: { source: SourceLigne; qteBc?: number | null; qtePrepa?: number | null }) =>
    attenduDe({ source: d.source, qteBc: d.qteBc ?? null, qtePrepa: d.qtePrepa ?? null })

  await chrono('réception (BL, réceptions, affiches, mouvements, lignes attendues)', async () => {
    const livraisons = await tout('livraison')
    const assoAffiches = await tout('asso_livraison_affiche')
    const affiches = await tout('affiche')
    const mouvements = await tout('mouvement')
    const photos = await tout('photo')
    const assoPhotos = await tout('asso_livraison_photo')
    const lignesAttendues = await tout('tf_prepa_affiche')
    const semaines = await tout('tf_dossier_semaine_depart')

    const pltAffiche = new Map(
      affiches.map((a) => [ent(a.v('affiche_id')) ?? -1, ent(a.v('plt_id'))]),
    )
    const livraisonDe = new Map<number, number>() // affiche → livraison (une seule par affiche, A §4.4)
    const pltBl = new Map<number, Set<number>>()
    for (const l of assoAffiches) {
      const liv = ent(l.v('Id_livraison'))
      const aff = ent(l.v('Id_affiche_livraison'))
      if (liv === null || aff === null) continue
      if (!livraisonDe.has(aff)) livraisonDe.set(aff, liv)
      const p = pltAffiche.get(aff)
      if (p !== null && p !== undefined) pltBl.set(liv, (pltBl.get(liv) ?? new Set()).add(p))
    }

    // BL → Réception (RG-REC-022 : un BL = une réception ; RG-REC-024 : un BL ne livre qu'une plateforme, déduite des
    // affiches liées). Un BL sans affiche n'a pas de plateforme : rejeté (A §4.1).
    const blGardes = new Map<number, { plateformeId: number; date: Date | null }>()
    const li: Prisma.LivraisonCreateManyInput[] = []
    const re: Prisma.ReceptionCreateManyInput[] = []
    for (const l of livraisons) {
      const id = ent(l.v('Id'))
      if (id === null) continue
      const plts = [...(pltBl.get(id) ?? [])]
      if (plts.length !== 1) {
        rejeter(
          'livraison',
          plts.length === 0
            ? 'BL sans affiche : plateforme indéterminable'
            : 'BL sur plusieurs plateformes',
          plts.length === 0 ? 'RG-REC-022' : 'RG-REC-024',
          id,
        )
        continue
      }
      const plateformeId = plts[0] ?? 0
      const dateLivraison = date(l.v('DateLivraison'))
      const expediteur = txt(l.v('Expediteur'))
      const imprimeur = txt(l.v('Imprimeur'))
      const livreurId = expediteur ? (livreurs.get(cleLibelle(expediteur)) ?? null) : null
      const imprimeurId = imprimeur ? (imprimeurs.get(cleLibelle(imprimeur)) ?? null) : null
      if (expediteur && livreurId === null)
        noter('Livraison : transporteur texte absent de la liste fermée → vide (A §4.1, QA-9)')
      if (imprimeur && imprimeurId === null)
        noter('Livraison : imprimeur texte absent de la liste fermée → vide (A §4.1, QA-9)')
      const creee = dateLivraison ?? new Date()
      blGardes.set(id, { plateformeId, date: dateLivraison })
      li.push({
        id,
        dateLivraison,
        imprimeurId,
        livreurId,
        reference: txt(l.v('Reference')),
        nbreColis: ent(l.v('Nbre_colis')),
        refDossier: txt(l.v('Ref_dossier')),
        refDa: txt(l.v('Ref_DA')),
        dechargePar: txt(l.v('Decharge_par')),
        commentaire: txt(l.v('Commentaire')),
        // HYPOTHÈSE (A §4.1) : date de création du BL = date de livraison (aucune autre date en source).
        createdAt: creee,
        updatedAt: creee,
      })
      // HYPOTHÈSE Q-442 / Q-307 : le legacy n'a pas d'étape de contrôle ; une réception reprise est CONTROLEE (sinon les
      // 1 976 palettes entreraient dans le sas de contrôle, RG-REC-038 / 055). Même identifiant que le BL.
      re.push({
        id,
        plateformeId,
        livraisonId: id,
        statut: 'CONTROLEE',
        dateArrivee: creee,
        createdAt: creee,
        updatedAt: creee,
      })
    }
    noter(
      'Reception : créée par BL, statut CONTROLEE, sans contrôleur ni photo de BL (HYPOTHÈSE Q-442)',
      re.length,
    )

    // Photos : métadonnées seules (binaire absent de 100 % des lignes, A §4.2 ; `fichier` facultatif dans le modèle).
    const photoBl = new Map<number, number>()
    for (const a of assoPhotos) {
      const ph = ent(a.v('photo_id'))
      const liv = ent(a.v('livraison_Id'))
      if (ph !== null && liv !== null) photoBl.set(ph, liv)
    }
    const photosGardees = new Set<number>()
    const ph: Prisma.PhotoCreateManyInput[] = []
    for (const p of photos) {
      const id = ent(p.v('photo_id'))
      if (id === null) continue
      const liv = photoBl.get(id)
      if (liv === undefined || !blGardes.has(liv)) {
        rejeter('photo', 'BL rejeté ou absent (cascade)', 'FK livraison', id)
        continue
      }
      photosGardees.add(id)
      ph.push({
        id,
        mimeType: txt(p.v('image_mime_type')),
        fichier: null,
        intitule: txt(p.v('intitule')),
        taille: ent(p.v('size')),
        extension: txt(p.v('extension')),
        createdAt: date(p.v('date_creation')) ?? new Date(),
      })
    }
    noter(
      'Photo : métadonnées seules, contenu absent de l’export (A §4.2, Q-311 / Q-332)',
      ph.length,
    )

    // Mouvements (A §4.5) : type inféré du code legacy ; quantité nulle rejetée (RG-REC-151).
    interface Mvt {
      id: number
      afficheId: number
      quantite: number
      type: TypeMouvement
      ligne: Ligne
    }
    const mvtsParAffiche = new Map<number, Mvt[]>()
    for (const m of mouvements) {
      const id = ent(m.v('mouvement_id'))
      const aff = ent(m.v('affiche_id'))
      const q = ent(m.v('quantite'))
      if (id === null || aff === null || q === null) continue
      if (q === 0) {
        rejeter('mouvement', 'quantité nulle', 'RG-REC-151', id)
        continue
      }
      const recepisse = txt(m.v('recepisse'))?.trim().toUpperCase() ?? ''
      let type: TypeMouvement
      if (m.v('livraison_id') !== null) {
        // LivraisonAfficheService.cs:833-840 : mouvement de réception d'un BL.
        if (q < 0) {
          rejeter('mouvement', 'mouvement de réception négatif', 'RG-REC-153', id)
          continue
        }
        type = 'RECEPTION'
      } else if (m.v('IdActivite') !== null) {
        // ActiviteBll.cs:142-151 : saisie de production (pliage / roulage), négative. Aucun type « production » dans
        // l'enum (Q-169). HYPOTHÈSE Q-169 / Q-442 : sortie de stock saisie à la main → SORTIE_MANUELLE (activiteId gardé).
        if (q > 0) {
          rejeter('mouvement', 'mouvement de production positif', 'RG-REC-153', id)
          continue
        }
        type = 'SORTIE_MANUELLE'
        noter('Mouvement : production legacy (Activite) → SORTIE_MANUELLE (HYPOTHÈSE Q-169)')
      } else if (recepisse === 'VIDAGE DU REBUS') {
        // ReceptionListeAfficheBll.cs:315-318 : vidage du rebus. HYPOTHÈSE Q-118 : MISE_AU_REBUT.
        type = q < 0 ? 'MISE_AU_REBUT' : 'AJOUT_MANUEL'
      } else {
        // ReceptionListeAfficheBll.cs:812-826 : ajout (positif) ou sortie (négatif, récépissé « Sortie ») manuels.
        // Le type suit le signe (RG-REC-153 : sens obligatoire par type).
        type = q > 0 ? 'AJOUT_MANUEL' : 'SORTIE_MANUELLE'
      }
      const liste = mvtsParAffiche.get(aff) ?? []
      liste.push({ id, afficheId: aff, quantite: q, type, ligne: m })
      mvtsParAffiche.set(aff, liste)
    }

    // Affiches : RG-REC-064 (ANO-061, Q-417) : une sortie ne rend jamais le stock négatif. Rejouée dans l'ordre
    // d'écriture (mouvement_id), une affiche dont le stock passe sous zéro est rejetée avec ses dépendances. Le
    // contrôle n°98 de l'export garantit que tous les mouvements des affiches exportées sont présents (A §4.3).
    const affichesGardees = new Map<number, Ligne>()
    for (const a of affiches) {
      const id = ent(a.v('affiche_id'))
      if (id === null) continue
      const plt = ent(a.v('plt_id'))
      const sup = ent(a.v('sup_id'))
      if (plt === null || !plateformes.has(plt) || sup === null || !supports.has(sup)) {
        rejeter('affiche', 'plateforme ou support inconnu', 'FK', id)
        continue
      }
      let stock = 0
      let negatif = false
      for (const m of [...(mvtsParAffiche.get(id) ?? [])].sort((x, y) => x.id - y.id)) {
        stock += m.quantite
        if (stock < 0) negatif = true
      }
      if (negatif) {
        rejeter('affiche', 'historique de mouvements qui rend le stock négatif', 'RG-REC-064', id)
        continue
      }
      affichesGardees.set(id, a)
    }
    for (const [aff, liste] of mvtsParAffiche)
      if (!affichesGardees.has(aff))
        for (const m of liste) rejeter('mouvement', 'affiche rejetée (cascade)', 'FK affiche', m.id)

    // Lignes attendues (A §4.7). Plateforme NULL → plateforme de l'atelier ; sinon rejet (plateforme obligatoire de la
    // clé de ligne, RG-REC-014 / Q-305). Source : FromBroadcast 1 → BC (qteBc), sinon PREPA (qtePrepa) (RG-REC-017).
    interface LigneA {
      id: number
      data: Prisma.ReceptionAttendueCreateManyInput & { plateformeId: number; source: SourceLigne }
      affiche: number | null
      cle: string
      maj: number
    }
    const lignes: LigneA[] = []
    for (const l of lignesAttendues) {
      const id = ent(l.v('Id'))
      if (id === null) continue
      let plt = ent(l.v('plt_id'))
      const ate = ent(l.v('ate_id'))
      if (plt === null && ate !== null && ateliers.has(ate)) {
        plt = ateliers.get(ate) ?? null
        noter('ReceptionAttendue : plateforme déduite de l’atelier (A §4.7)')
      }
      if (plt === null || !plateformes.has(plt)) {
        rejeter('tf_prepa_affiche', 'ligne sans plateforme (ni atelier)', 'RG-REC-014', id)
        continue
      }
      const sup = ent(l.v('sup_id'))
      const semNum = ent(l.v('sem_num'))
      const semAnnee = ent(l.v('sem_annee'))
      if (sup === null || !supports.has(sup) || semNum === null || semAnnee === null) {
        rejeter('tf_prepa_affiche', 'support ou semaine absent', 'RG-REC-014', id)
        continue
      }
      const theme = txt(l.v('rpc_theme'))
      const themeCle = theme === null ? null : normaliserTheme(theme)
      const contNum = ent(l.v('cont_num'))
      noterDossier(contNum, txt(l.v('rpc_annonceur')))
      const source: SourceLigne = bit(l.v('FromBroadcast')) ? 'BC' : 'PREPA'
      const qte = ent(l.v('Qte_Theorique'))
      const creee = date(l.v('dateCreated')) ?? new Date()
      const maj = date(l.v('dateModified')) ?? creee
      const affiche = ent(l.v('affiche_livraison_Id'))
      lignes.push({
        id,
        affiche,
        maj: maj.getTime(),
        // Clé de l'index unique partiel tf_prepa_affiche_ligne_active_cle_key (Q-305).
        cle: [plt, contNum ?? 0, sup, themeCle ?? '', 0, semAnnee, semNum].join('|'),
        data: {
          id,
          plateformeId: plt,
          supportId: sup,
          atelierId: ate !== null && ateliers.has(ate) ? ate : null,
          contNum,
          format: txt(l.v('Format')),
          description: txt(l.v('Description')),
          annonceur: txt(l.v('rpc_annonceur')),
          numAfficheAmt: ent(l.v('rpc_num_aff_amt')),
          theme,
          themeCle,
          repiquage: txt(l.v('repiquage')),
          idDaChapeau: ent(l.v('IdDAChapeau')),
          semNum,
          semAnnee,
          source,
          qteBc: source === 'BC' ? qte : null,
          qtePrepa: source === 'PREPA' ? qte : null,
          createdAt: creee,
          updatedAt: maj,
        },
      })
    }
    // RG-REC-014 / Q-305 : une seule ligne ACTIVE par clé. ANALYSE_MODELE_DONNEES §5 (1) : garder la ligne qui porte
    // une affiche (puis la plus récente), reporter ses liens, fermer les autres (ANNULEE + fermeeLe, jamais supprimées).
    const groupes = new Map<string, LigneA[]>()
    for (const l of lignes) groupes.set(l.cle, [...(groupes.get(l.cle) ?? []), l])
    const active = new Map<number, LigneA>() // id de ligne source → ligne active de sa clé
    const fermeture = new Date()
    for (const g of groupes.values()) {
      const tri = [...g].sort(
        (x, y) =>
          Number(y.affiche !== null && affichesGardees.has(y.affiche)) -
            Number(x.affiche !== null && affichesGardees.has(x.affiche)) ||
          y.maj - x.maj ||
          y.id - x.id,
      )
      const gardee = tri[0]
      if (!gardee) continue
      for (const l of g) {
        active.set(l.id, gardee)
        if (l !== gardee) {
          l.data.etatLigne = 'ANNULEE'
          l.data.fermeeLe = fermeture
          noter(
            'ReceptionAttendue : doublon de clé active → ANNULEE, liens reportés (Q-305, ANALYSE §5)',
          )
        }
      }
    }

    // Liens affiche ↔ ligne (AfficheAttendue). Q-213 OUVERTE. HYPOTHÈSE : la quantité reçue de l'affiche (Σ de ses
    // mouvements de réception, RG-X-016 : comptée une fois) est répartie sur ses lignes par semaine croissante, chaque
    // ligne recevant au plus son reste à recevoir, la dernière le solde (RG-X-060 : Σ liens ≤ reçu ; RG-REC-049 :
    // quantité ≥ 1). Mode BL (lien posé à la réception par le BL, A §4.7).
    const lignesDeAffiche = new Map<number, Set<LigneA>>()
    for (const l of lignes) {
      if (l.affiche === null) continue
      if (!affichesGardees.has(l.affiche)) {
        rejeter(
          'asso_affiche_visuel',
          'affiche rejetée (cascade)',
          'FK affiche',
          `${String(l.affiche)}→${String(l.id)}`,
        )
        continue
      }
      const cible = active.get(l.id) ?? l
      lignesDeAffiche.set(l.affiche, (lignesDeAffiche.get(l.affiche) ?? new Set()).add(cible))
    }
    const recuLigne = new Map<number, number>()
    const liens: Prisma.AfficheAttendueCreateManyInput[] = []
    const statutAffiche = new Map<number, StatutAffiche>()
    for (const [aff, ensemble] of [...lignesDeAffiche].sort((x, y) => x[0] - y[0])) {
      const a = affichesGardees.get(aff)
      if (!a) continue
      const pltA = ent(a.v('plt_id'))
      const cibles = [...ensemble]
        .filter((l) => {
          if (l.data.plateformeId === pltA) return true
          rejeter(
            'asso_affiche_visuel',
            'affiche et ligne sur deux plateformes',
            'RG-REC-024',
            `${String(aff)}→${String(l.id)}`,
          )
          return false
        })
        .sort(
          (x, y) =>
            x.data.semAnnee - y.data.semAnnee || x.data.semNum - y.data.semNum || x.id - y.id,
        )
      const recu = (mvtsParAffiche.get(aff) ?? [])
        .filter((m) => m.type === 'RECEPTION')
        .reduce((s, m) => s + m.quantite, 0)
      let reste = recu
      const creeLe = date(a.v('date_creation')) ?? date(a.v('date_entree')) ?? new Date()
      cibles.forEach((l, i) => {
        const derniere = i === cibles.length - 1
        const deja = recuLigne.get(l.id) ?? 0
        const q = derniere ? reste : Math.min(reste, Math.max(0, attendu(l.data) - deja))
        if (q < 1) {
          rejeter(
            'asso_affiche_visuel',
            recu < 1
              ? 'affiche sans quantité reçue (aucun mouvement de réception)'
              : 'quantité reçue déjà répartie (lien à 0)',
            'RG-REC-049',
            `${String(aff)}→${String(l.id)}`,
          )
          return
        }
        reste -= q
        recuLigne.set(l.id, deja + q)
        liens.push({
          afficheId: aff,
          ligneAttendueId: l.id,
          quantite: q,
          mode: 'BL',
          creeLe,
          updatedAt: creeLe,
        })
        statutAffiche.set(aff, 'IDENTIFIEE')
      })
    }
    noter(
      'AfficheAttendue : quantité du lien répartie par semaine croissante (HYPOTHÈSE Q-213)',
      liens.length,
    )
    // RG-REC-018 : statut de ligne calculé une fois, depuis l'attendu et le reçu (Σ liens actifs).
    for (const l of lignes) {
      const statut: StatutLigneAttendue = statutLigneDe(
        attendu(l.data),
        recuLigne.get(l.id) ?? 0,
        ecart,
      )
      l.data.statut = statut
    }

    // Insertions dans l'ordre des clés étrangères.
    await inserer('Livraison', li, (d) => db.livraison.createMany({ data: d }))
    await inserer('Reception', re, (d) => db.reception.createMany({ data: d }))
    await inserer('Photo', ph, (d) => db.photo.createMany({ data: d }))
    const lp: Prisma.LivraisonPhotoCreateManyInput[] = []
    for (const a of assoPhotos) {
      const ph2 = ent(a.v('photo_id'))
      const liv = ent(a.v('livraison_Id'))
      if (ph2 === null || liv === null || !photosGardees.has(ph2) || !blGardes.has(liv)) continue
      lp.push({
        id: ent(a.v('asso_livraison_photo_Id')) ?? 0,
        photoId: ph2,
        livraisonId: liv,
        intitule: txt(a.v('intitule')),
      })
    }
    await inserer('LivraisonPhoto', lp, (d) => db.livraisonPhoto.createMany({ data: d }))

    // Affiche.contNum (Int) depuis cont_num texte (A §4.3) : « n° » ou « n° Sxx » → n° ; plusieurs dossiers (« a+b »,
    // « a/b ») → vide (RG-REC-049 : les dossiers multiples sont portés par les rattachements).
    const parseContNum = (v: string | null): number | null => {
      if (v === null) return null
      const m = /^\s*(\d+)(\s+S\d{1,2})?\s*$/i.exec(v)
      if (m?.[1]) return Number(m[1])
      noter(
        'Affiche : n° de dossier multiple ou illisible → vide, dossiers portés par les liens (RG-REC-049)',
      )
      return null
    }
    const af: Prisma.AfficheCreateManyInput[] = []
    for (const [id, a] of affichesGardees) {
      const quantite = (mvtsParAffiche.get(id) ?? []).reduce((s, m) => s + m.quantite, 0)
      const liv = livraisonDe.get(id)
      const creee = date(a.v('date_creation')) ?? date(a.v('date_entree')) ?? new Date()
      const contNum = parseContNum(a.v('cont_num'))
      noterDossier(contNum, txt(a.v('cont_annonc')))
      const statut = statutAffiche.get(id) ?? 'ORPHELINE'
      af.push({
        id,
        plateformeId: ent(a.v('plt_id')) ?? 0,
        supportId: ent(a.v('sup_id')) ?? 0,
        receptionId: liv !== undefined && blGardes.has(liv) ? liv : null,
        // RG-REC-115 / RG-X-005 : IDENTIFIEE si au moins un lien actif, sinon ORPHELINE.
        statut,
        dateEntree: date(a.v('date_entree')) ?? creee,
        commentaire: txt(a.v('commentaire')),
        contNum,
        contAnnonc: txt(a.v('cont_annonc')),
        theme: txt(a.v('theme')),
        repiquage: txt(a.v('repiquage')),
        conservation: ent(a.v('conservation')) ?? 0,
        // Q-103 / Q-322 / RG-REC-153 : quantite = cache de Σ mouvements (recalculé, la valeur legacy n'est pas reprise).
        quantite,
        dateDernierDepart: date(a.v('date_dernier_depart')),
        dateDerniereSortie: date(a.v('date_derniere_sortie')),
        allee: txt(a.v('allee')),
        rayon: txt(a.v('rayon')),
        aConserver: bit(a.v('a_conserver')),
        validationAdmin: bit(a.v('validationAdmin')),
        modeRattachement: statut === 'IDENTIFIEE' ? 'BL' : null,
        rebus: bit(a.v('rebus')),
        dateRebus: date(a.v('date_rebus')),
        zonePicking: bit(a.v('zone_Picking')),
        estFusionne: bit(a.v('est_fusionne')),
        envoye: bit(a.v('envoye')),
        createdAt: creee,
        updatedAt: date(a.v('date_maj')) ?? creee,
      })
    }
    await creerDossiers()
    await inserer('Affiche', af, (d) => db.affiche.createMany({ data: d }))

    const la: Prisma.LivraisonAfficheCreateManyInput[] = []
    for (const l of assoAffiches) {
      const id = ent(l.v('Id'))
      const liv = ent(l.v('Id_livraison'))
      const aff = ent(l.v('Id_affiche_livraison'))
      if (
        id === null ||
        liv === null ||
        aff === null ||
        !blGardes.has(liv) ||
        !affichesGardees.has(aff)
      ) {
        rejeter('asso_livraison_affiche', 'affiche ou BL rejeté (cascade)', 'FK', id)
        continue
      }
      la.push({
        id,
        livraisonId: liv,
        afficheId: aff,
        numeroLivraison: ent(l.v('NumeroLivraison')),
      })
    }
    await inserer('LivraisonAffiche', la, (d) => db.livraisonAffiche.createMany({ data: d }))

    // Mouvements : date 0001-01-01 (jamais renseignée par le legacy, A §4.5) → date du BL pour une réception, sinon
    // date de création (HYPOTHÈSE QA-4) ; réception = celle du BL.
    const mv: Prisma.MouvementCreateManyInput[] = []
    for (const [aff, liste] of mvtsParAffiche) {
      if (!affichesGardees.has(aff)) continue
      for (const m of liste) {
        const l = m.ligne
        const liv = ent(l.v('livraison_id'))
        const bl = liv !== null ? blGardes.get(liv) : undefined
        const creee = date(l.v('date_creation')) ?? new Date()
        let jour = date(l.v('date'))
        if (jour === null) {
          jour = bl?.date ?? creee
          noter('Mouvement : date 0001-01-01 → date du BL ou de création (HYPOTHÈSE QA-4)')
        }
        const activite = ent(l.v('IdActivite'))
        mv.push({
          id: m.id,
          afficheId: aff,
          type: m.type,
          date: jour,
          quantite: m.quantite,
          recepisse: txt(l.v('recepisse')),
          expediteur: txt(l.v('expediteur')),
          comptee: bit(l.v('comptee')),
          motif: activite !== null ? `Production legacy (Activite ${String(activite)})` : null,
          livraisonId: bl ? liv : null,
          receptionId: bl ? liv : null,
          activiteId: activite,
          createdAt: creee,
        })
      }
    }
    await inserer('Mouvement', mv, (d) => db.mouvement.createMany({ data: d }))

    // Semaines de départ (A §4.8) : DIRECT ; doublons de la clé unique rejetés ; Dossier 0 gardé tel quel (QA-10).
    const vus = new Set<string>()
    const sd: Prisma.AfficheSemaineDepartCreateManyInput[] = []
    for (const s of semaines) {
      const id = ent(s.v('Id'))
      const aff = ent(s.v('IdAffiche'))
      const sem = ent(s.v('Semaine'))
      const an = ent(s.v('Annee'))
      const dos = ent(s.v('Dossier'))
      if (id === null || aff === null || !affichesGardees.has(aff) || sem === null || an === null) {
        rejeter(
          'tf_dossier_semaine_depart',
          'affiche rejetée (cascade) ou semaine absente',
          'FK affiche',
          id,
        )
        continue
      }
      const cle = `${String(aff)}|${String(dos)}|${String(an)}|${String(sem)}`
      if (vus.has(cle)) {
        rejeter(
          'tf_dossier_semaine_depart',
          'doublon (affiche, dossier, année, semaine)',
          'Q-150',
          id,
        )
        continue
      }
      vus.add(cle)
      sd.push({ id, afficheId: aff, dossier: dos, semaine: sem, annee: an })
    }
    await inserer('AfficheSemaineDepart', sd, (d) =>
      db.afficheSemaineDepart.createMany({ data: d }),
    )

    // Lignes ACTIVES d'abord (index unique partiel), puis les ANNULEE ; enfin les liens.
    const ordonnees = [...lignes].sort(
      (x, y) => Number(x.data.etatLigne === 'ANNULEE') - Number(y.data.etatLigne === 'ANNULEE'),
    )
    await inserer(
      'ReceptionAttendue',
      ordonnees.map((l) => l.data),
      (d) => db.receptionAttendue.createMany({ data: d }),
    )
    await inserer('AfficheAttendue', liens, (d) => db.afficheAttendue.createMany({ data: d }))
  })

  // ═════════════════════════ 4. Paramètres à renseigner à la reprise ═════════════════════════
  // Les descriptions de seed-ref.ts demandent de les saisir « à la reprise des ateliers / du référentiel ».
  await chrono('paramètres', async () => {
    const pliage = new Set(
      (
        (
          await db.parametre.findFirst({
            where: { cle: 'integration.routagePliage', plateformeId: null },
          })
        )?.valeur ?? ''
      )
        .split(';')
        .map((x) => Number(x.split(':')[1]))
        .filter((x) => Number.isInteger(x)),
    )
    // RG-COO-247 / 248 : types traités par l'atelier de pliage = types des répartitions des ateliers de pliage
    // (routage RG-COO-121 : integration.routagePliage).
    const typesPliage = await db.repartition.findMany({
      where: { atelierId: { in: [...pliage] }, typePreparationId: { not: null } },
      distinct: ['typePreparationId'],
      select: { typePreparationId: true },
    })
    const valeurs: Record<string, string> = {
      'unitaire.typesPliage': typesPliage
        .map((t) => String(t.typePreparationId))
        .sort()
        .join(';'),
      // RG-COO-237 et RG-COO-263 : ateliers legacy 7 et 8 (8 m²), cités par la description du paramètre.
      'suivi8m2.ateliers': [7, 8].filter((a) => ateliers.has(a)).join(';'),
      'colis.ateliersMajoration': [7, 8].filter((a) => ateliers.has(a)).join(';'),
    }
    for (const [cle, valeur] of Object.entries(valeurs)) {
      const p = await db.parametre.findFirst({ where: { cle, plateformeId: null } })
      if (p && p.valeur.trim() === '' && valeur !== '') {
        await db.parametre.update({
          where: { id: p.id },
          data: { valeur, version: { increment: 1 } },
        })
        noter(`Paramètre ${cle} renseigné : ${valeur}`)
      }
    }
  })

  // ═════════════════════════ 5. Invariants après import ═════════════════════════
  const invariants: Record<string, number> = {}
  await chrono('invariants', async () => {
    const compte = async (sql: string) =>
      Number((await db.$queryRawUnsafe<{ n: bigint | number }[]>(sql))[0]?.n ?? 0)
    invariants['RG-REC-153 affiche.quantite ≠ Σ mouvements'] = await compte(
      `SELECT COUNT(*) AS n FROM affiche a WHERE a.quantite <> COALESCE((SELECT SUM(m.quantite) FROM mouvement m WHERE m.affiche_id = a.affiche_id), 0)`,
    )
    invariants['RG-REC-064 stock < 0'] = await compte(
      `SELECT COUNT(*) AS n FROM affiche a WHERE COALESCE((SELECT SUM(m.quantite) FROM mouvement m WHERE m.affiche_id = a.affiche_id), 0) < 0`,
    )
    invariants['RG-REC-153 sens du mouvement contraire à son type'] = await compte(
      `SELECT COUNT(*) AS n FROM mouvement WHERE quantite = 0 OR (type IN ('RECEPTION','COMPLEMENT','AJOUT_MANUEL') AND quantite < 0) OR (type IN ('MISE_AU_REBUT','SORTIE_MANUELLE','EXPEDITION','RENVOI','DESTRUCTION') AND quantite > 0)`,
    )
    invariants['RG-X-060 Σ liens actifs > quantité reçue de l’affiche'] = await compte(
      `SELECT COUNT(*) AS n FROM affiche a WHERE COALESCE((SELECT SUM(v.quantite) FROM asso_affiche_visuel v WHERE v.affiche_id = a.affiche_id AND v.actif = 1), 0) > COALESCE((SELECT SUM(m.quantite) FROM mouvement m WHERE m.affiche_id = a.affiche_id AND m.type IN ('RECEPTION','COMPLEMENT')), 0)`,
    )
    invariants['RG-REC-115 statut d’affiche incohérent avec ses liens'] = await compte(
      `SELECT COUNT(*) AS n FROM affiche a WHERE (a.statut = 'IDENTIFIEE') <> EXISTS (SELECT 1 FROM asso_affiche_visuel v WHERE v.affiche_id = a.affiche_id AND v.actif = 1)`,
    )
    invariants['RG-REC-049 lien de quantité < 1'] = await compte(
      `SELECT COUNT(*) AS n FROM asso_affiche_visuel WHERE quantite < 1`,
    )
    invariants['RG-COO-088 lien actif sur une ligne ANNULEE'] = await compte(
      `SELECT COUNT(*) AS n FROM asso_affiche_visuel v JOIN tf_prepa_affiche l ON l.id = v.ligne_attendue_id WHERE v.actif = 1 AND l.etat_ligne = 'ANNULEE'`,
    )
    invariants['RG-REC-024 lien entre deux plateformes'] = await compte(
      `SELECT COUNT(*) AS n FROM asso_affiche_visuel v JOIN tf_prepa_affiche l ON l.id = v.ligne_attendue_id JOIN affiche a ON a.affiche_id = v.affiche_id WHERE l.plt_id <> a.plt_id`,
    )
    invariants['Q-305 clé de ligne active en double'] = await compte(
      `SELECT COUNT(*) AS n FROM (SELECT 1 FROM tf_prepa_affiche WHERE etat_ligne = 'ACTIVE' GROUP BY plt_id, COALESCE(cont_num, 0), sup_id, COALESCE(theme_cle, ''), COALESCE(IdThemeBandeau, 0), sem_annee, sem_num HAVING COUNT(*) > 1)`,
    )
    invariants['RG-REC-022 BL sans réception'] = await compte(
      `SELECT COUNT(*) AS n FROM livraison l WHERE NOT EXISTS (SELECT 1 FROM reception r WHERE r.livraison_id = l.id)`,
    )
    invariants['RG-COO-264 Σ uc_qte > UM_qte'] = await compte(
      `SELECT COUNT(*) AS n FROM tf_UM u WHERE COALESCE((SELECT SUM(c.uc_qte) FROM tf_UM_colis c WHERE c.UM_id = u.UM_id), 0) > COALESCE(u.UM_qte, 0)`,
    )
    invariants['RG-COO-265 UM et colis de destinataire / atelier différents'] = await compte(
      `SELECT COUNT(*) AS n FROM tf_UM_colis uc JOIN tf_UM u ON u.UM_id = uc.UM_id JOIN tf_colis c ON c.colis_id = uc.colis_id WHERE COALESCE(u.dest_id, -1) <> c.dest_id OR COALESCE(u.ate_id, -1) <> c.ate_id`,
    )
    invariants['Colis : plateforme ≠ plateforme de l’atelier'] = await compte(
      `SELECT COUNT(*) AS n FROM tf_colis c JOIN tr_atelier a ON a.id = c.ate_id WHERE a.plt_id <> c.plt_id`,
    )
    invariants['Clés étrangères violées (PRAGMA foreign_key_check)'] = (
      await db.$queryRawUnsafe<unknown[]>('PRAGMA foreign_key_check')
    ).length
    // RG-REC-018 : statut persisté de chaque ligne = statut recalculé depuis Σ liens actifs.
    const sommesLiens = new Map(
      (
        await db.afficheAttendue.groupBy({
          by: ['ligneAttendueId'],
          where: { actif: true },
          _sum: { quantite: true },
        })
      ).map((g) => [g.ligneAttendueId, g._sum.quantite ?? 0]),
    )
    let ecartsStatut = 0
    for (const l of await db.receptionAttendue.findMany({
      select: { id: true, source: true, qteBc: true, qtePrepa: true, statut: true },
    }))
      if (statutLigneDe(attenduDe(l), sommesLiens.get(l.id) ?? 0, ecart) !== l.statut)
        ecartsStatut++
    invariants['RG-REC-018 statut de ligne ≠ statut recalculé'] = ecartsStatut
    // RG-COO-043 sur les instructions importées.
    const vis = await db.instructionVisuel.findMany({
      where: { instruction: { statut: { in: ['INSTRUCTION_OK', 'PRET_A_PRODUIRE'] } } },
      select: {
        instructionCode: true,
        supportId: true,
        typePreparationId: true,
        pourcentage: true,
      },
    })
    const s = new Map<string, number>()
    for (const v of vis) {
      const k = `${v.instructionCode}|${String(v.supportId)}|${String(v.typePreparationId)}`
      s.set(k, (s.get(k) ?? 0) + Number(v.pourcentage ?? 0))
    }
    invariants['RG-COO-043 instruction validée ≠ 100 % (hors 0 %, Q-445)'] = new Set(
      [...s].filter(([, x]) => !sommeAdmise(x)).map(([k]) => k.split('|')[0]),
    ).size
    invariants['(info) instructions validées avec un couple à 0 % (Q-445, ECART-127)'] = new Set(
      [...s].filter(([, x]) => Math.abs(x) < 1e-6).map(([k]) => k.split('|')[0]),
    ).size
    // Informations (pas de règle V2 qui les interdit, donc aucun rejet) :
    invariants[
      '(info) UM dont Σ répartitions ≠ UM_qte (RG-COO-260 : vrai à la création seulement)'
    ] = await compte(
      `SELECT COUNT(*) AS n FROM tf_UM u WHERE EXISTS (SELECT 1 FROM tf_repart_calcul r WHERE r.UM_id = u.UM_id) AND (SELECT SUM(r.rpc_qte) FROM tf_repart_calcul r WHERE r.UM_id = u.UM_id) <> COALESCE(u.UM_qte, 0)`,
    )
    invariants['(info) instructions PRET_A_PRODUIRE avec une face hors {4,5,7,8,9,10}'] =
      await compte(
        `SELECT COUNT(DISTINCT i.instr_code) AS n FROM instruction_train i JOIN tf_face_train f ON f.instr_code = i.instr_code WHERE i.statut = 'PRET_A_PRODUIRE' AND f.statut NOT IN ('ANNULE','A_IMPRIMER','A_EXPEDIER','TERMINE','EXPORT_PREPA','AU_ROULAGE')`,
      )
  })

  // ═════════════════════════ Rapport ═════════════════════════
  const total = (Date.now() - debut) / 1000
  const rapport = {
    importeLe: new Date().toISOString(),
    source: dossierCsv,
    dureeSecondes: total,
    durees,
    volumes,
    rejets: [...rejets.values()].sort((a, b) => b.n - a.n),
    transformations: Object.fromEntries(transformations),
    invariants,
  }
  const fichier = join(dossierCsv, `rapport-import-${rapport.importeLe.replace(/[:.]/g, '-')}.json`)
  writeFileSync(fichier, JSON.stringify(rapport, null, 2))
  console.log('\nVolumes importés :')
  for (const [m, n] of Object.entries(volumes))
    console.log(`  ${m.padEnd(24)} ${String(n).padStart(8)}`)
  console.log('\nRejets (motif · RG) :')
  for (const r of rapport.rejets)
    console.log(`  ${String(r.n).padStart(7)}  ${r.table} · ${r.motif} · ${r.regle}`)
  console.log('\nTransformations / hypothèses :')
  for (const [m, n] of transformations) console.log(`  ${String(n).padStart(7)}  ${m}`)
  console.log('\nInvariants (0 attendu, sauf « info ») :')
  for (const [m, n] of Object.entries(invariants)) console.log(`  ${String(n).padStart(7)}  ${m}`)
  // Statistiques du planificateur SQLite après le chargement massif (sinon plans d'index inadaptés).
  await optimiserStatistiques(db)
  console.log(`\nImport terminé en ${total.toFixed(1)} s. Rapport : ${fichier}`)
  if (Object.entries(invariants).some(([k, n]) => !k.startsWith('(info)') && n > 0))
    process.exitCode = 2
} finally {
  await db.$disconnect()
}
