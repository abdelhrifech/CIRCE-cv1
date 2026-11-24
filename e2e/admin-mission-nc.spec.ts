import { expect, test } from '@playwright/test'
import { NcDonneesSchema, NC_STATUTS } from '../packages/shared/src/nonconformite.ts'
import { resolve } from 'node:path'
import { createDb, type Db } from '../apps/api/src/core/db.ts'
import * as f from '../apps/api/test/factories/index.ts'

let db: Db, numero: number
let plateformeNom: string
const annonceur = `NC mission navigateur ${Date.now()}`

test.beforeAll(async () => {
  process.loadEnvFile(resolve('.env.test'))
  const url = process.env['DATABASE_URL'] ?? ''
  if (!url.endsWith('test.db')) throw new Error('Base de test obligatoire')
  db = createDb('file:' + resolve('apps/api', url.slice(5)))
  const plateforme = await f.createPlateforme(db)
  plateformeNom = plateforme.nom
  const support = await f.createSupport(db, { nom: '2 m² fixe' })
  const reception = await f.createReception(db, { plateformeId: plateforme.id })
  numero = 9700000 + Math.floor(Math.random() * 100000)
  const affiche = await f.createAffiche(db, {
    plateformeId: plateforme.id,
    supportId: support.id,
    receptionId: reception.id,
    contNum: numero,
    contAnnonc: annonceur,
    theme: 'Visuel NC navigateur',
  })
  const attendue = await f.createReceptionAttendue(db, {
    plateformeId: plateforme.id,
    supportId: support.id,
    contNum: numero,
    annonceur,
    theme: affiche.theme,
    format: '2 m² fixe',
  })
  await f.createRattachement(db, { afficheId: affiche.id, ligneAttendueId: attendue.id })
  const auteur = await db.utilisateur.findUniqueOrThrow({
    where: { identifiantExterne: 'e2e.admin' },
  })
  for (const bloquante of [true, false]) {
    await db.nonConformite.create({
      data: {
        plateformeId: plateforme.id,
        createdById: auteur.id,
        type: 'RECEPTION',
        origine: 'Formulaire',
        bloquante,
        donnees: JSON.stringify(
          NcDonneesSchema.parse({ annonceur, dossier: String(numero), theme: affiche.theme }),
        ),
      },
    })
  }
})

test.afterAll(async () => {
  await db.$disconnect()
})

test('EX-MISSION-NC-001 le suivi global affiche ses indicateurs et cumule les filtres', async ({
  page,
}) => {
  await page.goto('/non-conformite?tab=suivi')
  await expect(page.getByRole('heading', { name: 'Suivi des NC', exact: true })).toBeVisible()
  for (const statut of NC_STATUTS) {
    await expect(page.getByRole('button', { name: new RegExp(`^${statut}`) })).toBeVisible()
  }
  for (const label of ['Bloquante', 'Statut', 'Origine', 'Décision']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible()
  }
  await page.getByLabel('Rechercher une non-conformité').fill(annonceur)
  const lignes = page.getByRole('table').getByRole('row').filter({ hasText: annonceur })
  await expect(lignes).toHaveCount(2)
  await page.getByLabel('Bloquante', { exact: true }).selectOption('true')
  await expect(lignes).toHaveCount(1)
  await page.getByLabel('Statut', { exact: true }).selectOption('Pour statistique')
  await expect(lignes).toHaveCount(0)
  await page.getByLabel('Bloquante', { exact: true }).selectOption('false')
  await expect(lignes).toHaveCount(1)
  await page.getByLabel('Origine', { exact: true }).selectOption('Réception inconnue')
  await expect(lignes).toHaveCount(0)
  await page.getByLabel('Origine', { exact: true }).selectOption('Formulaire')
  await page.getByLabel('Décision', { exact: true }).selectOption('sans')
  await expect(lignes).toHaveCount(1)
  await page.getByLabel('Décision', { exact: true }).selectOption('Décision Commerce')
  await expect(lignes).toHaveCount(0)
})

test('EX-MISSION-NC-002 les choix obligatoires manquants sont signalés après préremplissage', async ({
  page,
}) => {
  await page.goto('/non-conformite?tab=reception')
  // Attendre les référentiels chargés côté client avant de saisir dans le formulaire SSR.
  await page
    .getByRole('combobox', { name: /^Plateforme/ })
    .getByRole('option', { name: plateformeNom, exact: true })
    .waitFor({ state: 'attached' })
  await expect(page.getByText('Contrôle réception : à compléter', { exact: true })).toHaveCount(0)
  await page.getByLabel('Dossier ou annonceur', { exact: true }).fill(String(numero))
  await page.getByRole('button', { name: 'Rechercher les réceptions', exact: true }).click()
  await page.getByRole('button').filter({ hasText: annonceur }).click()
  const controleManquant = page.getByText('Contrôle réception : à compléter', { exact: true })
  await expect(controleManquant).toBeVisible()
  await expect(page.getByText('Formats : à compléter', { exact: true })).toHaveCount(0)
  const formats = page.getByRole('group', { name: 'Formats *', exact: true })
  await formats.getByLabel('2 m² fixe', { exact: true }).uncheck()
  await expect(page.getByText('Formats : à compléter', { exact: true })).toBeVisible()
  await formats.getByLabel('2 m² fixe', { exact: true }).check()
  await expect(page.getByText('Formats : à compléter', { exact: true })).toHaveCount(0)
  await page
    .getByRole('group', { name: 'Contrôle réception *', exact: true })
    .getByLabel('Format NC', { exact: true })
    .check()
  await expect(controleManquant).toHaveCount(0)
  await expect(page.getByTestId('error-message')).toHaveCount(0)
})
