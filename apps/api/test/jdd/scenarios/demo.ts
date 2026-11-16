// Famille « demo » (jeux de démonstration, `pnpm jdd:demo`) : alimente les écrans que les autres familles laissent vides,
// pour tester TOUS les scénarios à la main dans l'application (nominal, vide évité, limite, erreur visible).
// Les actions passent par les VRAIS services (API inject) : rouleurs, impression / modification / réimpression des bagues,
// dispatch, export des trains, générateur de fichiers (Vendôme), suivi 8 m², unitaire (libération, colisage, rendre la
// main, comptage du pliage, encollage du Bus), colis et fin de journée, déblocage, thèmes (demandes, verdicts), alertes
// (règles, acquittements), corrections Broadcast, Instruction OK, administration des plateformes. Les référentiels purs
// (surfaces, types, droits de préparation, jours de départ, alternance, adresses et transports de destinataires,
// correspondance surface × format) et les lignes qui imitent une alimentation Broadcast (lignes attendues, état des
// réservations) sont insérés par les factories, comme dans les tests d'intégration. Seul le « temps qui passe » (palettes
// à contrôler depuis plus de 24 h, réception inconnue ancienne) est simulé en reculant des dates sur des lignes créées ici.
// RG : RG-REC-112, 135, 182, 183, 185, 186, 189, 190 ; RG-COO-033, 056, 057, 066, 068, 069, 070, 140 à 149, 217, 218, 237,
// 240, 243, 244, 247, 249, 250, 260, 261, 265, 269, 271, 291 à 296, 298 à 302, 304 ; RG-ADM-040 à 044 ; RG-X-050, 059, 087.
// Volume : 2 sites (plateforme, 3 ateliers, 6 utilisateurs, destinataires) ; ~150 dossiers au total (réceptions, 14 trains
// exportés ou non, 1 train imminent), ~40 lignes de préparation fixe / pliage / bus, 6 groupes de déblocage ; ~1 500
// enregistrements. Dépend de `volume` seulement par le nombre de trains supplémentaires (≤ 12). État attendu : chaque
// écran de la liste du brief a de quoi tester ses cas (voir les compteurs du scénario), aucun rejet inattendu (un scénario
// valide qui reçoit un code d'erreur s'arrête), reproductible (même seed = mêmes données). Base de test : les paramètres
// globaux modifiés sont restaurés à la fin ; la file des mails et le journal des tâches ne sont traités que sur la base de
// dev (le traitement agit sur toute la file, y compris les lignes d'autres passages).
import { formatSemaineIso, lundiSemaineIso, semaineIsoDe, type SemaineIso } from '@circe/shared'
import type { Prisma, StatutProduction } from '../../../src/generated/prisma/client.ts'
import { withTransaction } from '../../../src/core/transaction.ts'
import { annulerDossier } from '../../../src/modules/coordination/integration.ts'
import * as f from '../../factories/index.ts'
import { ecrire, exiger, lireApi, poster, creerLigne, recevoirBl, type Reponse } from '../api.ts'
import { creerSite, type Jdd, type SiteJdd } from '../contexte.ts'
import {
  chaineFixe,
  controler,
  creerInconnue,
  dossierAvecLignes,
  finDeJournee,
  ligneRepartition,
  rattacherInconnue,
  recevoirLignes,
  validerAffiche,
  appelUnitaire,
  type DossierJdd,
} from '../monde.ts'
import { annonceur as tirerAnnonceur, theme as tirerTheme } from '../prng.ts'
import type { Scenario } from './index.ts'

const HEURE = 3_600_000
const JOUR = 24 * HEURE

// Cast typé du corps JSON d'une réponse déjà validée par `exiger` (2xx) ; les formes sont celles des schémas partagés.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const corps = <T>(r: Reponse) => r.body as T

/** Base de test : les modifications de paramètres globaux sont défaites à la fin (la purge ne les voit pas). */
const estBaseDeTest = () => (process.env['DATABASE_URL'] ?? '').endsWith('test.db')

const departLe = (s: SemaineIso) => new Date(lundiSemaineIso(s).getTime() + JOUR + 16 * HEURE)
const plus = (s: SemaineIso, n: number) =>
  semaineIsoDe(new Date(lundiSemaineIso(s).getTime() + n * 7 * JOUR))

// ───────────────────────────── paramètres globaux (restaurés en base de test) ─────────────────────────────

class Parametres {
  private readonly defaire: (() => Promise<unknown>)[] = []
  constructor(private readonly jdd: Jdd) {}

  /** Ajoute une valeur à un paramètre liste (« a;b ») ; le crée s'il n'existe pas. */
  async ajouter(cle: string, valeur: string): Promise<void> {
    const { db } = this.jdd.ctx
    const existant = await db.parametre.findFirst({ where: { cle, plateformeId: null } })
    if (existant) {
      const liste = existant.valeur.split(';').filter(Boolean)
      if (liste.includes(valeur)) return
      await db.parametre.update({
        where: { id: existant.id },
        data: { valeur: [...liste, valeur].join(';') },
      })
      this.defaire.push(() =>
        db.parametre.update({ where: { id: existant.id }, data: { valeur: existant.valeur } }),
      )
    } else {
      const p = await db.parametre.create({ data: { cle, valeur } })
      this.defaire.push(() => db.parametre.delete({ where: { id: p.id } }))
    }
  }

  async restaurer(): Promise<void> {
    if (!estBaseDeTest()) return
    while (this.defaire.length > 0) await this.defaire.pop()?.()
  }
}

// ───────────────────────────── contexte de la génération ─────────────────────────────

interface Reperes {
  types: { fixe: number; pliage: number; bus: number }
  surfaces: { m2: number; m8: number }
  rouleurs: { id: number; nom: string }[]
}

interface Demo {
  jdd: Jdd
  a: SiteJdd
  b: SiteJdd
  params: Parametres
  rep: Reperes
}

const c = (jdd: Jdd, nom: string, n = 1) => {
  jdd.compter(`demo.${nom}`, n)
}

// ───────────────────────────── outils de construction ─────────────────────────────

/** Réception réelle (BL) de lignes attendues déjà créées. */
const recevoir = (
  d: Demo,
  site: SiteJdd,
  lignes: Awaited<ReturnType<typeof creerLigne>>[],
  fraction = 1,
) => recevoirLignes(d.jdd, site, lignes, fraction)

interface OptionsTrain {
  atelierId?: number
  semaine?: SemaineIso
  statutFace?: StatutProduction
  statutInstruction?: 'EN_COURS' | 'INSTRUCTION_OK' | 'PRET_A_PRODUIRE'
  annonceur?: string
  /** Visuels reçus par la réception (BL réel) : tous, aucun, ou les n premiers. */
  recus?: 'tous' | 'aucun' | number
  dateDepart?: Date
  jourDepartId?: number | null
  extra?: Partial<Prisma.FaceTrainUncheckedCreateInput>
}

/**
 * Train dont chaque position est une face d'un dossier / d'une instruction propre (exportable) ; les visuels sont reçus
 * par la réception (couverture, RG-COO-208) et chaque instruction porte son détail.
 */
