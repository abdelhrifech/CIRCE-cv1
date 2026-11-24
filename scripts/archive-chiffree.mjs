// Sauvegardes privées : chiffrement authentifié, sans dépendance applicative.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, readFile, open, writeFile, unlink, stat } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const aad = Buffer.from('CIRCE_PRIVATE_ARCHIVE_V1')

export async function chiffrer(input, destination, keyPath, partSize = 40 * 1024 * 1024) {
  if (!Number.isSafeInteger(partSize) || partSize < 1) throw new Error('Taille de partie invalide')
  await mkdir(destination, { recursive: true })
  if ((await readdir(destination)).length) throw new Error('Destination non vide')
  const key = randomBytes(32)
  await mkdir(dirname(keyPath), { recursive: true, mode: 0o700 })
  await writeFile(keyPath, JSON.stringify({ version: 1, key: key.toString('base64') }) + '\n', {
    mode: 0o600,
    flag: 'wx',
  })
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(aad)
  const parts = []
  let file,
    hash,
    bytes = 0,
    name
  async function fermerPartie() {
    if (!file) return
    await file.close()
    parts.push({ file: name, bytes, sha256: hash.digest('hex') })
    file = undefined
  }
  async function ecrire(buffer) {
    let position = 0
    while (position < buffer.length) {
      if (!file) {
        name = `archive-${String(parts.length + 1).padStart(4, '0')}.bin`
        file = await open(join(destination, name), 'wx', 0o600)
        hash = createHash('sha256')
        bytes = 0
      }
      const piece = buffer.subarray(
        position,
        position + Math.min(partSize - bytes, buffer.length - position),
      )
      await file.writeFile(piece)
      hash.update(piece)
      bytes += piece.length
      position += piece.length
      if (bytes === partSize) await fermerPartie()
    }
  }
  try {
    for await (const buffer of createReadStream(input, { highWaterMark: 1024 * 1024 })) {
      await ecrire(cipher.update(buffer))
    }
    await ecrire(cipher.final())
    await fermerPartie()
  } finally {
    if (file) await file.close()
  }
  const manifest = {
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    parts,
  }
  await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {
    flag: 'wx',
  })
  return manifest
}

export async function dechiffrer(source, keyPath, destination) {
  const manifest = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8'))
  if (
    manifest.version !== 1 ||
    manifest.algorithm !== 'aes-256-gcm' ||
    !Array.isArray(manifest.parts)
  )
    throw new Error('Format non reconnu')
  if (!/^[a-f0-9]{24}$/.test(manifest.iv) || !/^[a-f0-9]{32}$/.test(manifest.tag))
    throw new Error('Métadonnées invalides')
  const key = Buffer.from(JSON.parse(await readFile(keyPath, 'utf8')).key, 'base64')
  if (key.length !== 32) throw new Error('Clé invalide')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(manifest.iv, 'hex'))
  decipher.setAAD(aad)
  decipher.setAuthTag(Buffer.from(manifest.tag, 'hex'))
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
  const output = await open(destination, 'wx', 0o600)
  let valid = false
  try {
    for (const part of manifest.parts) {
      if (!/^archive-\d{4}\.bin$/.test(part.file) || !/^[a-f0-9]{64}$/.test(part.sha256))
        throw new Error('Partie invalide')
      const path = join(source, part.file)
      if ((await stat(path)).size !== part.bytes) throw new Error('Taille de partie incorrecte')
      const hash = createHash('sha256')
      for await (const buffer of createReadStream(path)) {
        hash.update(buffer)
        await output.writeFile(decipher.update(buffer))
      }
      if (hash.digest('hex') !== part.sha256) throw new Error('Partie altérée')
    }
    await output.writeFile(decipher.final())
    valid = true
  } finally {
    await output.close()
    if (!valid) await unlink(destination)
  }
  return destination
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, source, keyPath, destination] = process.argv.slice(2)
  if (!source || !keyPath || !destination || !['chiffrer', 'restaurer'].includes(mode)) {
    console.error(
      'Usage : node scripts/archive-chiffree.mjs <chiffrer|restaurer> <source> <clé-locale.json> <destination>',
    )
    process.exitCode = 1
  } else if (mode === 'chiffrer') {
    const result = await chiffrer(resolve(source), resolve(destination), resolve(keyPath))
    console.log(`${result.parts.length} partie(s) chiffrée(s). Clé conservée hors dépôt.`)
  } else {
    const out = resolve(destination)
    await mkdir(out, { recursive: false, mode: 0o700 })
    const archive = join(out, '.archive-authentifiee.tar.gz')
    await dechiffrer(resolve(source), resolve(keyPath), archive)
    const list = spawnSync('tar', ['-tzf', archive], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
    if (
      list.status !== 0 ||
      list.stdout.split('\n').some((path) => path.startsWith('/') || path.split('/').includes('..'))
    )
      throw new Error('Archive non sûre')
    const extraction = spawnSync('tar', ['-xzf', archive, '-C', out], { stdio: 'inherit' })
    if (extraction.status !== 0) throw new Error('Échec de restauration')
    await unlink(archive)
    console.log(
      `Archive authentifiée et restaurée dans ${out}. Aucun fichier de l’application n’a été remplacé.`,
    )
  }
}
