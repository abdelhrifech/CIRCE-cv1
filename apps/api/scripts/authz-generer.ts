// SEC-023 : écrit le modèle d'autorisation OpenFGA et la matrice rôle → droit dérivés du catalogue (aucun accès base).
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { modeleFga, relationsRoles } from '../src/core/permissions/modele-autorisation.ts'

const dossier = resolve(import.meta.dirname, '../authz')
mkdirSync(dossier, { recursive: true })
writeFileSync(resolve(dossier, 'modele.fga'), modeleFga())
writeFileSync(
  resolve(dossier, 'relations-roles.json'),
  `${JSON.stringify(relationsRoles(), null, 2)}\n`,
)
console.log(`Modèle d'autorisation écrit dans ${dossier} (modele.fga, relations-roles.json).`)
