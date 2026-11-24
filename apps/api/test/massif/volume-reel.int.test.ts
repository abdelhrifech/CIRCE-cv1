// Recette sur le volume réel repris de Circé (2026-11-24) : anomalies révélées par la FORME et le VOLUME des données
// (centaines de milliers de faces, milliers de lignes et d'affiches), reproduites ici avec des données FICTIVES.
// - suivi de production : filtre des faces par ligne attendue (quadratique) → API bloquée des heures ;
// - référentiel des rouleurs : une requête de comptage par rouleur (N+1 sur des faces non indexées par rouleur) ;
// - options de création de train : `some` corrélé destinataire → faces (parcours complet par destinataire) ;
// - fin de campagne : filtres répétés par groupe (site × dossier) ;
// - liste des affiches (et tableau de bord préproduction) : état de validation recalculé affiche par affiche ;
// - analyse de production : toutes les faces de toutes les semaines chargées puis filtrées sur la période ;
// - statistiques du planificateur SQLite absentes : index le moins sélectif choisi (cont_num ignoré).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  AnalyseProductionSchema,
  FinCampagneSchema,
  ListeAffichesSchema,
  OptionsCreationTrainSchema,
  RouleursReferentielSchema,
  SuiviProductionSchema,
} from '@circe/shared'
import { optimiserStatistiques } from '../../src/core/db.ts'
import * as f from '../factories/index.ts'
import { next } from '../factories/sequence.ts'
import { siteDeroulant } from '../support/export-trains.ts'
import { autre, contexteReception, get, site } from '../support/reception.ts'

const ctx = contexteReception()
const { db } = ctx
beforeAll(() => ctx.demarrer())
afterAll(() => ctx.arreter())

const numero = () => 930_000_000 + next()