async function creerTrain(d: Demo, site: SiteJdd, themes: string[], o: OptionsTrain = {}) {
  const { jdd } = d
  const db = jdd.ctx.db
  const sem = o.semaine ?? jdd.depart
  const atelierId = o.atelierId ?? site.ateliers.scroll.id
  const trainId = `8${String(f.next()).padStart(15, '0')}`
  const annonceur = o.annonceur ?? tirerAnnonceur(jdd.rng)
  const support = jdd.rng.choisir(site.supports)
  const destinataire = jdd.rng.choisir(site.destinataires)
  const faces = []
  const lignes = []
  let rang = 0
  for (const theme of themes) {
    const dossier = await f.createDossier(db, {
      contNum: jdd.contNum(),
      annonceur,
      statut: 'PREPARATION_RECUE',
    })
    const instruction = await f.createInstruction(db, {
      atelierId,
      dossierId: dossier.id,
      contNum: dossier.contNum,
      annonceur,
      contAnbas: sem.annee,
      contSembas: sem.semaine,
      statut: o.statutInstruction ?? 'INSTRUCTION_OK',
      iokMode: 'MANUEL',
    })
    await f.createInstructionDetail(db, {
      instructionCode: instruction.code,
      cadrIdent: rang + 1,
      cadreLib: `Cadre ${String(rang + 1)}`,
      supportId: support.id,
      afchIdent: rang + 1,
      theme,
      type: 'visuel',
    })
    lignes.push(
      await creerLigne(jdd, site, {
        contNum: dossier.contNum,
        annonceur,
        theme,
        themeCle: theme.toUpperCase(),
        supportId: support.id,
        qteBc: 10,
        semAnnee: sem.annee,
        semNum: sem.semaine,
      }),
    )
    faces.push(
      await f.createFaceTrain(db, {
        instructionCode: instruction.code,
        statut: o.statutFace ?? 'INSTRUCTION_OK',
        atelierId,
        supportId: support.id,
        destinataireId: destinataire.id,
        contNum: dossier.contNum,
        contAnnonc: annonceur,
        dateDepart: o.dateDepart ?? departLe(sem),
        contAnbas: sem.annee,
        contSembas: sem.semaine,
        depAnbas: sem.annee,
        depSembas: sem.semaine,
        trainId,
        theme,
        ordreReel: ++rang,
        refPanel: `P${String(f.next())}`,
        afficheurNom: `AFFICHEUR ${jdd.rng.choisir(['NORD', 'SUD', 'EST', 'OUEST'])}`,
        emplAdresse1: 'Rue du Jeu de Données',
        ...(o.jourDepartId ? { jourDepartId: o.jourDepartId } : {}),
        ...o.extra,
      }),
    )
  }
  const aRecevoir = o.recus === 'aucun' ? 0 : typeof o.recus === 'number' ? o.recus : lignes.length
  if (aRecevoir > 0) await recevoir(d, site, lignes.slice(0, aRecevoir))
  jdd.compter('demo.trains')
  jdd.compter('instructions', themes.length)
  jdd.compter('faces', themes.length)
  return { trainId, faces, lignes, atelierId }
}

/** Version (empreinte) d'un train, lue par la fiche : exigée par les actions groupées sur les trains. */
async function versionTrain(jdd: Jdd, site: SiteJdd, trainId: string): Promise<string> {
  const r = exiger(
    await lireApi(jdd, `/api/coordination/trains/${trainId}`, site.users.coord.headers),
    `fiche du train ${trainId}`,
  )
  return corps<{ version: string }>(r).version
}
async function versions(jdd: Jdd, site: SiteJdd, ids: string[]) {
  const l = []
  for (const trainId of ids) l.push({ trainId, version: await versionTrain(jdd, site, trainId) })
  return l
}

const exporter = (jdd: Jdd, site: SiteJdd, depart: SemaineIso) =>
  poster(jdd, '/api/coordination/trains/export', site.users.coord.headers, {
    depart: formatSemaineIso(depart),
    simulation: false,
  })

const ref = (r: { id: number; version: number }) => ({ id: r.id, version: r.version })
const repLue = (jdd: Jdd, id: number) => jdd.ctx.db.repartition.findUniqueOrThrow({ where: { id } })

// ───────────────────────────── 1. référentiels ─────────────────────────────

