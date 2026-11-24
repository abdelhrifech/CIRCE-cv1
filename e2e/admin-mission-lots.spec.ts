import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { createDb, type Db } from '../apps/api/src/core/db.ts'
import * as f from '../apps/api/test/factories/index.ts'
let db: Db, numero: number, lineId: number
const advertiser = `Mission lots navigateur ${Date.now()}`
test.beforeAll(async () => {
  process.loadEnvFile(resolve('.env.test'))
  const url = process.env['DATABASE_URL'] ?? ''
  if (!url.endsWith('test.db')) throw new Error('Base de test obligatoire')
  db = createDb('file:' + resolve('apps/api', url.slice(5)))
  const site = await f.createPlateforme(db)
  const support = await f.createSupport(db)
  const atelier = await f.createAtelier(db, { plateformeId: site.id, type: 'SCROLL' })
  const dossier = await f.createDossier(db)
  numero = dossier.contNum
  const instruction = await f.createInstruction(db, {
    atelierId: atelier.id,
    contNum: numero,
    statut: 'INSTRUCTION_OK',
  })
  const expected = await f.createReceptionAttendue(db, {
    plateformeId: site.id,
    supportId: support.id,
    atelierId: atelier.id,
    contNum: numero,
    annonceur: advertiser,
    theme: 'Visuel en attente navigateur',
    qteBc: 10,
    semAnnee: 2026,
    semNum: 48,
  })
  lineId = expected.id
  await f.createFaceTrain(db, {
    instructionCode: instruction.code,
    atelierId: atelier.id,
    supportId: support.id,
    contNum: numero,
    contAnnonc: advertiser,
    theme: expected.theme,
    trainId: `mission-browser-${instruction.code}`,
    depAnbas: 2026,
    depSembas: 48,
    statut: 'INSTRUCTION_OK',
  })
})
test.afterAll(async () => {
  await db.$disconnect()
})

test('EX-MISSION-PIL-002 prévision persistante, dashboard et suivi atelier sans changement de réception', async ({
  page,
}) => {
  const before = await db.receptionAttendue.findUniqueOrThrow({ where: { id: lineId } })
  await page.goto(`/pilotage/suivi?dossier=${numero}`)
  await expect(page.getByTestId('onglet-pilotage')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('onglet-deroulant')).not.toHaveAttribute('aria-current', 'page')
  const table = page.getByRole('table', { name: 'Visuels qui bloquent la production', exact: true })
  const row = table.getByRole('row').filter({ hasText: advertiser })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Prévoir la livraison' }).click()
  const dialog = page.getByRole('dialog', { name: new RegExp(`Livraison prévue · ${numero}`) })
  await dialog.getByLabel('Date de livraison prévue').fill('2026-11-24')
  await dialog.getByLabel('Commentaire', { exact: true }).fill('Date confirmée par le fournisseur')
  await dialog.getByRole('button', { name: 'Enregistrer la prévision' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(row).toContainText('24/11/2026')
  await expect(row).toContainText('Date confirmée par le fournisseur')
  expect(await db.receptionAttendue.findUniqueOrThrow({ where: { id: lineId } })).toEqual(before)
  await page.goto(`/pilotage/suivi?pour=deroulant&dossier=${numero}`)
  await expect(page.getByTestId('onglet-deroulant')).toHaveAttribute('aria-current', 'page')
  const workshop = page.getByRole('table', { name: 'Suivi déroulant', exact: true })
  await expect(workshop).toContainText(advertiser)
  await expect(workshop.getByRole('columnheader')).toHaveCount(8)
  await workshop.getByRole('button', { name: 'Visuel en attente navigateur' }).click()
  await expect(page.getByRole('dialog')).toContainText('2026-11-24')
  await expect(page.getByTestId('error-message')).toHaveCount(0)
})

test('EX-MISSION-STK-002 filtres multisélection clavier et indicateurs du journal', async ({
  page,
}) => {
  await page.goto('/stocks')
  await expect(page.getByRole('table', { name: 'Stock par affiche', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^État/ }).click()
  await page.getByRole('checkbox', { name: /En stock/ }).check()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /^État/ })).toContainText('1')
  await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click()
  await expect(page.getByRole('button', { name: /^État/ })).not.toContainText('1')
  await page.goto('/stocks/mouvements')
  await expect(page.getByRole('table', { name: 'Mouvements de stock', exact: true })).toBeVisible()
  await expect(page.getByText('Affiches en stock', { exact: true })).toBeVisible()
  await expect(page.getByText('Sorties automatiques aujourd’hui', { exact: true })).toBeVisible()
  await page
    .getByRole('group', { name: 'Filtres multisélection' })
    .getByRole('button', { name: 'Mouvement', exact: true })
    .click()
  await expect(page.getByRole('checkbox').first()).toBeVisible()
  await page.keyboard.press('Escape')
})
