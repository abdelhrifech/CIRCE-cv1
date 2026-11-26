import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PERMISSION_CODES, ROLES } from '@circe/shared'
import {
  modeleFga,
  relationDuDroit,
  relationsRoles,
} from '../src/core/permissions/modele-autorisation.ts'
import { permissionsOf } from '../src/core/permissions/permissions.ts'

const dossier = resolve(import.meta.dirname, '../authz')

describe('SEC-022 / SEC-023 modèle d’autorisation versionné (OpenFGA)', () => {
  it('SEC-023 les fichiers versionnés sont à jour du catalogue des droits (pnpm --filter @circe/api authz:generer)', () => {
    expect(readFileSync(resolve(dossier, 'modele.fga'), 'utf8')).toBe(modeleFga())
    expect(JSON.parse(readFileSync(resolve(dossier, 'relations-roles.json'), 'utf8'))).toEqual(
      relationsRoles(),
    )
  })

  it('SEC-022 chaque droit du catalogue est une relation du modèle', () => {
    const modele = modeleFga()
    for (const code of PERMISSION_CODES)
      expect(modele).toContain(`define ${relationDuDroit(code)}: [role#membre]`)
  })

  it('SEC-022 le modèle accorde à chaque profil exactement les droits actuels (matrice inchangée, admin super-utilisateur)', () => {
    const relations = relationsRoles()
    for (const role of ROLES) {
      const duModele = relations
        .filter((r) => r.user === `role:${role}#membre`)
        .map((r) => r.relation)
        .sort()
      const actuels = permissionsOf([role]).map(relationDuDroit).sort()
      expect(duModele, role).toEqual(actuels)
    }
  })
})
