// SEC-022 / SEC-023 : modèle d'autorisation versionné, au format OpenFGA (DSL 1.1), DÉRIVÉ du catalogue des droits
// (catalogue.ts, source unique). Il ne crée ni ne retire aucun droit : il traduit la matrice profils × actions et le
// périmètre par plateforme pour le service d'autorisation cible (annexe D §4). Fichiers générés par
// `pnpm --filter @circe/api authz:generer` ; un test d'intégration vérifie qu'ils restent synchronisés.
import { PERMISSION_CODES, ROLES, type PermissionCode, type Role } from '@circe/shared'
import { CATALOGUE_PERMISSIONS } from './catalogue.ts'

/** Nom de relation OpenFGA d'un droit (`reception.saisir` → `reception__saisir`). */
export function relationDuDroit(code: PermissionCode): string {
  return code.replace(/\./g, '__')
}

/** Q-421 : l'administrateur est super-utilisateur (tous les droits), comme `permissionsOf`. */
function rolesDuDroit(code: PermissionCode): Role[] {
  const roles = new Set<Role>(CATALOGUE_PERMISSIONS[code].roles)
  roles.add('admin')
  return ROLES.filter((r) => roles.has(r))
}

export function modeleFga(): string {
  const lignes = [
    '# Généré depuis apps/api/src/core/permissions/catalogue.ts — ne pas modifier à la main.',
    '# Vérification côté API : check(utilisateur:<id>, <droit>, application:circe)',
    '#   puis, pour une ressource rattachée à un site, check(utilisateur:<id>, perimetre, plateforme:<id>).',
    'model',
    '  schema 1.1',
    '',
    'type utilisateur',
    '',
    'type role',
    '  relations',
    '    define membre: [utilisateur]',
    '',
    'type plateforme',
    '  relations',
    '    # Périmètre : lignes utilisateur_perimetre ; l’administrateur couvre toutes les plateformes (Q-421).',
    '    define perimetre: [utilisateur, role#membre]',
    '',
    'type application',
    '  relations',
    ...PERMISSION_CODES.flatMap((code) => [
      `    # ${CATALOGUE_PERMISSIONS[code].libelle}`,
      `    define ${relationDuDroit(code)}: [role#membre]`,
    ]),
    '',
  ]
  return lignes.join('\n')
}

export interface RelationFga {
  user: string
  relation: string
  object: string
}

/** Relations statiques rôle → droit (la matrice) ; les appartenances utilisateur → rôle et les périmètres sont écrits
 * par l'API à la création ou à la modification d'un utilisateur (SEC-023). */
export function relationsRoles(): RelationFga[] {
  return PERMISSION_CODES.flatMap((code) =>
    rolesDuDroit(code).map((role) => ({
      user: `role:${role}#membre`,
      relation: relationDuDroit(code),
      object: 'application:circe',
    })),
  )
}