async function referentiels(d: Demo): Promise<void> {
  const { jdd, a, b } = d
  const { db } = jdd.ctx
  const coord = (s: SiteJdd) => s.users.admin.headers

  // Coordonnées, id de site Broadcast (déblocage) et mail de déblocage : par l'administration des plateformes.
  let k = 0
  for (const [site, nom, ville, cp] of [
    [a, 'Plateforme Démo Nord', 'Lille', '59000'],
    [b, 'Plateforme Démo Sud', 'Nîmes', '30000'],
  ] as const) {
    const p = await db.plateforme.findUniqueOrThrow({ where: { id: site.plateforme.id } })
    exiger(
      await ecrire(jdd, 'PATCH', `/api/admin/plateformes/${String(p.id)}`, coord(site), {
        version: p.version,
        nom: `${nom} ${String(jdd.seed)}`,
        adresse1: `${String(10 + k)} rue des Jeux de Données`,
        codePostal: cp,
        localite: ville,
        telephone: `04 00 00 00 0${String(k + 1)}`,
        mailDeblocage: `preprod.${String(jdd.seed)}.${String(k)}@exemple.test, chef.${String(jdd.seed)}.${String(k)}@exemple.test`,
        idSiteCcf: 5_000_000 + jdd.seed * 1000 + k,
      }),
      'coordonnées de la plateforme',
    )
    // Adresses de réception et imprimantes cibles (une imprimante désactivée).
    for (const adresse of [
      `reception.${String(jdd.seed)}.${String(k)}@exemple.test`,
      `quai.${String(jdd.seed)}.${String(k)}@exemple.test`,
    ])
      exiger(
        await poster(
          jdd,
          `/api/admin/plateformes/${String(p.id)}/adresses-reception`,
          coord(site),
          { adresse },
        ),
        'adresse de réception',
      )
    let derniere: { id: number; version: number } | undefined
    for (const imp of ['IMP-RACK-1', 'IMP-RACK-2', 'IMP-QUAI']) {
      const r = exiger(
        await poster(jdd, `/api/admin/plateformes/${String(p.id)}/imprimantes`, coord(site), {
          nom: `${imp}-${String(jdd.seed)}-${String(k)}`,
        }),
        'imprimante',
      )
      derniere = corps<{ imprimantes: { id: number; version: number; nom: string }[] }>(
        r,
      ).imprimantes.find((i) => i.nom.startsWith(imp))
    }
    if (derniere)
      exiger(
        await ecrire(
          jdd,
          'PATCH',
          `/api/admin/plateformes/${String(p.id)}/imprimantes/${String(derniere.id)}`,
          coord(site),
          { actif: false, version: derniere.version },
        ),
        'désactivation de l’imprimante',
      )
    c(jdd, 'plateformes')
    k++
  }

  // Ateliers lisibles.
  for (const [site, libs] of [
    [a, ['Atelier fixe 2 m²', 'Déroulant A', 'Déroulant B (8 m²)']],
    [b, ['Atelier fixe Sud', 'Déroulant Sud', 'Déroulant Sud 2']],
  ] as const) {
    const ids = [site.ateliers.fixe.id, site.ateliers.scroll.id, site.ateliers.scroll2.id]
    for (const [i, id] of ids.entries())
      await db.atelier.update({
        where: { id },
        data: { libelle: `${libs[i] ?? 'Atelier'} ${String(jdd.seed)}` },
      })
  }

  // Destinataires : contact, adresse principale, transporteur et tarif par atelier (RG-COO-119 / 120, écran destinataires).
  const tarifs = ['CCF', 'X24', 'STD'] as const
  const villes = ['Lyon', 'Nantes', 'Toulouse', 'Rennes', 'Dijon', 'Metz', 'Tours', 'Pau'] as const
  let i = 0
  for (const site of [a, b])
    for (const dest of site.destinataires) {
      i++
      await db.destinataire.update({
        where: { id: dest.id },
        data: {
          nom: `Afficheur ${villes[i % villes.length] ?? 'Ville'} ${String(jdd.seed)}-${String(i)}`,
          ...(i % 3 !== 0
            ? {
                mail: `expedition.${String(jdd.seed)}.${String(i)}@exemple.test`,
                telephone: `01 00 00 00 ${String(10 + i)}`,
              }
            : {}),
        },
      })
      await db.destinataireAdresse.create({
        data: {
          destinataireId: dest.id,
          adresse1: `${String(i * 3)} avenue de la Démonstration`,
          codePostal: String(10000 + ((i * 3719) % 80000)).slice(0, 5),
          localite: villes[i % villes.length] ?? 'Ville',
          lieuDit: i % 2 === 0 ? 'Zone Quai 2' : null,
        },
      })
      for (const at of Object.values(site.ateliers))
        await db.transportDestinataire.create({
          data: {
            destinataireId: dest.id,
            atelierId: at.id,
            transporteur: 1 + ((i + at.id) % 3),
            tarif: jdd.rng.choisir(tarifs),
          },
        })
      c(jdd, 'destinataires')
    }

  // Surfaces, types de préparation, correspondance surface × format, droits de préparation.
  const m2 = await f.createSurface(db, { libelle: '2 m²', valeur: 2 })
  const m8 = await f.createSurface(db, { libelle: '8 m²', valeur: 8 })
  const types = {
    fixe: (await db.typePreparation.create({ data: { libelle: `2 m² fixe ${String(jdd.seed)}` } }))
      .id,
    pliage: (await db.typePreparation.create({ data: { libelle: `Pliage ${String(jdd.seed)}` } }))
      .id,
    bus: (await db.typePreparation.create({ data: { libelle: `Bus ${String(jdd.seed)}` } })).id,
  }
  for (const site of [a, b])
    for (const sup of site.supports)
      for (const s of [m2, m8])
        await db.correspondanceSupport.create({
          data: { idSurface: s.id, idFormat: f.next(), supportId: sup.id },
        })
  // RG-COO-141 : atelier fixe de A inclus pour tout et exclu pour le Bus ; atelier fixe de B limité à un type.
  await db.atelierDroitPrepa.create({
    data: {
      atelierId: a.ateliers.fixe.id,
      typePreparationId: null,
      surfaceId: null,
      exclusion: false,
    },
  })
  await db.atelierDroitPrepa.create({
    data: {
      atelierId: a.ateliers.fixe.id,
      typePreparationId: types.bus,
      surfaceId: null,
      exclusion: true,
    },
  })
  await db.atelierDroitPrepa.create({
    data: {
      atelierId: b.ateliers.fixe.id,
      typePreparationId: types.fixe,
      surfaceId: null,
      exclusion: false,
    },
  })
  await db.atelierDroitPrepa.create({
    data: {
      atelierId: b.ateliers.scroll.id,
      typePreparationId: null,
      surfaceId: m8.id,
      exclusion: false,
    },
  })

  // Jours de départ et paramètres d'alternance (références de convention, structures, produits : valeurs fictives).
  for (const j of ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'])
    await f.createJourDepart(db, { libelle: `${j} (démo ${String(jdd.seed)})` })
  const alternances = [
    ['ListeRefConventions', 'CONV-DEMO-01', 'Convention incluse dans l’alternance', true, true],
    ['ListeRefConventions', 'CONV-DEMO-02', 'Convention exclue de l’alternance', false, true],
    ['Structure', 'STRUCT-DEMO-A', 'Structure ville', true, true],
    ['Produit', 'PROD-DEMO-X', 'Produit paramétré (inactif)', true, false],
  ] as const
  for (const [code, valeur, description, estInclus, estActif] of alternances)
    await db.parametreAlternance.create({
      data: { code, valeur: `${valeur}-${String(jdd.seed)}`, description, estInclus, estActif },
    })

  // Types pliage et bus : paramètres globaux lus par l'écran unitaire (restaurés en base de test).
  await d.params.ajouter('unitaire.typesPliage', String(types.pliage))
  await d.params.ajouter('unitaire.typesBus', String(types.bus))
  // Atelier 8 m² (RG-COO-237) : le second déroulant du site A.
  await d.params.ajouter('suivi8m2.ateliers', String(a.ateliers.scroll2.id))

  d.rep.types = types
  d.rep.surfaces = { m2: m2.id, m8: m8.id }
}

// ───────────────────────────── 2. réception ─────────────────────────────

async function reception(d: Demo): Promise<void> {
  const { jdd } = d
  const { db } = jdd.ctx
  for (const [site, n] of [
    [d.a, 3],
    [d.b, 2],
  ] as const) {
    // Palettes à contrôler depuis plus de 24 h (RG-REC-189) : le temps qui passe est simulé en reculant les dates.
    for (let i = 0; i < n; i++) {
      const dossier = await dossierAvecLignes(jdd, site, { lignes: jdd.rng.entier(1, 2) })
      const r = await recevoirLignes(jdd, site, dossier.lignes)
      const heures = [26, 40, 75][i % 3] ?? 26
      const depuis = new Date(Date.now() - heures * HEURE)
      await db.reception.update({
        where: { id: r.receptionId },
        data: { aControlerDepuis: depuis, dateArrivee: depuis },
      })
      c(jdd, 'palettes.en.retard')
    }
    // Palette récente (23 h : limite, aucune alerte) et palette contrôlée.
    const recente = await dossierAvecLignes(jdd, site, { lignes: 1 })
    const rr = await recevoirLignes(jdd, site, recente.lignes)
    await db.reception.update({
      where: { id: rr.receptionId },
      data: { aControlerDepuis: new Date(Date.now() - 23 * HEURE) },
    })
    const ctrl = await dossierAvecLignes(jdd, site, { lignes: 2 })
    const rc = await recevoirLignes(jdd, site, ctrl.lignes)
    exiger(await controler(jdd, site, rc.receptionId), 'contrôle')
    // Surplus (écart > seuil, RG-REC-183) : contrôle avec +50 %.
    for (let i = 0; i < 2; i++) {
      const s = await dossierAvecLignes(jdd, site, { lignes: 1, qteBc: () => 40 })
      const rs = await recevoirLignes(jdd, site, s.lignes)
      exiger(await controler(jdd, site, rs.receptionId, { ecart: 20 }), 'contrôle avec surplus')
      c(jdd, 'surplus')
    }
    // Visuel reçu en partie (RG-REC-182), visuel non reçu (ligne attendue sans réception).
    for (let i = 0; i < 2; i++) {
      const p = await dossierAvecLignes(jdd, site, { lignes: 1, qteBc: () => 40 })
      await recevoirLignes(jdd, site, p.lignes, 0.5)
      c(jdd, 'partielles')
    }
    await dossierAvecLignes(jdd, site, { lignes: 2 })
    c(jdd, 'non.recus')
  }

  const { a } = d
  const recep = a.users.recep.headers
  const coord = a.users.coord.headers
  // Réceptions inconnues : récentes, ancienne (> 24 h), signalée « Dossier introuvable » (RG-REC-112, 185, 186).
  const inconnues = []
  for (const q of [30, 55, 80, 120, 200]) inconnues.push(await creerInconnue(jdd, a, q))
  const [i1, i2, i3, i4] = inconnues
  if (!i1 || !i2 || !i3 || !i4) throw new Error('inconnues non créées')
  for (const x of [i3]) {
    const rec = await db.reception.findUniqueOrThrow({ where: { id: x.receptionId } })
    exiger(
      await poster(jdd, `/api/affiches/${String(x.afficheId)}/signaler`, recep, {
        receptionVersion: rec.version,
      }),
      'signalement introuvable',
    )
    c(jdd, 'introuvables')
  }
  await db.reception.update({
    where: { id: i2.receptionId },
    data: { dateArrivee: new Date(Date.now() - 60 * HEURE) },
  })
  // Rattachements d'inconnues : 1 dossier (doute « BL ») puis 3 dossiers (doute « BL » + « répartition à confirmer »).
  const cible1 = await dossierAvecLignes(jdd, a, { lignes: 1 })
  exiger(
    await rattacherInconnue(
      jdd,
      i1.afficheId,
      [{ ligneAttendueId: cible1.lignes[0]?.id ?? 0, quantite: 30 }],
      coord,
    ),
    'rattachement',
  )
  const multi = []
  for (let k = 0; k < 3; k++) multi.push(await dossierAvecLignes(jdd, a, { lignes: 1 }))
  exiger(
    await rattacherInconnue(
      jdd,
      i4.afficheId,
      multi.map((m, k) => ({
        ligneAttendueId: m.lignes[0]?.id ?? 0,
        quantite: [60, 35, 25][k] ?? 0,
      })),
      coord,
    ),
    'rattachement multiple',
  )
  c(jdd, 'inconnues', inconnues.length)

  // Thème corrigé par la réception : feuille de stock à refaire (RG-REC-135) et validation à confirmer.
  const th = await dossierAvecLignes(jdd, a, { lignes: 2 })
  const r = await recevoirLignes(jdd, a, [th.lignes[0] as (typeof th.lignes)[number]])
  const aff = await db.affiche.findUniqueOrThrow({ where: { id: r.affiches[0]?.id ?? 0 } })
  const lien = await db.afficheAttendue.findFirstOrThrow({
    where: { afficheId: aff.id, actif: true },
  })
  exiger(await validerAffiche(jdd, a, aff.id), 'validation avant changement de thème')
  const aff2 = await db.affiche.findUniqueOrThrow({ where: { id: aff.id } })
  exiger(
    await poster(jdd, `/api/affiches/${String(aff.id)}/changer-theme`, recep, {
      version: aff2.version,
      lienId: lien.id,
      nouvelleLigneId: th.lignes[1]?.id ?? 0,
    }),
    'changement de thème',
  )
  // Rebut sur une affiche reçue (mouvement de stock).
  const rb = await dossierAvecLignes(jdd, a, { lignes: 1, qteBc: () => 30 })
  const rrb = await recevoirLignes(jdd, a, rb.lignes)
  exiger(
    await poster(jdd, `/api/affiches/${String(rrb.affiches[0]?.id ?? 0)}/rebut`, recep, {
      quantite: 3,
      motif: 'AUTRE',
    }),
    'rebut',
  )
}

// ───────────────────────────── 3. dossiers, validation admin, Instruction OK, Broadcast ─────────────────────────────

/** Instruction « En cours » (ou « Instruction OK ») d'un dossier à plusieurs lignes, un détail par ligne. */
async function instructionDeDossier(
  d: Demo,
  site: SiteJdd,
  dossier: DossierJdd,
  statut: 'EN_COURS' | 'INSTRUCTION_OK',
) {
  const { jdd } = d
  const db = jdd.ctx.db
  const instruction = await f.createInstruction(db, {
    atelierId: site.ateliers.scroll.id,
    dossierId: dossier.dossier.id,
    contNum: dossier.dossier.contNum,
    annonceur: dossier.annonceur,
    contAnbas: jdd.depart.annee,
    contSembas: jdd.depart.semaine,
    statut,
    iokMode: statut === 'INSTRUCTION_OK' ? 'MANUEL' : null,
  })
  let rang = 0
  for (const l of dossier.lignes) {
    rang++
    await f.createInstructionDetail(db, {
      instructionCode: instruction.code,
      cadrIdent: rang,
      cadreLib: `Cadre ${String(rang)}`,
      supportId: l.supportId,
      afchIdent: rang,
      theme: l.theme,
      type: 'visuel',
    })
    await f.createFaceTrain(db, {
      instructionCode: instruction.code,
      statut: 'A_TRAITER',
      atelierId: site.ateliers.scroll.id,
      supportId: l.supportId,
      destinataireId: jdd.rng.choisir(site.destinataires).id,
      contNum: dossier.dossier.contNum,
      contAnnonc: dossier.annonceur,
      dateDepart: departLe(jdd.depart),
      contAnbas: jdd.depart.annee,
      contSembas: jdd.depart.semaine,
      depAnbas: jdd.depart.annee,
      depSembas: jdd.depart.semaine,
      trainId: `8${String(f.next()).padStart(15, '0')}`,
      theme: l.theme,
      ordreReel: rang,
      refPanel: `P${String(f.next())}`,
      afficheurNom: 'AFFICHEUR NORD',
      emplAdresse1: 'Rue du Jeu de Données',
    })
  }
  c(jdd, 'instructions.dossier')
  return instruction
}

async function dossiers(d: Demo): Promise<void> {
  const { jdd, a } = d
  const { db } = jdd.ctx
  const coord = a.users.coord.headers

  // Dossiers reçus, contrôlés, validés : leur instruction passe « Instruction OK » (manuelle, RG-COO-044).
  for (let i = 0; i < 4; i++) {
    const dos = await dossierAvecLignes(jdd, a, { lignes: 2, statut: 'PREPARATION_RECUE' })
    const r = await recevoirLignes(jdd, a, dos.lignes)
    exiger(await controler(jdd, a, r.receptionId), 'contrôle')
    for (const af of r.affiches) exiger(await validerAffiche(jdd, a, af.id), 'validation admin')
    const ins = await instructionDeDossier(d, a, dos, 'EN_COURS')
    if (i < 2) {
      exiger(
        await poster(jdd, '/api/coordination/instruction-ok', coord, {
          instructions: [{ code: ins.code, version: ins.version }],
        }),
        'Instruction OK',
      )
      c(jdd, 'instruction.ok')
    }
  }
  // Instruction « En cours » avec réception partielle, sans réception : à confirmer.
  for (let i = 0; i < 2; i++) {
    const dos = await dossierAvecLignes(jdd, a, { lignes: 2, statut: 'PREPARATION_RECUE' })
    if (i === 0) await recevoirLignes(jdd, a, dos.lignes, 0.5)
    await instructionDeDossier(d, a, dos, 'EN_COURS')
  }

  // Écarts Broadcast / Circé (RG-COO-067 / 086) : quantité de la préparation ≠ quantité Broadcast.
  const ecarts: DossierJdd[] = []
  for (let i = 0; i < 4; i++) {
    const dos = await dossierAvecLignes(jdd, a, {
      lignes: 2,
      statut: 'PREPARATION_RECUE',
      qteBc: () => 10,
      ligne: { qtePrepa: 8, source: 'PREPA' },
    })
    await instructionDeDossier(d, a, dos, 'EN_COURS')
    ecarts.push(dos)
    c(jdd, 'ecarts.broadcast')
  }
  // « Appliquer la version Broadcast » (RG-COO-056) sur le premier ; « Demander une correction » (RG-COO-057) sur deux.
  const premier = ecarts[0]
  if (premier) {
    const doss = await db.dossier.findUniqueOrThrow({ where: { id: premier.dossier.id } })
    exiger(
      await poster(jdd, `/api/coordination/dossiers/${String(doss.id)}/version-broadcast`, coord, {
        version: doss.version,
      }),
      'version Broadcast',
    )
  }
  for (const x of ecarts.slice(1, 3))
    exiger(
      await poster(jdd, `/api/coordination/dossiers/${String(x.dossier.id)}/corrections`, coord, {
        note: 'Quantité de la préparation à revoir avec la Pré-Prod.',
      }),
      'demande de correction',
    )
  c(jdd, 'corrections', 2)

  // Dossier annulé (vente annulée dans Broadcast) : ligne annulée portant une affiche à re-rattacher (RG-COO-032).
  const an = await dossierAvecLignes(jdd, a, { lignes: 1 })
  await recevoirLignes(jdd, a, an.lignes)
  await withTransaction(db, (tx) => annulerDossier(tx, an.dossier.contNum))
  c(jdd, 'annules')

  // Réception d'affiches sur un dossier sans IP (ligne provisoire / sans thème, RG-COO-071) : par la réception.
  const sansIp = await dossierAvecLignes(jdd, a, {
    lignes: 1,
    ligne: { theme: null, themeCle: null, provisoire: true },
  })
  await recevoirBl(
    jdd,
    a,
    sansIp.lignes.map((l) => ({
      ligneAttendueId: l.id,
      quantite: 12,
      intituleSaisi: 'Lu sur l’affiche (sans IP)',
    })),
  )
  c(jdd, 'sans.ip')
}

// ───────────────────────────── 4. vérification des thèmes ─────────────────────────────

async function themes(d: Demo): Promise<void> {
  const { jdd, a } = d
  const { db } = jdd.ctx
  const coord = a.users.coord.headers
  const s1 = plus(jdd.semaine, 1)
  const s2 = plus(jdd.semaine, 2)
  const t = String(jdd.seed)

  /** Deux dossiers d'un même annonceur, deux intitulés proches (RG-COO-069). */
  async function paire(annonceur: string, t1: string, t2: string) {
    const d1 = await f.createDossier(db, { contNum: jdd.contNum(), annonceur })
    const d2 = await f.createDossier(db, { contNum: jdd.contNum(), annonceur })
    for (const [dos, theme, sem] of [
      [d1, t1, s1],
      [d2, t2, s2],
    ] as const)
      await creerLigne(jdd, a, {
        contNum: dos.contNum,
        annonceur,
        theme,
        themeCle: theme.toUpperCase(),
        semAnnee: sem.annee,
        semNum: sem.semaine,
        supportId: a.supports[0]?.id ?? 0,
      })
    return { d1, d2 }
  }
  const groupe = async (url: string, dossier: number) => {
    const r = exiger(
      await lireApi(jdd, `${url}?dossier=${String(dossier)}`, coord),
      'lecture des groupes',
    )
    return corps<{ groupes: { cle: string; statut: string }[] }>(r).groupes[0]
  }

  const proches = [
    ['Boulangerie Les Délices', 'Menu burger', 'MENU BURGERS'],
    ['Garage Central Auto', 'Offre rentrée été', 'Offre rentree ete'],
    ['Pharmacie du Marché', 'Soins hiver gamme', 'SOINS HIVER GAMMES'],
    ['Cinéma Le Rex Palace', 'Soirée festival', 'Soirée festivals'],
  ] as const
  const dossiersTh = []
  for (const [i, [nom, t1, t2]] of proches.entries()) {
    const p = await paire(`${nom} ${t}-${String(i)}`, t1, t2)
    dossiersTh.push(p)
    const g = await groupe('/api/coordination/themes/proches', p.d1.contNum)
    if (!g) throw new Error(`groupe de thèmes proches introuvable (${nom})`)
    if (i === 0) {
      // Demande de correction à Broadcast : le groupe passe « Demande envoyée ».
      exiger(
        await poster(jdd, '/api/coordination/themes/demandes', coord, {
          type: 'THEMES',
          cle: g.cle,
          correct: t1,
          note: 'Harmoniser l’intitulé du thème.',
        }),
        'demande de thème',
      )
      c(jdd, 'themes.demandes')
    } else if (i === 1) {
      exiger(
        await poster(jdd, '/api/coordination/themes/verdicts', coord, {
          type: 'THEMES',
          cle: g.cle,
          verdict: 'DIFFERENTS',
        }),
        'verdict visuels différents',
      )
      c(jdd, 'themes.verdicts')
    } else if (i === 2) {
      // Verdict puis réouverture : une décision inactive reste dans l'historique.
      for (const verdict of ['DIFFERENTS', 'ROUVRIR'] as const)
        exiger(
          await poster(jdd, '/api/coordination/themes/verdicts', coord, {
            type: 'THEMES',
            cle: g.cle,
            verdict,
          }),
          'verdict',
        )
      c(jdd, 'themes.verdicts', 2)
    }
    // i === 3 : reste « À vérifier » (alerte ouverte).
  }
  // Même intitulé sur deux dossiers : « Même intitulé », aucune alerte (limite).
  await paire(`Restaurant La Table Ronde ${t}`, 'Rentrée', 'Rentrée')

  // Annonceurs proches (RG-COO-070) : un groupe laissé ouvert, un tranché « Annonceurs différents ».
  for (const [i, [a1, a2]] of [
    [`Brasserie du Port ${t}`, `BRASSERIE PORT ${t}`],
    [`Auto École Moderne ${t}`, `AUTO ECOLE MODERNE ${t}`],
  ].entries()) {
    const d1 = await f.createDossier(db, { contNum: jdd.contNum(), annonceur: a1 ?? '' })
    const d2 = await f.createDossier(db, { contNum: jdd.contNum(), annonceur: a2 ?? '' })
    for (const dos of [d1, d2])
      await creerLigne(jdd, a, {
        contNum: dos.contNum,
        annonceur: dos.annonceur,
        theme: tirerTheme(jdd.rng, f.next() % 1000),
        semAnnee: s1.annee,
        semNum: s1.semaine,
        supportId: a.supports[0]?.id ?? 0,
      })
    if (i === 1) {
      const g = await groupe('/api/coordination/themes/annonceurs', d1.contNum)
      if (!g) throw new Error('groupe d’annonceurs introuvable')
      exiger(
        await poster(jdd, '/api/coordination/themes/verdicts', coord, {
          type: 'ANNONCEURS',
          cle: g.cle,
          verdict: 'DIFFERENTS',
        }),
        'verdict annonceurs différents',
      )
      c(jdd, 'themes.verdicts')
    }
  }

  // Thèmes modifiés dans Broadcast après la validation (RG-COO-068) : avant production (x2) et production lancée (x1).
  const modifies = []
  for (let i = 0; i < 3; i++) {
    const annonceur = `Salon Habitat ${t}-${String(i)}`
    const dos = await f.createDossier(db, { contNum: jdd.contNum(), annonceur })
    const l = await creerLigne(jdd, a, {
      contNum: dos.contNum,
      annonceur,
      theme: `Nouveau thème ${String(i + 1)}`,
      themeCle: `NOUVEAU THEME ${String(i + 1)}`,
      semAnnee: s1.annee,
      semNum: s1.semaine,
      supportId: a.supports[0]?.id ?? 0,
    })
    const aff = await f.createAffiche(db, {
      plateformeId: a.plateforme.id,
      supportId: a.supports[0]?.id ?? 0,
      contNum: dos.contNum,
      theme: `Ancien thème ${String(i + 1)}`,
      themeModifie: true,
    })
    await f.createRattachement(db, { afficheId: aff.id, ligneAttendueId: l.id })
    if (i === 2) {
      const ins = await f.createInstruction(db, { contNum: dos.contNum, statut: 'PRET_A_PRODUIRE' })
      await f.createFaceTrain(db, {
        instructionCode: ins.code,
        contNum: dos.contNum,
        statut: 'EXPORT_PREPA',
      })
    }
    modifies.push(l)
    c(jdd, 'themes.modifies.broadcast')
  }
  // « Reprendre la version Broadcast » sur la première ligne.
  const l0 = modifies[0]
  if (l0) {
    const frais = await db.receptionAttendue.findUniqueOrThrow({ where: { id: l0.id } })
    exiger(
      await poster(jdd, `/api/coordination/themes/broadcast/${String(l0.id)}/reprendre`, coord, {
        version: frais.version,
      }),
      'reprise du thème Broadcast',
    )
  }
}

// ───────────────────────────── 5. trains, export, rouleurs, dispatch, bagues, générateur, 8 m² ─────────────────────────────

async function roulage(d: Demo): Promise<void> {
  const { jdd, a, b } = d
  const { db } = jdd.ctx
  const coord = a.users.coord.headers
  const cheq = a.users.cheq.headers
  const jours = await db.jourDepart.findMany({ orderBy: { id: 'desc' }, take: 5 })
  const jour = (i: number) => jours[i % Math.max(1, jours.length)]?.id ?? null

  // Rouleurs (référentiel, RG-COO-297) : 4 sur le déroulant A (dont un poste et un désactivé), 2 sur B, 1 sur le site Sud.
  const creerRouleur = async (site: SiteJdd, atelierId: number, nom: string, poste?: string) =>
    corps<{ id: number; version: number }>(
      exiger(
        await poster(jdd, '/api/coordination/rouleurs', site.users.admin.headers, {
          nom,
          atelierId,
          ...(poste ? { poste } : {}),
        }),
        'rouleur',
      ),
    )
  const r1 = await creerRouleur(
    a,
    a.ateliers.scroll.id,
    `Rouleur Alix ${String(jdd.seed)}`,
    'Table 1',
  )
  const r2 = await creerRouleur(
    a,
    a.ateliers.scroll.id,
    `Rouleur Camille ${String(jdd.seed)}`,
    'Table 2',
  )
  const r3 = await creerRouleur(a, a.ateliers.scroll.id, `Rouleur Dominique ${String(jdd.seed)}`)
  const r4 = await creerRouleur(a, a.ateliers.scroll.id, `Rouleur Ancien ${String(jdd.seed)}`)
  await creerRouleur(a, a.ateliers.scroll2.id, `Rouleur Eden ${String(jdd.seed)}`, 'Table 8 m²')
  await creerRouleur(a, a.ateliers.scroll2.id, `Rouleur Florian ${String(jdd.seed)}`)
  await creerRouleur(b, b.ateliers.scroll.id, `Rouleur Gaëlle ${String(jdd.seed)}`, 'Table 1')
  exiger(
    await ecrire(
      jdd,
      'PATCH',
      `/api/coordination/rouleurs/${String(r4.id)}`,
      a.users.admin.headers,
      {
        version: r4.version,
        actif: false,
      },
    ),
    'désactivation du rouleur',
  )
  c(jdd, 'rouleurs', 7)

  // Trains du site A (déroulant A) : prêts à imprimer, à dispatcher, à bagues, à envoyer à la machine.
  const nTh = (n: number) => Array.from({ length: n }, () => tirerTheme(jdd.rng, f.next() % 1000))
  const plan: [string, number, OptionsTrain][] = [
    ['bague', 1, {}],
    ['bague', 2, {}],
    ['bague', 3, {}],
    ['dispatch', 2, {}],
    ['dispatch', 1, {}],
    ['dispatch', 2, {}],
    ['generation', 2, {}],
    ['generation', 1, {}],
    ['generation', 3, {}],
    ['pret', 1, {}],
    ['pret', 2, {}],
    ['attente', 2, { recus: 'aucun' }],
    ['partiel', 3, { recus: 1 }],
  ]
  for (let i = 0; i < Math.min(12, Math.round(jdd.volume / 25)); i++)
    plan.push(['pret', jdd.rng.entier(1, 3), {}])
  const trains: Record<string, Awaited<ReturnType<typeof creerTrain>>[]> = {}
  let k = 0
  for (const [role, nb, opts] of plan) {
    const t = await creerTrain(d, a, nTh(nb), { ...opts, jourDepartId: jour(k++) })
    ;(trains[role] ??= []).push(t)
  }
  // Train imminent (départ dans < 24 h, cette semaine) : critique au dispatch (RG-COO-294).
  await creerTrain(d, a, nTh(2), {
    semaine: jdd.semaine,
    dateDepart: new Date(Date.now() + 20 * HEURE),
  })
  // Atelier 8 m² (déroulant B) : trains pour le suivi 8 m².
  for (let i = 0; i < 3; i++) await creerTrain(d, a, nTh(2), { atelierId: a.ateliers.scroll2.id })
  // Site Sud : quelques trains pour tester le filtre de site.
  for (let i = 0; i < 3; i++) await creerTrain(d, b, nTh(jdd.rng.entier(1, 2)))

  // Export des trains (RG-COO-213 / 218) : tous les trains « Instruction OK » passent « A imprimer » (lot n° 1).
  exiger(await exporter(jdd, a, jdd.depart), 'export des trains')
  exiger(await exporter(jdd, a, jdd.semaine), 'export des trains de la semaine')
  exiger(await exporter(jdd, b, jdd.depart), 'export des trains du site Sud')
  // Second lot : trains créés après le premier export, exportés à leur tour (historique de deux lots).
  for (let i = 0; i < 3; i++) await creerTrain(d, a, nTh(2))
  exiger(await exporter(jdd, a, jdd.depart), 'second export')
  // Trains « à imprimer » (export à faire) : créés après, restent « Instruction OK ».
  for (let i = 0; i < 4; i++) await creerTrain(d, a, nTh(jdd.rng.entier(1, 3)))
  c(jdd, 'exports', 4)

  // Dispatch (RG-COO-291 à 296) : affectation manuelle, proposition de répartition ; certains trains restent non affectés.
  const dispatch = trains['dispatch'] ?? []
  const prets = trains['pret'] ?? []
  const [d1, d2, d3] = dispatch
  if (d1)
    exiger(
      await poster(jdd, '/api/coordination/dispatch/affecter', cheq, {
        trains: await versions(jdd, a, [d1.trainId]),
        rouleurId: r1.id,
      }),
      'affectation au rouleur',
    )
  if (d2 && d3)
    exiger(
      await poster(jdd, '/api/coordination/dispatch/proposer', cheq, {
        atelierId: a.ateliers.scroll.id,
        trains: await versions(jdd, a, [d2.trainId, d3.trainId]),
      }),
      'répartition proposée',
    )
  const p0 = prets[0]
  if (p0)
    exiger(
      await poster(jdd, '/api/coordination/dispatch/affecter', cheq, {
        trains: await versions(jdd, a, [p0.trainId]),
        rouleurId: r2.id,
      }),
      'affectation au rouleur',
    )
  if (p0)
    exiger(
      await poster(jdd, '/api/coordination/dispatch/desaffecter', cheq, {
        atelierId: a.ateliers.scroll.id,
        trains: await versions(jdd, a, [p0.trainId]),
      }),
      'désaffectation',
    )
  c(jdd, 'dispatch')

  // Bagues (RG-COO-298 à 302) : impression (unités « En production »), modification des textes, réimpressions avec motif.
  const baguesTrains = trains['bague'] ?? []
  const [b1, b2, b3] = baguesTrains
  if (b1 && b2 && b3) {
    const impr = async (t: typeof b1, rouleurId: number) =>
      exiger(
        await poster(jdd, '/api/coordination/bagues/imprimer', cheq, {
          trains: await versions(jdd, a, [t.trainId]),
          rouleurId,
        }),
        'impression de bague',
      )
    await impr(b1, r1.id)
    await impr(b2, r2.id)
    await impr(b3, r3.id)
    const bg = async (t: typeof b1) => db.bague.findUniqueOrThrow({ where: { trainId: t.trainId } })
    // b1 : réimprimée avec « Colis perdu, refait » puis « Autre » (précision) ; b2 : textes modifiés ; b3 : « Bague abîmée ».
    let x = await bg(b1)
    exiger(
      await poster(jdd, '/api/coordination/bagues/reimprimer', cheq, {
        trainId: b1.trainId,
        version: x.version,
        motif: 'Colis perdu, refait',
      }),
      'réimpression',
    )
    x = await bg(b1)
    exiger(
      await poster(jdd, '/api/coordination/bagues/reimprimer', cheq, {
        trainId: b1.trainId,
        version: x.version,
        motif: 'Autre',
        precision: 'Palette tombée au quai',
      }),
      'réimpression avec précision',
    )
    x = await bg(b2)
    const textes = (
      JSON.parse(x.textes) as { lettre: string; annonceur: string; theme: string }[]
    ).map((tx, i) => ({
      lettre: tx.lettre,
      annonceur: i === 0 ? `${tx.annonceur} GROUPE` : tx.annonceur,
      theme: tx.theme,
    }))
    exiger(
      await poster(jdd, '/api/coordination/bagues/modifier', cheq, {
        trainId: b2.trainId,
        version: x.version,
        textes,
      }),
      'modification des textes de la bague',
    )
    x = await bg(b3)
    exiger(
      await poster(jdd, '/api/coordination/bagues/reimprimer', cheq, {
        trainId: b3.trainId,
        version: x.version,
        motif: 'Bague abîmée ou illisible',
      }),
      'réimpression',
    )
    c(jdd, 'bagues', 3)
  }

  // Générateur de fichiers (Vendôme, RG-COO-217 / 307 / 308) : un lot envoyé, un lot préparé, un lot avec complément.
  const gen = trains['generation'] ?? []
  const [g1, g2, g3] = gen
  const preparer = async (ids: string[]) =>
    corps<{ id: number; version: number }>(
      exiger(
        await poster(jdd, '/api/coordination/generateur', cheq, {
          depart: formatSemaineIso(jdd.depart),
          trains: await versions(jdd, a, ids),
        }),
        'préparation du lot',
      ),
    )
  if (g1) {
    const lot = await preparer([g1.trainId])
    exiger(
      await poster(jdd, '/api/coordination/generateur/envoyer', cheq, {
        id: lot.id,
        version: lot.version,
      }),
      'envoi du lot à la machine',
    )
  }
  if (g2) await preparer([g2.trainId])
  if (g3) {
    const lot = await preparer([g3.trainId])
    exiger(
      await poster(jdd, '/api/coordination/generateur/envoyer', cheq, {
        id: lot.id,
        version: lot.version,
      }),
      'envoi du lot à la machine',
    )
  }
  c(jdd, 'generation')

  // Suivi 8 m² (RG-COO-237) : saisies des demies haut / bas et des 8 m² finales, reste à faire.
  const suivi = corps<{ lignes: { contNum: number; theme: string; version: number }[] }>(
    exiger(
      await lireApi(
        jdd,
        `/api/coordination/trains/suivi-8m2?depart=${formatSemaineIso(jdd.depart)}&atelier=${String(a.ateliers.scroll2.id)}`,
        coord,
      ),
      'suivi 8 m²',
    ),
  ).lignes
  let saisies = 0
  for (const [i, l] of suivi.entries()) {
    if (i % 4 === 3) continue // une ligne sur quatre sans saisie (vide évité à l'écran : reste à faire = besoin)
    let version = l.version
    for (const [champ, valeur] of [
      ['demiesHaut', jdd.rng.entier(1, 3)],
      ['demiesBas', jdd.rng.entier(1, 3)],
      ['finales', jdd.rng.entier(0, 2)],
    ] as const) {
      exiger(
        await poster(jdd, '/api/coordination/trains/suivi-8m2', i % 2 === 0 ? cheq : coord, {
          atelierId: a.ateliers.scroll2.id,
          depart: formatSemaineIso(jdd.depart),
          contNum: l.contNum,
          theme: l.theme,
          champ,
          valeur,
          version,
        }),
        'saisie 8 m²',
      )
      version++
      saisies++
    }
  }
  c(jdd, 'suivi8m2.saisies', saisies)
}

// ───────────────────────────── 6. préparation fixe / pliage / bus, colis, expédition ─────────────────────────────

async function preparation(d: Demo): Promise<void> {
  const { jdd, a } = d
  const t = d.rep.types
  const expe = a.users.expe.headers
  const fixeId = a.ateliers.fixe.id
  const nomTheme = () => tirerTheme(jdd.rng, f.next() % 1000)

  /** Lignes de répartition de l'atelier fixe, liées (G1) ou non à un dossier réellement reçu. */
  const lignesRecues = async (n: number) => {
    const l = []
    for (let i = 0; i < n; i++) {
      const dos = await dossierAvecLignes(jdd, a, {
        lignes: 1,
        statut: 'PREPARATION_RECUE',
        qteBc: () => 20,
      })
      await recevoirLignes(jdd, a, dos.lignes)
      const lg = dos.lignes[0]
      if (!lg) continue
      l.push(
        await ligneRepartition(jdd, a, t.fixe, {
          atelierId: fixeId,
          contNum: dos.dossier.contNum,
          theme: lg.theme,
          annonceur: dos.annonceur,
          qte: jdd.rng.entier(5, 20),
        }),
      )
    }
    return l
  }
  const lignes = async (n: number, type: number) => {
    const l = []
    for (let i = 0; i < n; i++)
      l.push(
        await ligneRepartition(jdd, a, type, {
          atelierId: fixeId,
          theme: nomTheme(),
          qte: jdd.rng.entier(8, 60),
        }),
      )
    return l
  }
  const g1 = await lignesRecues(5) // expédiées et terminées
  const g2 = await lignesRecues(4) // colis clos (« A expédier »)
  const g3 = await lignes(4, t.fixe) // colis ouverts
  const g4 = await lignes(5, t.fixe) // main rendue / préparées
  const g5 = await lignes(4, t.fixe) // à coliser (quantité et intitulé corrigés)
  const pliage = await lignes(4, t.pliage)
  const bus = await lignes(5, t.bus)

  // Libération + « Colisage » + colis par destinataire (RG-COO-240 / 260 / 261 / 265) : G1 expédié puis fin de journée (RG-X-087).
  await chaineFixe(jdd, a, g1.map(ref), { expedier: true })
  const fin = exiger(await finDeJournee(jdd, a), 'fin de journée')
  jdd.compter('sorties.stock', corps<{ sortiesStock: number }>(fin).sortiesStock)
  // G2 : colis clos, non expédiés (fin de journée non passée) ; G3 : colis ouverts avec leurs UM.
  await chaineFixe(jdd, a, g2.map(ref), { expedier: true })
  await chaineFixe(jdd, a, g3.map(ref), { expedier: false })
  // Colis ouvert vide (premier destinataire d'un autre site : le colis est créé sans UM).
  exiger(
    await poster(jdd, '/api/coordination/colis', expe, {
      atelierId: fixeId,
      destinataireId: a.destinataires[0]?.id ?? 0,
    }),
    'colis vide',
  )

  // G4 : « Colisage » puis « Rendre la main » (RG-COO-243) sur trois lignes, « Préparer » (RG-COO-250) sur les autres.
  exiger(await appelUnitaire(jdd, a, 'colisage', { lignes: g4.map(ref) }), 'colisage G4')
  const g4b = await Promise.all(g4.map((r) => repLue(jdd, r.id)))
  exiger(
    await appelUnitaire(jdd, a, 'rendre-la-main', {
      lignes: g4b.slice(0, 2).map(ref),
      motif: 'Changement de visuel demandé par le client',
    }),
    'rendre la main',
  )
  exiger(
    await appelUnitaire(jdd, a, 'rendre-la-main', { lignes: g4b.slice(2, 3).map(ref) }),
    'rendre la main (motif par défaut)',
  )
  exiger(await appelUnitaire(jdd, a, 'preparer', { lignes: g4b.slice(3).map(ref) }), 'préparer')
  c(jdd, 'rendre.la.main', 2)

  // G5 : quantité à produire modifiée (RG-COO-239), intitulé corrigé (RG-COO-244, mail Pré-Prod mis en file).
  const g5b = await Promise.all(g5.map((r) => repLue(jdd, r.id)))
  const q0 = g5b[0]
  const q1 = g5b[1]
  if (q0)
    exiger(
      await appelUnitaire(jdd, a, 'quantite', {
        id: q0.id,
        version: q0.version,
        quantite: (q0.qte ?? 0) + 5,
      }),
      'quantité',
    )
  if (q1)
    exiger(
      await appelUnitaire(jdd, a, 'corriger-intitule', {
        id: q1.id,
        version: q1.version,
        annonceur: q1.annonceur ?? 'ANNONCEUR',
        theme: `${q1.theme ?? 'Thème'} (corrigé)`,
      }),
      'correction d’intitulé',
    )

  // Pliage : « Colisage » puis comptage (RG-COO-247) : le premier lot compte la quantité + l'entretien (conforme si
  // l'entretien vaut 10 %), le second est compté 3 affiches en dessous (écart, alerte qualité tracée). Les deux issues
  // sont des réponses valides du service : l'écart effectif dépend de l'entretien paramétré.
  exiger(await appelUnitaire(jdd, a, 'colisage', { lignes: pliage.map(ref) }), 'colisage pliage')
  const pl = await Promise.all(pliage.map((r) => repLue(jdd, r.id)))
  const lot = (xs: typeof pl) => xs.reduce((s, r) => s + (r.qte ?? 0), 0)
  const p1 = pl.slice(0, 2)
  const p2 = pl.slice(2)
  exiger(
    await appelUnitaire(jdd, a, 'comptage', {
      lignes: p1.map(ref),
      comptees: lot(p1) + Math.round(lot(p1) * 0.1),
    }),
    'comptage du pliage',
  )
  exiger(
    await appelUnitaire(jdd, a, 'comptage', {
      lignes: p2.map(ref),
      comptees: Math.max(0, lot(p2) - 3),
    }),
    'comptage du pliage avec écart',
  )
  c(jdd, 'pliage')

  // Bus : quantités à encoller, ajustement global et par centre (RG-COO-304).
  const centres = [
    ...new Set(bus.map((r) => r.destinataireId).filter((x): x is number => x !== null)),
  ]
  exiger(
    await appelUnitaire(jdd, a, 'encoller', {
      plateformeId: a.plateforme.id,
      depart: formatSemaineIso(jdd.depart),
      ajustementGlobal: 5,
      centres: centres
        .slice(0, 2)
        .map((destinataireId, i) => ({ destinataireId, ajustement: i === 0 ? -5 : 10 })),
      version: 0,
    }),
    'encollage du Bus',
  )
  c(jdd, 'encollage')
}

// ───────────────────────────── 7. déblocage des préparations ─────────────────────────────

async function deblocage(d: Demo): Promise<void> {
  const { jdd, a } = d
  const { db } = jdd.ctx
  const coord = a.users.coord.headers
  const plateforme = await db.plateforme.findUniqueOrThrow({ where: { id: a.plateforme.id } })
  const idSiteCcf = plateforme.idSiteCcf ?? 0
  const semaine = jdd.depart
  const fixeId = a.ateliers.fixe.id
  const surface = d.rep.surfaces.m2
  const type = d.rep.types.fixe

  async function prepa(contNum: number, chapeau: number, annonceur: string, quantite: number) {
    await f.createPrepaBroadcast(db, {
      idPreparationChapeau: chapeau,
      idDossierDeVenteChapeau: contNum,
      idSiteCcf,
      idSurface: surface,
      surface: '2 m²',
      idTypePreparation: type,
      annonceur,
      semAnnee: semaine.annee,
      semNum: semaine.semaine,
      quantite,
    })
  }
  async function groupeUm(
    statuts: ('A_TRAITER' | 'EN_COURS' | 'A_IMPRIMER' | 'ERREUR')[],
    avecUm: boolean,
  ) {
    const contNum = jdd.contNum()
    const chapeau = 400_000 + jdd.seed * 100 + (f.next() % 100)
    const idGroupe = 800_000 + jdd.seed * 100 + (f.next() % 100)
    const annonceur = tirerAnnonceur(jdd.rng)
    await prepa(contNum, chapeau, annonceur, 30)
    const um = avecUm
      ? await f.createUniteManutention(db, { atelierId: fixeId, contNum, statut: 'EN_COURS' })
      : null
    for (const st of statuts)
      await f.createRepartition(db, {
        statut: st,
        atelierId: fixeId,
        contNum,
        semAnnee: semaine.annee,
        semNum: semaine.semaine,
        typePreparationId: type,
        idGroupePreparation: idGroupe,
        annonceur,
        qte: 15,
        uniteId: um?.id ?? null,
      })
    return { cle: `UM:${String(idGroupe)}`, contNum }
  }
  async function groupeTrain(faces: StatutProduction[]) {
    const contNum = jdd.contNum()
    const chapeau = 400_000 + jdd.seed * 100 + (f.next() % 100)
    await prepa(contNum, chapeau, tirerAnnonceur(jdd.rng), 12)
    for (const st of faces)
      await f.createFaceTrain(db, {
        statut: st,
        contNum,
        contAnbas: semaine.annee,
        contSembas: semaine.semaine,
        supportId: a.supports[0]?.id ?? 0,
        atelierId: a.ateliers.scroll.id,
      })
    return {
      cle: `TRAIN:${String(chapeau)}:${String(contNum)}:${String(semaine.annee)}:${String(semaine.semaine)}:${String(surface)}:${String(type)}:${String(idSiteCcf)}`,
      contNum,
    }
  }

  const g1 = await groupeUm(['A_TRAITER', 'EN_COURS'], false)
  const g2 = await groupeUm(['A_TRAITER', 'EN_COURS', 'ERREUR', 'A_IMPRIMER'], true)
  await groupeUm(['A_TRAITER'], false) // reste à l'écran, non débloqué
  const t1 = await groupeTrain(['A_TRAITER', 'ANNULE']) // non lancé : débloquable
  await groupeTrain(['A_TRAITER', 'INSTRUCTION_OK']) // lancé : bloqué (RG-COO-144)
  await groupeUm(['EN_COURS'], true) // reste débloquable, non débloqué
  // « Rendre la main » : g1 (motif par défaut), g2 (motif saisi), t1 ; g3 et t2 restent à l'écran (non débloqué / bloqué).
  exiger(
    await poster(jdd, '/api/coordination/deblocage/groupes', coord, { cle: g1.cle }),
    'déblocage g1',
  )
  exiger(
    await poster(jdd, '/api/coordination/deblocage/groupes', coord, {
      cle: g2.cle,
      motif: 'Visuel refait par le client',
    }),
    'déblocage g2',
  )
  exiger(
    await poster(jdd, '/api/coordination/deblocage/groupes', coord, { cle: t1.cle }),
    'déblocage train',
  )
  c(jdd, 'deblocages', 3)
}

// ───────────────────────────── 8. mails et tâches ─────────────────────────────

async function mailsEtTaches(d: Demo): Promise<void> {
  const { jdd, a } = d
  const { db } = jdd.ctx
  const admin = a.users.admin.headers
  // Journal d'exécution des tâches planifiées : historique fictif (succès et échec), sans toucher aux données.
  const hier = Date.now() - JOUR
  for (const [tache, statut, message] of [
    ['FIN_JOURNEE_COLIS', 'SUCCES', 'Fin de journée : démonstration.'],
    ['INSTRUCTION_OK_AUTO', 'SUCCES', '0 instruction passée en Instruction OK.'],
    ['PURGE_ATTENDUES', 'ECHEC', 'Purge interrompue : démonstration d’une exécution en échec.'],
  ] as const)
    await db.tacheExecution.create({
      data: {
        tache,
        declencheur: 'PLANIFIE',
        statut,
        debut: new Date(hier),
        fin: new Date(hier + 4_000),
        message,
        resultat: JSON.stringify({ demo: true }),
      },
    })
  c(jdd, 'taches.historique', 3)
  // Base de dev, boîte d'envoi SIMULÉE seulement (jamais en MAIL_MODE=smtp : aucun mail réel ne doit partir) : la tâche
  // ENVOI_MAILS traite la file (statuts « Envoyé »), puis une action crée un mail resté en attente.
  if (!estBaseDeTest() && (process.env['MAIL_MODE'] ?? 'dev') !== 'smtp') {
    exiger(
      await poster(jdd, '/api/admin/taches/ENVOI_MAILS/executer', admin, {}),
      'tâche ENVOI_MAILS',
    )
    const dos = await dossierAvecLignes(jdd, a, { lignes: 1, statut: 'PREPARATION_RECUE' })
    await instructionDeDossier(d, a, dos, 'EN_COURS')
    exiger(
      await poster(
        jdd,
        `/api/coordination/dossiers/${String(dos.dossier.id)}/corrections`,
        a.users.coord.headers,
        {
          note: 'Demande restée en attente d’envoi (démonstration).',
        },
      ),
      'correction (mail en attente)',
    )
  }
}

// ───────────────────────────── 9. règles d'alerte et acquittements ─────────────────────────────

async function alertes(d: Demo): Promise<void> {
  const { jdd, a } = d
  const admin = a.users.admin.headers
  // Règles d'alerte (RG-REC-190) : seules les règles jamais modifiées sont configurées (une ligne par type, partagée).
  const regles = corps<{ regles: { type: string; version: number }[] }>(
    exiger(await lireApi(jdd, '/api/admin/alertes/regles', admin), 'règles d’alerte'),
  ).regles
  const config: [string, string, string[]][] = [
    ['THEMES_PROCHES', 'BANDEAU_MAIL', ['coord']],
    ['ECART_BC', 'BANDEAU_MAIL_IMMEDIAT', ['coord']],
    ['CONTROLE_RETARD', 'BANDEAU_DIGEST_7H', ['recep', 'cheq']],
    ['DM_FICHIER', 'BANDEAU_MAIL', ['coord', 'cheq']],
    ['VALIDATION_ADMIN', 'BANDEAU', ['coord']],
    ['DEPART_RISQUE', 'DESACTIVEE', []],
  ]
  for (const [type, canal, destinataires] of config) {
    const r = regles.find((x) => x.type === type)
    if (!r || r.version !== 0) continue
    exiger(
      await ecrire(jdd, 'PUT', `/api/admin/alertes/regles/${type}`, admin, {
        version: 0,
        canal,
        destinataires,
      }),
      `règle d’alerte ${type}`,
    )
    c(jdd, 'regles.alerte')
  }

  // Acquittements : une alerte ouverte sur trois de nos sites (Réception et Coordination), après toutes les données.
  const sites = new Set([d.a.plateforme.id, d.b.plateforme.id])
  const ouvertes = corps<{ alertes: { cle: string; plateformeId: number | null }[] }>(
    exiger(await lireApi(jdd, '/api/alertes?etat=OUVERTES', admin), 'alertes ouvertes'),
  ).alertes.filter((x) => x.plateformeId !== null && sites.has(x.plateformeId))
  const cles = ouvertes.filter((_, i) => i % 3 === 1).map((x) => x.cle)
  if (cles.length > 0) {
    exiger(
      await poster(jdd, '/api/alertes/acquittements', admin, { cles: cles.slice(0, 500) }),
      'acquittement',
    )
    c(jdd, 'alertes.acquittees', cles.length)
  }
  c(jdd, 'alertes.ouvertes', ouvertes.length - cles.length)
}

// ───────────────────────────── scénario ─────────────────────────────

export const demo: Scenario = {
  nom: 'demo',
  regles: [
    'RG-REC-189',
    'RG-COO-033',
    'RG-COO-069',
    'RG-COO-140',
    'RG-COO-217',
    'RG-COO-237',
    'RG-COO-243',
    'RG-COO-247',
    'RG-COO-291',
    'RG-COO-298',
    'RG-COO-304',
    'RG-ADM-040',
    'RG-X-087',
  ],
  attendu:
    'tous les écrans de démonstration alimentés par les services (alertes ouvertes et acquittées, thèmes, bagues, dispatch, 8 m², déblocage, unitaire, colis, générateur, mails) sans aucun rejet',
  async generer(jdd) {
    const a = await creerSite(jdd, { destinataires: 6, formats: 3 })
    const b = await creerSite(jdd, { destinataires: 3, formats: 2 })
    const params = new Parametres(jdd)
    const d: Demo = {
      jdd,
      a,
      b,
      params,
      rep: { types: { fixe: 0, pliage: 0, bus: 0 }, surfaces: { m2: 0, m8: 0 }, rouleurs: [] },
    }
    try {
      await referentiels(d)
      await reception(d)
      await dossiers(d)
      await themes(d)
      await roulage(d)
      await preparation(d)
      await deblocage(d)
      await mailsEtTaches(d)
      await alertes(d)
    } finally {
      await params.restaurer()
    }
  },
}
