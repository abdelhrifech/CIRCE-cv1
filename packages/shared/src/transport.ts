import { z } from 'zod'
import { ColisLigneSchema, ListeColisSchema } from './coordination-colis.ts'

export const CanalTransportSchema = z.enum(['MILK_RUN', 'MESSAGERIE'])
const texte = z.string().trim().min(1).max(500)
const lienReel = z
  .url()
  .refine((v) => new URL(v).protocol === 'https:', 'Une URL HTTPS réelle est requise')
// Contrat interne de saisie vérifiée, distinct d'un mapping de statuts Geodis non fourni.
export const TransportDonneesSchema = z
  .object({
    canal: CanalTransportSchema,
    boucleId: z.number().int().positive().nullable(),
    numeroSuivi: texte.nullable(),
    recepisse: texte.nullable(),
    etatTransporteur: texte.nullable(),
    dateEtat: z.iso.datetime({ offset: true }).nullable(),
    dateLivraison: z.iso.datetime({ offset: true }).nullable(),
    preuveUrl: lienReel.nullable(),
    images: z.array(lienReel).max(20),
    suiviUrl: lienReel.nullable(),
    provenance: texte,
    referenceSource: texte,
  })
  .superRefine((d, ctx) => {
    if (d.etatTransporteur && !d.dateEtat)
      ctx.addIssue({
        code: 'custom',
        path: ['dateEtat'],
        message: 'Date du constat transporteur requise',
      })
    if (d.preuveUrl && !d.dateLivraison)
      ctx.addIssue({
        code: 'custom',
        path: ['dateLivraison'],
        message: 'Date de livraison attestée requise',
      })
  })
export const TransportImportSchema = z.object({
  colisId: z.number().int().positive(),
  version: z.number().int().nonnegative(),
  donnees: TransportDonneesSchema,
})
export const TransportMetadataSchema = z.object({
  version: z.number().int().positive(),
  donnees: TransportDonneesSchema,
  verifieLe: z.string(),
})
export const TransportBoucleSchema = z.object({
  id: z.number().int(),
  plateformeId: z.number().int(),
  nom: z.string(),
  canal: CanalTransportSchema,
  jour: z.number().int().min(0).max(7),
  heure: z.string(),
  destinataires: z.array(z.number().int()),
})
export const TransportColisSchema = ColisLigneSchema.extend({
  transport: TransportMetadataSchema.nullable(),
})
export const TransportListeSchema = ListeColisSchema.extend({
  colis: z.array(TransportColisSchema),
  boucles: z.array(TransportBoucleSchema),
  geodis: z.literal('NON_CONFIGURE'),
  peutImporter: z.boolean(),
})
export type TransportDonnees = z.infer<typeof TransportDonneesSchema>
export type TransportBoucle = z.infer<typeof TransportBoucleSchema>
import { DepartCamionLigneSchema, DepartsCamionsSchema } from './coordination-colis.ts'
export const TransportDepartsSchema = DepartsCamionsSchema.extend({
  departs: z.array(DepartCamionLigneSchema.extend({ boucle: TransportBoucleSchema.nullable() })),
})
