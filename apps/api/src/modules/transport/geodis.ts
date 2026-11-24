import { AppError } from '../../core/errors.ts'

// Aucun contrat ni identifiant Geodis livré. Ne pas construire de lien de suivi ou simuler un appel.
export function demanderSuiviGeodis(): never {
  throw new AppError(
    503,
    'TRANSPORT_GEODIS_NON_CONFIGURE',
    'Connexion Geodis indisponible : contrat d’interface et identifiants non configurés. Les données vérifiées enregistrées restent consultables.',
  )
}