describe('Volume réel — lectures sans parcours quadratique ni N+1', () => {
  it('RG-COO-105 / RG-COO-106 suivi de production : 1 000 lignes × 15 faces chacune (thème à la casse différente) répondent vite et comptent juste', async () => {
    const s = await site(ctx, ['coord'])
    const atelier = await f.createAtelier(db, { plateformeId: s.plateforme.id })
    const contNum = numero()
    const LIGNES = 1000
    const FACES = 15
    await db.receptionAttendue.createMany({
      data: Array.from({ length: LIGNES }, (_, i) => ({
        plateformeId: s.plateforme.id,
        supportId: s.support.id,
        atelierId: atelier.id,
        contNum,
        theme: `Thème volume ${String(i)}`,
        themeCle: `THEME VOLUME ${String(i)}`,
        semAnnee: 2026,
        semNum: 40,
        source: 'PREPA' as const,
        etatLigne: 'ACTIVE' as const,
        statut: 'ATTENDUE' as const,
        qtePrepa: 10,
      })),
    })
    const instruction = await f.createInstruction(db, { atelierId: atelier.id, contNum })
    await db.faceTrain.createMany({
      data: Array.from({ length: LIGNES * FACES }, (_, k) => ({
        instructionCode: instruction.code,
        atelierId: atelier.id,
        supportId: s.support.id,
        contNum,
        // RG-COO-106 : rapprochement sur le thème normalisé (casse et espaces indifférents).
        theme: `thème  VOLUME ${String(Math.floor(k / FACES))}`,
        depAnbas: 2026,
        depSembas: 40,
        statut: k % 2 === 0 ? ('A_TRAITER' as const) : ('TERMINE' as const),
        cadrIdent: k,
        dateDepart: new Date('2026-09-28'),
      })),
    })
    await db.repartition.createMany({
      data: Array.from({ length: LIGNES }, (_, i) => ({
        atelierId: atelier.id,
        supportId: s.support.id,
        contNum,
        theme: `Thème volume ${String(i)}`,
        semAnnee: 2026,
        semNum: 40,
        statut: 'EN_COURS' as const,
        qte: 10,
      })),
    })
    const debut = Date.now()
    const r = await get(
      ctx,
      `/api/coordination/suivi-production?dossier=${String(contNum)}`,
      s.headers,
    )
    const duree = Date.now() - debut
    expect(r.statusCode, r.body).toBe(200)
    const items = SuiviProductionSchema.parse(r.json()).items
    expect(items).toHaveLength(LIGNES)
    for (const l of items) {
      expect(l.faces.reduce((n, x) => n + x.nombre, 0)).toBe(FACES)
      expect(l.repartitions).toHaveLength(1)
    }
    // Avant correction : 2 × 15 millions de normalisations de thème (plusieurs minutes, API bloquée).
    expect(duree).toBeLessThan(10_000)
  })

  it('RG-COO-297 référentiel des rouleurs : « utilisé » par une face ou une bague, sans requête par rouleur', async () => {
    const s = await siteDeroulant(ctx)
    const rouleurs = await Promise.all(
      Array.from({ length: 40 }, () => f.createRouleur(db, { atelierId: s.atelier.id })),
    )
    const [parFace, parBague] = rouleurs
    if (!parFace || !parBague) throw new Error('rouleurs absents')
    await f.createFaceTrain(db, { atelierId: s.atelier.id, rouleurId: parFace.id })
    await db.bague.create({
      data: {
        trainId: `BAGUE-${String(next())}`,
        atelierId: s.atelier.id,
        rouleurId: parBague.id,
        textes: '[]',
        imprimeeLe: new Date(),
        imprimeeParId: s.users.admin.id,
      },
    })
    const r = await get(ctx, '/api/coordination/rouleurs', s.users.admin.headers)
    expect(r.statusCode, r.body).toBe(200)
    const liste = RouleursReferentielSchema.parse(r.json()).rouleurs
    const utilise = new Map(liste.map((x) => [x.id, x.utilise]))
    expect(utilise.get(parFace.id)).toBe(true)
    expect(utilise.get(parBague.id)).toBe(true)
    expect(rouleurs.slice(2).every((x) => utilise.get(x.id) === false)).toBe(true)
    expect(liste.find((x) => x.id === parFace.id)?.atelier?.plateforme).toBe(s.plateforme.nom)
  })

  it('RG-COO-224 options de création : destinataires actifs du site par les faces OU les répartitions ; ceux d’un autre site exclus', async () => {
    const s = await siteDeroulant(ctx)
    const ailleurs = await siteDeroulant(ctx)
    const parRepartition = await f.createDestinataire(db, { nom: `Répartition ${String(next())}` })
    const autreSite = await f.createDestinataire(db, { nom: `Ailleurs ${String(next())}` })
    const parFace = await f.createDestinataire(db, { nom: `Face ${String(next())}` })
    await f.createRepartition(db, {
      atelierId: s.atelier2.id,
      destinataireId: parRepartition.id,
      contNum: numero(),
    })
    await f.createFaceTrain(db, { atelierId: s.atelier.id, destinataireId: parFace.id })
    await f.createFaceTrain(db, { atelierId: ailleurs.atelier.id, destinataireId: autreSite.id })
    const r = await get(
      ctx,
      `/api/coordination/trains/options-creation?atelier=${String(s.atelier.id)}`,
      s.users.coord.headers,
    )
    expect(r.statusCode, r.body).toBe(200)
    const ids = OptionsCreationTrainSchema.parse(r.json()).destinataires.map((d) => d.id)
    expect(ids).toContain(parRepartition.id)
    expect(ids).toContain(parFace.id)
    expect(ids).not.toContain(autreSite.id)
    expect([...ids].sort((a, b) => a - b)).toEqual(ids)
  })

  it('RG-STK-NEW-002 fin de campagne : dernier départ lu des 3 000 faces du dossier, sans mélanger deux dossiers du même site', async () => {
    const s = await site(ctx, ['coord'])
    const atelier = await f.createAtelier(db, { plateformeId: s.plateforme.id })
    const dossiers = [numero(), numero()]
    for (const contNum of dossiers) {
      const affiche = await f.createAffiche(db, {
        plateformeId: s.plateforme.id,
        supportId: s.support.id,
        contNum,
        quantite: 50,
      })
      await f.createMouvement(db, { afficheId: affiche.id, quantite: 50 })
      const ligne = await f.createReceptionAttendue(db, {
        plateformeId: s.plateforme.id,
        supportId: s.support.id,
        atelierId: atelier.id,
        contNum,
        semAnnee: 2024,
        semNum: 2,
      })
      await f.createRattachement(db, {
        afficheId: affiche.id,
        ligneAttendueId: ligne.id,
        quantite: 50,
      })
    }
    const [avecFaces, sansFaces] = dossiers as [number, number]
    const instruction = await f.createInstruction(db, { atelierId: atelier.id, contNum: avecFaces })
    await db.faceTrain.createMany({
      data: Array.from({ length: 3000 }, (_, k) => ({
        instructionCode: instruction.code,
        atelierId: atelier.id,
        contNum: avecFaces,
        depAnbas: 2024,
        depSembas: 5,
        statut: 'TERMINE' as const,
        cadrIdent: k,
        dateDepart: new Date('2024-01-29'),
      })),
    })
    const lire = async (contNum: number) => {
      const r = await get(ctx, `/api/stocks/fin-campagne?dossier=${String(contNum)}`, s.headers)
      expect(r.statusCode, r.body).toBe(200)
      return FinCampagneSchema.parse(r.json()).items.find((x) => x.dossier === contNum)
    }
    expect((await lire(avecFaces))?.dernierDepart).toBe('2024-W05')
    expect((await lire(sansFaces))?.dernierDepart).toBe('2024-W02')
    expect((await lire(avecFaces))?.stock).toBe(50)
  })

  it('RG-REC-121 / RG-COO-025 liste des affiches : état de validation, stock et rebut calculés par lot, identiques à la fiche', async () => {
    const s = await site(ctx, ['recep'])
    const coord = await autre(ctx, s.plateforme.id, ['coord'])
    const contNum = numero()
    const ligne = await f.createReceptionAttendue(db, {
      plateformeId: s.plateforme.id,
      supportId: s.support.id,
      contNum,
      theme: 'Visuel lot',
    })
    const affiches = []
    for (let i = 0; i < 12; i++) {
      const a = await f.createAffiche(db, {
        plateformeId: s.plateforme.id,
        supportId: s.support.id,
        contNum,
        theme: 'Visuel lot',
        validationAdmin: i % 3 === 0,
      })
      await f.createMouvement(db, { afficheId: a.id, quantite: 40 + i })
      if (i % 4 === 0)
        await f.createMouvement(db, { afficheId: a.id, type: 'MISE_AU_REBUT', quantite: -i - 1 })
      if (i < 9)
        await f.createRattachement(db, {
          afficheId: a.id,
          ligneAttendueId: ligne.id,
          quantite: 1,
          mode: i % 2 === 0 ? 'BL' : 'MAIN',
        })
      affiches.push(a)
    }
    const r = await get(ctx, `/api/affiches?pageSize=100`, s.headers)
    expect(r.statusCode, r.body).toBe(200)
    const lignes = ListeAffichesSchema.parse(r.json()).items
    for (const a of affiches) {
      const l = lignes.find((x) => x.id === a.id)
      const fiche = await get(ctx, `/api/affiches/${String(a.id)}`, s.headers)
      expect(fiche.statusCode, fiche.body).toBe(200)
      const attendu = fiche.json<{
        validation: { etat: string }
        enStock: number
        rebut: number
      }>()
      expect(l?.validation).toBe(attendu.validation.etat)
      expect(l?.enStock).toBe(attendu.enStock)
      expect(l?.rebut).toBe(attendu.rebut)
    }
    // Filtre « Validation » : même calcul, par lot.
    for (const etat of [
      'VALIDEE',
      'RECEPTION_INCONNUE',
      'A_CONFIRMER_PROPOSE',
      'A_CONFIRMER_DOUTE',
    ]) {
      const filtre = await get(ctx, `/api/affiches?validation=${etat}&pageSize=100`, coord.headers)
      expect(filtre.statusCode, filtre.body).toBe(200)
      const ids = ListeAffichesSchema.parse(filtre.json()).items.map((x) => x.id)
      for (const a of affiches)
        expect(ids.includes(a.id), `${etat} ${String(a.id)}`).toBe(
          lignes.find((x) => x.id === a.id)?.validation === etat,
        )
    }
  })

  it('EX-NEW16-REP-001 analyse de production sur une période : départ du train = première date de TOUTES ses faces, sans charger toutes les semaines', async () => {
    const s = await siteDeroulant(ctx)
    const instruction = await f.createInstruction(db, { atelierId: s.atelier.id })
    const face = (trainId: string, statut: 'PREPARE' | 'TERMINE' | 'A_IMPRIMER', jour: string) =>
      f.createFaceTrain(db, {
        instructionCode: instruction.code,
        atelierId: s.atelier.id,
        trainId,
        statut,
        dateDepart: new Date(`${jour}T08:00:00.000Z`),
      })
    const id = (n: string) => `AN${n}${String(next()).padStart(10, '0')}`
    const [dedans, aCheval, nonProduit, expedie] = [id('A'), id('B'), id('C'), id('D')]
    await face(dedans, 'PREPARE', '2025-03-10')
    await face(dedans, 'PREPARE', '2025-03-12')
    // Une face dans la période, mais le train part avant (première date de ses faces) : hors période.
    await face(aCheval, 'PREPARE', '2025-03-05')
    await face(aCheval, 'PREPARE', '2025-03-11')
    await face(nonProduit, 'A_IMPRIMER', '2025-03-11')
    await face(expedie, 'TERMINE', '2025-03-14')
    const r = await get(
      ctx,
      `/api/pilotage/analyse?du=2025-03-09&au=2025-03-15&atelier=${String(s.atelier.id)}`,
      s.users.coord.headers,
    )
    expect(r.statusCode, r.body).toBe(200)
    const trains = AnalyseProductionSchema.parse(r.json()).trains
    expect(trains.map((t) => t.id).sort()).toEqual([dedans, expedie].sort())
    expect(trains.find((t) => t.id === expedie)?.statut).toBe('EXPEDIE')
    const large = await get(
      ctx,
      `/api/pilotage/analyse?du=2025-03-01&au=2025-03-15&atelier=${String(s.atelier.id)}`,
      s.users.coord.headers,
    )
    expect(
      AnalyseProductionSchema.parse(large.json())
        .trains.map((t) => t.id)
        .sort(),
    ).toEqual([dedans, aCheval, expedie].sort())
  })

  it('statistiques du planificateur SQLite : après optimiserStatistiques, la recherche par dossier utilise l’index cont_num', async () => {
    // Répartition réaliste : beaucoup de dossiers distincts, deux états de ligne.
    const s = await site(ctx, ['coord'])
    const base = numero() * 10
    await db.receptionAttendue.createMany({
      data: Array.from({ length: 3000 }, (_, i) => ({
        plateformeId: s.plateforme.id,
        supportId: s.support.id,
        contNum: base + i,
        theme: 'Thème stats',
        themeCle: 'THEME STATS',
        semAnnee: 2026,
        semNum: 40,
        source: 'PREPA' as const,
        etatLigne: i % 9 === 0 ? ('ANNULEE' as const) : ('ACTIVE' as const),
        statut: 'ATTENDUE' as const,
        qtePrepa: 10,
      })),
    })
    await optimiserStatistiques(db)
    const stats = await db.$queryRawUnsafe<{ n: bigint | number }[]>(
      "SELECT COUNT(*) AS n FROM sqlite_stat1 WHERE tbl = 'tf_prepa_affiche'",
    )
    expect(Number(stats[0]?.n ?? 0)).toBeGreaterThan(0)
    const plan = await db.$queryRawUnsafe<{ detail: string }[]>(
      "EXPLAIN QUERY PLAN SELECT id FROM tf_prepa_affiche WHERE cont_num IN (1, 2) AND etat_ligne = 'ACTIVE' AND theme_exclu = 0",
    )
    expect(plan.map((p) => p.detail).join(' ')).toContain('tf_prepa_affiche_cont_num_idx')
  })
})
