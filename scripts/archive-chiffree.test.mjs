import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { chiffrer, dechiffrer } from './archive-chiffree.mjs'

test('archive : aller-retour multi-parties et refus de fichier altéré, sans sortie en clair résiduelle', async () => {
  const root = await mkdtemp(join(tmpdir(), 'circe-archive-test-'))
  try {
    const input = join(root, 'source')
    const key = join(root, 'cle.json')
    const data = Buffer.from('CIRCE données de test\n'.repeat(100))
    await writeFile(input, data)
    const folder = join(root, 'chiffre')
    const manifest = await chiffrer(input, folder, key, 64)
    assert.ok(manifest.parts.length > 1)
    assert.ok(manifest.parts.every((part) => part.bytes <= 64))
    const output = join(root, 'restaure')
    await dechiffrer(folder, key, output)
    assert.deepEqual(await readFile(output), data)
    await assert.rejects(chiffrer(input, folder, key, 64), /non vide/)
    const first = manifest.parts[0]
    const altered = await readFile(join(folder, first.file))
    altered[0] ^= 1
    await writeFile(join(folder, first.file), altered)
    // Même si le manifeste public est changé, GCM doit refuser l’authentification.
    first.sha256 = createHash('sha256').update(altered).digest('hex')
    await writeFile(join(folder, 'manifest.json'), JSON.stringify(manifest))
    const rejected = join(root, 'refuse')
    await assert.rejects(dechiffrer(folder, key, rejected))
    await assert.rejects(access(rejected))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
