import { TableMetier, type ColonneMetier, type Lisere } from '../../components/ui/table-metier.tsx'
import { dansIntervalle, semaineParDefaut } from '../../lib/semaine-navigation.ts'
import { FiltreSemaines } from '../../components/ui/filtre-semaines.tsx'
import { BoutonExportTableau } from '../../components/ui/export-tableau.tsx'
import { useSelectionGlissee } from '../../lib/selection-glissee.ts'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AteliersPerimetreSchema,
  InstructionOkResultatSchema,
  ListeDossiersSchema,
  ResultatUnitaireSchema,
  StatutInstructionChangeSchema,
  STATUTS_PREPARATION,
  type DossierCoordination,
} from '@circe/shared'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/button.tsx'
import { ErrorMessage } from '../../components/error-message.tsx'
import { FicheDossierModale } from '../../components/coordination/fiche-dossier.tsx'
import {
  INSTRUCTION,
  PREPARATION,
  libelleInstruction,
  pastilleValidation,
  semaine,
} from '../../components/coordination/libelles.ts'
import { useValiderSelection } from '../../components/coordination/valider-selection.tsx'
import { EtiquettesRack } from '../../components/coordination/etiquettes-rack.tsx'
import { BarreFiltres } from '../../components/ui/barre-filtres.tsx'
import { Modale } from '../../components/ui/modale.tsx'
import { Icone } from '../../components/ui/icone.tsx'
import { VignetteVisuel } from '../../components/ui/vignette-visuel.tsx'
import { exporterExcel } from '../../lib/excel.ts'
import {
  ficheDetail,
  ficheSynthese,
  type Fiche,
  type LigneFiche,
} from '../../lib/fiches-a-traiter.ts'
import { Pastille } from '../../components/ui/pastille.tsx'
import { apiPost, apiRequest } from '../../lib/api-client.ts'
import { can, getMe, requirePermission } from '../../lib/session.ts'
import { useApi } from '../../lib/use-api.ts'

// ECR-COO-01 — « Validation admin et Instruction OK » (socle COO-P01) : une ligne par dossier, statut de
// préparation (RG-COO-063) et instructions (RG-COO-040) ; actions de statut d'instruction (RG-COO-045, 046).
// COO-P02 : filtre « À faire », écart BC / Circé, Instruction OK groupée, fiche dossier (ECR-COO-02).
// COO-P03 : pastille « Validation admin » (RG-COO-019) et son filtre, « Valider la sélection » (RG-COO-010)
// avec confirmation explicite des doutes (ECR-COO-03, RG-COO-012), pré-cochage et « Cocher les cas sûrs »
// (RG-COO-011).

const SearchSchema = z.object({
  dossier: z.coerce.number().int().optional(),
  preparation: z.enum(STATUTS_PREPARATION).optional(),
  atelierId: z.coerce.number().int().optional(),
  /** RG-COO-060 : « À faire (Coordination) » par défaut (maquette) ; « Rien à faire » ; « Tous ». */
  aFaire: z.enum(['A_FAIRE', 'RIEN', 'TOUS']).optional(),
  /** RG-COO-019 : filtre « Validation admin ». */
  // Préréglages par lien de la maquette (`?va=A_FAIRE|FAITE|AUCUNE`) acceptés et traduits.
  va: z.preprocess(
    (v) =>
      ({ A_FAIRE: 'A_CONFIRMER', FAITE: 'VALIDEE', AUCUNE: 'AUCUNE_AFFICHE_RECUE' })[String(v)] ??
      v,
    z.enum(['A_CONFIRMER', 'VALIDEE', 'AUCUNE_AFFICHE_RECUE']).optional(),
  ),
  /** ECR-COO-05 « Voir les dossiers » : dossiers du déroulant seulement. */
  pour: z.enum(['deroulant', 'fixe', 'pliage']).optional(),
  /** ECR-COO-02 : fiche dossier ouverte. */
  fiche: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).optional(),
})
type Search = z.infer<typeof SearchSchema>
type ListeDossiers = z.infer<typeof ListeDossiersSchema>

/** Q-430 : exporte en Excel une fiche construite à partir des lignes affichées. */
function exporterFiche(
  construire: (lignes: LigneFiche[]) => Fiche,
  nom: string,
  lignes: {
    d: DossierCoordination
    l: NonNullable<DossierCoordination['lignesPreparation']>[number]
  }[],
) {
  const fiche = construire(
    lignes.map(({ d, l }) => ({
      type: l.type,
      repartition: l.repartition ?? l.id,
      dossier: d.dossier,
      annonceur: d.annonceur,
      quantite: l.quantite,
      visuel: l.theme,
      repiquage: l.repiquage,
      format: l.format,
      destinataire: l.destinataire,
      depart: l.depart,
      atelier: l.atelier,
    })),
  )
  exporterExcel(nom, fiche.titres, fiche.lignes)
}

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
/** « jeu. 15/10 16h » (heure UTC, comme le calcul de l'API : Q-187 (15)). */
function echeance(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  const m = d.getUTCMinutes()
  return `${JOURS[d.getUTCDay()] ?? ''} ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${String(d.getUTCHours())}h${m ? p(m) : ''}`
}

export const Route = createFileRoute('/coordination/')({
  validateSearch: SearchSchema,
  beforeLoad: requirePermission('instruction.consulter'),
  component: ValidationAdminEtInstructionOk,
})

// RG-COO-009 : info-bulle du bouton désactivé hors coord / admin (maquette « RESERVE »).
const RESERVE = 'Réservé à la Coordination (rôles Coordination et administrateur).'

const ACTION: Record<'A_TRAITER' | 'EN_COURS' | 'ANNULE', string> = {
  ANNULE: 'Annuler',
  A_TRAITER: 'Remettre à traiter',
  EN_COURS: 'Repasser en cours',
}

function query(s: Search) {
  const p = new URLSearchParams()
  for (const k of ['dossier', 'preparation', 'atelierId', 'va', 'page'] as const) {
    if (s[k] !== undefined) p.set(k, String(s[k]))
  }
  const aFaire = s.aFaire ?? 'A_FAIRE'
  if (aFaire !== 'TOUS') p.set('aFaire', aFaire)
  if (s.pour || s.dossier === undefined) p.set('pour', (s.pour ?? 'deroulant').toUpperCase())
  // Tous les dossiers de l'écran d'un coup (fixe, pliage, déroulant) : la recherche par semaine et les filtres portent
  // sur toute la liste, pas sur une page.
  p.set('pageSize', '1000')
  return p.toString()
}

type LigneAT = {
  d: DossierCoordination
  l: NonNullable<DossierCoordination['lignesPreparation']>[number]
}

/** Date au format de Circé (CONVERT 103 : jj/mm/aaaa), lue en UTC comme l'API l'écrit. */
const dateCirce = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : ''

/** Valeurs cochées des filtres multiples de « À traiter ». */
type Choix = { atelier: string[]; afaire: string[]; va: string[]; preparation: string[] }

type Demande = {
  code: string
  version: number
  vers: 'A_TRAITER' | 'EN_COURS' | 'ANNULE'
  depuis: string
  dossier: number
}

function ValidationAdminEtInstructionOk() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const parLigne = search.pour === 'fixe' || search.pour === 'pliage'
  // Filtres à choix multiples (OU dans un même filtre, ET entre filtres). L'API n'accepte qu'une valeur par filtre : une
  // seule valeur cochée lui est envoyée, plusieurs valeurs filtrent les dossiers chargés (voir ECART-122).
  const [choix, setChoix] = useState<Choix>(() => ({
    atelier: search.atelierId === undefined ? [] : [String(search.atelierId)],
    // « À faire (Coordination) » toujours décoché par défaut (demande du 23/11) : seul un lien peut le poser.
    afaire: search.aFaire && search.aFaire !== 'TOUS' ? [search.aFaire] : [],
    va: search.va ? [search.va] : [],
    preparation: search.preparation ? [search.preparation] : [],
  }))
  const unique = (v: string[]) => (v.length === 1 ? v[0] : undefined)
  const interrogee: Search = parLigne
    ? {
        ...search,
        atelierId: unique(choix.atelier) === undefined ? undefined : Number(unique(choix.atelier)),
        aFaire: (unique(choix.afaire) ?? 'TOUS') as Search['aFaire'],
        va: unique(choix.va) as Search['va'],
        preparation: unique(choix.preparation) as Search['preparation'],
      }
    : search
  const q = query(interrogee)
  const { etat, recharger } = useApi(`coo-dossiers?${q}`, (signal) =>
    apiRequest('GET', `/api/coordination/dossiers${q ? `?${q}` : ''}`, {
      schema: ListeDossiersSchema,
      signal,
    }),
  )
  // Pendant un rechargement (changement de filtre), le tableau précédent reste affiché : pas de page qui clignote.
  const [derniere, setDerniere] = useState<ListeDossiers | null>(null)
  if (etat.kind === 'ready' && etat.data !== derniere) setDerniere(etat.data)
  const donnees = etat.kind === 'ready' ? etat.data : derniere
  const [demande, setDemande] = useState<Demande | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const changer = (p: Partial<Search>) => {
    // RG-COO-011 : le pré-cochage ne se refait pas à chaque changement de filtre (sélection figée).
    if (etat.kind === 'ready' && moi.kind === 'ready') setSelection(selection)
    void navigate({
      search: (prev) => ({ ...prev, ...p, page: p.page ?? undefined }),
      replace: true,
    })
  }
  // RG-COO-167 : ateliers du périmètre de l'utilisateur (pas seulement ceux de la page chargée).
  const { etat: refAteliers } = useApi('coo-ateliers', (signal) =>
    apiRequest('GET', '/api/coordination/ateliers', { schema: AteliersPerimetreSchema, signal }),
  )
  const ateliers = refAteliers.kind === 'ready' ? refAteliers.data.ateliers : []
  const [saisieInvalide, setSaisieInvalide] = useState(false)
  // Recherche par semaine de départ, du … au … : par défaut la semaine en cours + 1 (fixe, pliage, déroulant ;
  // demande du 23/11).
  const [semaines, setSemaines] = useState(() => ({
    de: semaineParDefaut(),
    a: semaineParDefaut(),
  }))
  // Semaine par défaut sans donnée : au premier chargement, l'écran se place sur la dernière semaine qui en a (demande du
  // 23/11, données reprises de Circé). Un choix de l'utilisateur n'est jamais modifié.
  const [semaineAjustee, setSemaineAjustee] = useState(false)
  if (!semaineAjustee && donnees) {
    setSemaineAjustee(true)
    const dispo = [
      ...new Set(
        donnees.items
          .flatMap((d) => (parLigne ? (d.lignesPreparation ?? []).map((l) => l.depart) : d.departs))
          .filter((s): s is string => !!s),
      ),
    ].sort()
    const derniereSemaine = dispo[dispo.length - 1]
    if (derniereSemaine && !dispo.some((s) => dansIntervalle(s, semaines.de, semaines.a)))
      setSemaines({ de: derniereSemaine, a: derniereSemaine })
  }
  // RG-COO-044 / 051 / RG-COO-010 : sélection de dossiers (Instruction OK groupée, « Valider la sélection »).
  // RG-COO-011 : tant que l'utilisateur n'a rien choisi (null), les cas sûrs de l'arrivée sont pré-cochés
  // pour coord / admin.
  const [selectionChoisie, setSelection] = useState<number[] | null>(null)
  const [erreurIok, setErreurIok] = useState<unknown>(null)
  const [envoiIok, setEnvoiIok] = useState(false)
  const dansLaSemaine = (d: DossierCoordination) =>
    d.lignesPreparation?.length
      ? d.lignesPreparation.some((l) => dansIntervalle(l.depart, semaines.de, semaines.a))
      : d.departs.length === 0
        ? dansIntervalle(null, semaines.de, semaines.a)
        : d.departs.some((s) => dansIntervalle(s, semaines.de, semaines.a))
  const items = (donnees ? donnees.items : []).filter(
    (d) =>
      dansLaSemaine(d) &&
      (!parLigne ||
        ((choix.va.length === 0 || choix.va.includes(d.validationAdmin.etat)) &&
          (choix.preparation.length === 0 || choix.preparation.includes(d.preparation)) &&
          (choix.afaire.length === 0 ||
            choix.afaire.some((v) => (v === 'A_FAIRE' ? d.aFaire : !d.aFaire))))),
  )
  // À traiter : une ligne par ligne de préparation, bornée par la recherche « Semaine / Année ».
  const lignesAT = items
    .flatMap((d) => (d.lignesPreparation ?? []).map((l) => ({ d, l })))
    .filter(({ l }) => choix.atelier.length === 0 || choix.atelier.includes(String(l.atelierId)))
    .filter(({ l }) => dansIntervalle(l.depart, semaines.de, semaines.a))
  // RG-COO-009 : bouton désactivé hors coord / admin (confort ; le serveur reste juge).
  const { etat: moi } = useApi('moi', () => getMe())
  const peutValider = moi.kind === 'ready' && can(moi.data, 'validation_admin.valider')
  const casSurs = items.filter((d) => d.validationAdmin.casSur)
  // RG-COO-260 / 262 : « Colisage » de Circé, depuis « À traiter » : les lignes cochées passent en Préparation
  // (création des UM, route de l'écran Préparation ; le serveur refuse en 409 une ligne qui n'est plus à traiter).
  const peutColiser = moi.kind === 'ready' && can(moi.data, 'unite.gerer')
  const [lignesCochees, setLignesCochees] = useState<number[]>([])
  const [envoiColisage, setEnvoiColisage] = useState(false)
  const [erreurColisage, setErreurColisage] = useState<unknown>(null)
  async function colisage() {
    const lignes = lignesAT
      .filter((r) => lignesCochees.includes(r.l.id))
      .map((r) => ({ id: r.l.id, version: r.l.version }))
    if (lignes.length === 0) return
    setMessage(null)
    setErreurColisage(null)
    setEnvoiColisage(true)
    try {
      const r = await apiPost('/api/coordination/unitaire/colisage', {
        schema: ResultatUnitaireSchema,
        body: { lignes },
      })
      setMessage(r.message)
      setLignesCochees([])
      recharger()
    } catch (e) {
      setErreurColisage(e)
    } finally {
      setEnvoiColisage(false)
    }
  }
  const selection = selectionChoisie ?? (peutValider ? casSurs.map((d) => d.id) : [])
  const glissement = useSelectionGlissee(
    items
      .filter(
        (d) =>
          d.instructions.some((i) => i.actions.includes('INSTRUCTION_OK')) ||
          d.validationAdmin.aConfirmer > 0,
      )
      .map((d) => d.id),
    selection,
    setSelection,
  )
  // Tableau des dossiers sans ligne de préparation (ECR-COO-01) : colonnes du dossier, filtres d'en-tête du tableau commun.
  const colonnesDossier: ColonneMetier<DossierCoordination>[] = [
    {
      id: 'dossier',
      titre: 'Dossier',
      valeur: (d) => d.dossier,
      rendu: (d) => (
        <button
          type="button"
          className="font-mono underline"
          aria-label={`Ouvrir le dossier ${String(d.dossier)}`}
          onClick={() => {
            changer({ fiche: d.id, page: search.page })
          }}
        >
          {d.dossier}
        </button>
      ),
    },
    { id: 'annonceur', titre: 'Annonceur', valeur: (d) => d.annonceur },
    {
      id: 'atelier',
      titre: 'Atelier',
      valeur: (d) =>
        [
          ...new Set(
            d.instructions.map((i) =>
              i.atelier ? `${i.atelier.libelle} · ${i.atelier.plateforme}` : '—',
            ),
          ),
        ].join(', ') || '—',
    },
    { id: 'depart', titre: 'Départ', valeur: (d) => d.departs.map(semaine).join('+') || '—' },
    {
      id: 'validation',
      titre: 'Validation admin',
      valeur: (d) =>
        d.validationAdmin.etat === 'SANS_OBJET'
          ? '—'
          : pastilleValidation(d.validationAdmin).libelle,
      rendu: (d) => {
        if (d.validationAdmin.etat === 'SANS_OBJET') return '—'
        const va = pastilleValidation(d.validationAdmin)
        return <Pastille ton={va.ton}>{va.libelle}</Pastille>
      },
    },
    {
      id: 'prepa',
      titre: 'Préparation',
      valeur: (d) =>
        `${PREPARATION[d.preparation]?.libelle ?? d.preparation}${d.deadlinePrepa ? ` · deadline ${echeance(d.deadlinePrepa)}` : ''}`,
      rendu: (d) => (
        // RG-COO-066 / 076 : « Pas encore envoyée · deadline jeu. 15/10 16h » (Critique si dépassée).
        <Pastille
          ton={d.deadlineDepassee ? 'critique' : (PREPARATION[d.preparation]?.ton ?? 'neutre')}
        >
          {PREPARATION[d.preparation]?.libelle ?? d.preparation}
          {d.deadlinePrepa && ` · deadline ${echeance(d.deadlinePrepa)}`}
        </Pastille>
      ),
    },
    {
      id: 'ecart',
      titre: 'Écart BC / Circé',
      valeur: (d) => d.ecart,
      rendu: (d) =>
        d.ecart === null ? (
          '—'
        ) : d.ecart === 0 ? (
          '0'
        ) : (
          <Pastille ton="critique">
            {d.ecart > 0 ? `+${String(d.ecart)}` : String(d.ecart)}
          </Pastille>
        ),
    },
    {
      id: 'visuels',
      titre: 'Visuels',
      valeur: (d) => d.pastillesVisuels.nb,
      rendu: (d) => (
        <>
          {d.pastillesVisuels.nb}{' '}
          {d.pastillesVisuels.procheAVerifier && <Pastille ton="surveiller">thème proche</Pastille>}{' '}
          {d.pastillesVisuels.modifieBroadcast && (
            <Pastille ton="important">modifié dans BC</Pastille>
          )}
        </>
      ),
    },
  ]
  // « À traiter » : colonnes de Circé (vues _Preparation2m2FixeATraiterGrid et _PliageATraiterGrid, relevées par la maquette,
  // instructions.js:222-225 ; liste du pliage confirmée par l'utilisateur le 23/11), données de p_s_listeprepa2m2.sql et
  // p_s_listeprepa_pliage.sql. Puis les colonnes absentes de Circé, titre en rouge.
  // Sem. Max (p_s_listeprepa_pliage.sql, #t3) : la dernière semaine de la même répartition après la fin de la recherche.
  const semMax = (l: LigneAT['l']) => {
    const borne = semaines.a || l.depart || ''
    const apres = l.semainesRepartition.filter((s) => s > borne).sort()
    const derniere = apres[apres.length - 1]
    return derniere ? Number(derniere.slice(-2)) : null
  }
  const circe: Record<string, ColonneMetier<LigneAT>> = {
    type: { id: 'type', titre: 'Type prépa', valeur: (r) => r.l.type },
    repart: { id: 'repart', titre: 'Répart', valeur: (r) => r.l.repartition ?? r.l.id },
    dossier: { id: 'dossier', titre: 'Dossier', valeur: (r) => r.d.dossier },
    annonceur: { id: 'annonceur', titre: 'Annonceur', valeur: (r) => r.d.annonceur },
    qte: { id: 'qte', titre: 'Qté', valeur: (r) => r.l.quantite },
    // Thème en texte, comme dans Circé ; le visuel a sa propre colonne, juste après (demande du 24/11).
    theme: { id: 'theme', titre: 'Thème', valeur: (r) => r.l.theme },
    // Vignette du visuel (maquette ui.poster), absente de Circé : titre en gras rouge ; zoom au survol.
    visuel: {
      id: 'visuel',
      titre: 'Visuel',
      valeur: (r) => r.l.theme,
      rendu: (r) => <VignetteVisuel theme={r.l.theme} />,
      ajout: true,
    },
    repiquage: { id: 'repiquage', titre: 'Repiquage', valeur: (r) => r.l.repiquage },
    format: { id: 'format', titre: 'Format', valeur: (r) => r.l.format },
    atelier: { id: 'atelier', titre: 'Atelier', valeur: (r) => r.l.atelier },
    dest: { id: 'dest', titre: 'Destinataire', valeur: (r) => r.l.destinataire },
    // Date_aff de Circé (rpc_dat_aff, jj/mm/aaaa) : seule date de la liste (Q-431).
    depart: {
      id: 'depart',
      titre: 'Date départ',
      valeur: (r) => r.l.dateAffichage?.slice(0, 10) ?? null,
      rendu: (r) => dateCirce(r.l.dateAffichage),
    },
    destination: { id: 'destination', titre: 'Destination', valeur: (r) => r.l.destination },
    semMax: { id: 'semMax', titre: 'Sem. Max', valeur: (r) => semMax(r.l) },
    numAffiche: {
      id: 'numAffiche',
      titre: 'Numéro Affiche',
      valeur: (r) => r.l.numerosAffiche.join(', '),
    },
  }
  const ordreCirce =
    search.pour === 'pliage'
      ? [
          'type',
          'repart',
          'dossier',
          'annonceur',
          'qte',
          'theme',
          'visuel',
          'format',
          'atelier',
          'dest',
          'depart',
          'destination',
          'semMax',
          'numAffiche',
        ]
      : [
          'type',
          'repart',
          'dossier',
          'annonceur',
          'qte',
          'theme',
          'visuel',
          'repiquage',
          'format',
          'dest',
          'depart',
          'destination',
          'atelier',
        ]
  const colonnesLignes: ColonneMetier<LigneAT>[] = [
    ...ordreCirce.flatMap((id) => (circe[id] ? [circe[id]] : [])),
    ...colonnesDossier
      // Pas de colonne « Préparation » : toujours reçue pour une ligne à traiter (process de Circé, demande du 23/11).
      .filter((c) => ['validation', 'ecart'].includes(c.id))
      .map((c): ColonneMetier<LigneAT> => {
        const rendu = c.rendu
        return {
          id: c.id,
          titre: c.titre,
          ajout: true,
          valeur: (r) => c.valeur(r.d),
          ...(rendu ? { rendu: (r: LigneAT) => rendu(r.d) } : {}),
        }
      }),
  ]
  const aValider = items
    .filter((d) => selection.includes(d.id))
    .flatMap((d) => d.instructions.filter((i) => i.actions.includes('INSTRUCTION_OK')))
  // RG-COO-023 : les étiquettes rack à imprimer sont relues après chaque validation.
  const [maj, setMaj] = useState(0)
  const validation = useValiderSelection((m) => {
    setMessage(m)
    setSelection([])
    setMaj((x) => x + 1)
    recharger()
  })
  async function instructionOkGroupee() {
    setErreurIok(null)
    setEnvoiIok(true)
    try {
      const r = await apiPost('/api/coordination/instruction-ok', {
        schema: InstructionOkResultatSchema,
        body: { instructions: aValider.map((i) => ({ code: i.code, version: i.version })) },
      })
      setMessage(r.message)
      setSelection([])
      recharger()
    } catch (e) {
      setErreurIok(e)
    } finally {
      setEnvoiIok(false)
    }
  }
  const champ = 'ml-1 rounded-md border border-slate-300 px-2 py-1 text-sm'
  // « À traiter » : filtres dans le cadre du tableau, sur la ligne de Compact / Colonnes / Exporter (demande du 23/11) :
  // la semaine de départ d'abord, puis À faire, Validation admin, Préparation. Pas de n° de dossier ni d'atelier (le
  // filtre Atelier ne sert pas en 2 m² fixe et pliage, demande du 23/11).
  const barreAT = (
    <BarreFiltres
      libelle="Filtres de À traiter"
      debut={<FiltreSemaines valeur={semaines} onChange={setSemaines} onActualiser={recharger} />}
      filtres={[
        {
          id: 'afaire',
          libelle: 'À faire (Coordination)',
          options: [
            { valeur: 'A_FAIRE', libelle: 'À faire' },
            { valeur: 'RIEN', libelle: 'Rien à faire' },
          ],
          selection: choix.afaire,
          onChange: (sel) => {
            setChoix((c) => ({ ...c, afaire: sel }))
          },
        },
        {
          id: 'va',
          libelle: 'Validation admin',
          options: [
            { valeur: 'A_CONFIRMER', libelle: 'À confirmer' },
            { valeur: 'VALIDEE', libelle: 'Validée' },
            { valeur: 'AUCUNE_AFFICHE_RECUE', libelle: 'Aucune affiche reçue' },
          ],
          selection: choix.va,
          onChange: (sel) => {
            setChoix((c) => ({ ...c, va: sel }))
          },
        },
        // Pas de filtre « Préparation » : une ligne à traiter naît quand la Pré-Prod envoie la préparation depuis
        // Broadcast (process de Circé), sa préparation est donc toujours reçue (demande du 23/11).
      ]}
    />
  )
  // Haut du cadre (demande du 23/11) : Colisage tout à gauche (lignes cochées → Préparation), puis les fiches de
  // préparation à télécharger ; Colonnes et Exporter à droite (TableMetier, `boutonsEnHaut).
  const actionsAT = (
    <span title={peutColiser ? undefined : 'Réservé à la Coordination et au chef d’équipe'}>
      <Button
        type="button"
        disabled={!peutColiser || envoiColisage || lignesCochees.length === 0}
        title="Passe les lignes cochées de « À traiter » à « Préparation » (création des UM)"
        onClick={() => void colisage()}
      >
        Colisage
        {lignesCochees.length ? ` (${String(lignesCochees.length)} ligne(s))` : ''}
      </Button>
    </span>
  )
  // Fiches de préparation à télécharger : tout à droite, avant Exporter (demande du 23/11).
  const fichesAT = (
    <>
      {(
        [
          ['Fiche de préparation Détail', 'fiche-preparation-detail', ficheDetail],
          ['Fiche de préparation Synthèse', 'fiche-preparation-synthese', ficheSynthese],
        ] as const
      ).map(([libelle, fichier, construire]) => (
        <button
          key={fichier}
          type="button"
          className="inline-flex items-center gap-1.5 rounded border border-emerald-600 bg-white px-2.5 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
          title="Export Excel des lignes affichées (provisoire, Q-430)"
          onClick={() => {
            exporterFiche(construire, `${fichier}-${String(search.pour)}`, lignesAT)
          }}
        >
          <Icone nom="file-spreadsheet" />
          {libelle}
        </button>
      ))}
    </>
  )
  // Résultat de Circé, à droite de la ligne des filtres (à la place de Colonnes / Exporter, demande du 23/11).
  const totauxAT = (
    <ResultatAT
      nombreLignes={lignesAT.length}
      quantiteTotale={lignesAT.reduce((s, r) => s + (r.l.quantite ?? 0), 0)}
      partiel={donnees !== null && donnees.total > donnees.pageSize}
    />
  )
  return (
    // « À traiter » (fixe, pliage) prend toute la largeur de la page (demande du 23/11) ; la Liste des instructions reste centrée.
    <main className={parLigne ? 'w-full p-6' : 'mx-auto max-w-7xl p-6'}>
      <p className="text-sm text-slate-500">
        {(search.pour ?? 'deroulant') === 'deroulant'
          ? 'Déroulant'
          : search.pour === 'fixe'
            ? '2 m² fixe'
            : 'Pliage'}
      </p>
      <h1 className="text-2xl font-semibold">
        {(search.pour ?? 'deroulant') === 'deroulant' ? 'Liste des instructions' : 'À traiter'}
      </h1>
      {/* À traiter (2 m² fixe, pliage) : écran de Circé, sans bandeau d'explication ni étiquettes rack (demande du 23/11). */}
      {!parLigne && (
        <p className="mt-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm" role="note">
          <strong>Aucune validation sans vous : Circé propose, vous confirmez.</strong> À la
          réception d’une affiche, Circé propose son rattachement au dossier, sans attendre la
          préparation ni l’Instruction OK. Les cas sûrs sont pré-cochés : « Valider la sélection »
          confirme le lot en un clic. Les cas à doute ne sont jamais pré-cochés : le motif s’affiche
          dans la fiche du dossier, et la validation demande une confirmation explicite.
        </p>
      )}
      {!parLigne &&
        moi.kind === 'ready' &&
        (peutValider || can(moi.data, 'reception.imprimer')) && <EtiquettesRack cle={maj} />}
      {!parLigne && (
        <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <FiltreSemaines valeur={semaines} onChange={setSemaines} onActualiser={recharger} />
          <label>
            N° de dossier
            <input
              className={`${champ} w-28`}
              defaultValue={search.dossier ?? ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = e.currentTarget.value.trim()
                  // Un n° de dossier est numérique : une autre saisie n'est pas envoyée.
                  const invalide = v !== '' && !/^\d+$/.test(v)
                  setSaisieInvalide(invalide)
                  if (!invalide) changer({ dossier: v ? Number(v) : undefined })
                }
              }}
            />
            {saisieInvalide && (
              <span role="alert" className="ml-2 text-xs text-red-700">
                Un n° de dossier ne contient que des chiffres.
              </span>
            )}
          </label>
          <label>
            Atelier
            <select
              className={champ}
              value={search.atelierId ?? ''}
              onChange={(e) => {
                changer({ atelierId: e.target.value ? Number(e.target.value) : undefined })
              }}
            >
              <option value="">
                {refAteliers.kind === 'loading'
                  ? 'Chargement des ateliers…'
                  : refAteliers.kind === 'error'
                    ? 'Ateliers indisponibles'
                    : 'Tous'}
              </option>
              {ateliers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.libelle} · {a.plateforme}
                </option>
              ))}
            </select>
          </label>
          <label>
            À faire (Coordination)
            <select
              className={champ}
              value={search.aFaire ?? 'A_FAIRE'}
              onChange={(e) => {
                changer({ aFaire: e.target.value as Search['aFaire'] })
              }}
            >
              <option value="A_FAIRE">À faire</option>
              <option value="RIEN">Rien à faire</option>
              <option value="TOUS">Tous</option>
            </select>
          </label>
          <label>
            Préparation
            <select
              className={champ}
              value={search.preparation ?? ''}
              onChange={(e) => {
                changer({
                  preparation: (e.target.value || undefined) as Search['preparation'],
                })
              }}
            >
              <option value="">Toutes</option>
              {STATUTS_PREPARATION.map((s) => (
                <option key={s} value={s}>
                  {PREPARATION[s]?.libelle}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="underline"
            onClick={() => {
              // Le contexte de l'écran (déroulant, 2 m² fixe, pliage) est gardé : seuls les filtres sont effacés.
              setSemaines({ de: semaineParDefaut(), a: semaineParDefaut() })
              void navigate({ search: { pour: search.pour }, replace: true })
            }}
          >
            Effacer les filtres
          </button>
          <label>
            Validation admin
            <select
              className={champ}
              value={search.va ?? ''}
              onChange={(e) => {
                changer({ va: (e.target.value || undefined) as Search['va'] })
              }}
            >
              <option value="">Toutes</option>
              <option value="A_CONFIRMER">À confirmer</option>
              <option value="VALIDEE">Validée</option>
              <option value="AUCUNE_AFFICHE_RECUE">Aucune affiche reçue</option>
            </select>
          </label>
        </div>
      )}
      {/* Liste des instructions (Déroulant) : actions sur les dossiers cochés. */}
      {!parLigne && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {' '}
          <span title={peutValider ? undefined : RESERVE}>
            <Button
              type="button"
              disabled={!peutValider || validation.envoi || selection.length === 0}
              onClick={() => {
                // RG-COO-013 : le serveur juge (refus « Rien à valider » si aucune affiche à confirmer).
                setMessage(null)
                void validation.valider(selection)
              }}
            >
              Valider la sélection
              {selection.length ? ` (${String(selection.length)} dossier(s))` : ''}
            </Button>
          </span>
          {aValider.length > 0 && (
            <Button disabled={envoiIok} type="button" onClick={() => void instructionOkGroupee()}>
              Instruction OK (après contrôle) ({aValider.length})
            </Button>
          )}
          {peutValider && donnees && donnees.casSurs > 0 && (
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              title="Dossiers dont il ne reste que des rattachements proposés sans doute : « Valider la sélection » les confirme en un clic"
              onClick={() => {
                setSelection(casSurs.map((d) => d.id))
              }}
            >
              Cocher les cas sûrs ({donnees.casSurs})
            </button>
          )}
        </div>
      )}
      {validation.modale}
      {erreurIok !== null && (
        <div className="mt-2">
          <ErrorMessage error={erreurIok} />
        </div>
      )}
      {message && (
        <p
          role="status"
          className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm"
        >
          {message}
        </p>
      )}
      {erreurColisage !== null && (
        <div className="mt-2">
          <ErrorMessage error={erreurColisage} />
        </div>
      )}{' '}
      {/* ECR-COO-01 : la colonne « Visuels » (nb de thèmes, thème proche, modifié dans BC) est toujours affichée. */}
      <section className="mt-3 rounded-lg border border-slate-200 bg-white">
        {etat.kind === 'loading' && !donnees && (
          <p className="p-3 text-sm text-slate-500">Chargement…</p>
        )}
        {etat.kind === 'loading' && donnees && (
          <p role="status" className="px-3 pt-2 text-xs text-slate-500">
            Actualisation…
          </p>
        )}
        {etat.kind === 'error' && (
          <div className="p-3">
            <ErrorMessage error={etat.error} onRetry={recharger} />
          </div>
        )}
        {!parLigne && donnees && items.length === 0 && (
          <p className="p-3 text-sm text-slate-600">Aucune ligne pour ces filtres.</p>
        )}
        {donnees && (parLigne || items.length > 0) && (
          <>
            {parLigne ? (
              <>
                {/* Lignes de préparation « à traiter » : le tableau de Circé, toujours affiché (même vide), filtres dans son cadre. */}
                {
                  <TableMetier
                    nom="Dossiers"
                    lignes={lignesAT}
                    cle={(r) => r.l.id}
                    colonnes={colonnesLignes}
                    recherche={false}
                    outils={actionsAT}
                    outilsDroite={fichesAT}
                    resumeDroite={totauxAT}
                    boutonsEnHaut
                    resume={barreAT}
                    compteur={false}
                    densite={false}
                    vide="Aucune ligne à traiter pour ces filtres : changez la semaine de départ ou effacez les filtres."
                    onOuvrir={(r) => {
                      changer({ fiche: r.d.id, page: search.page })
                    }}
                    lisere={(r) => lisereDossier(r.d)}
                    selection={{
                      cle: (r) => r.l.id,
                      choisis: lignesCochees,
                      onChange: setLignesCochees,
                      libelle: (r) =>
                        `Sélectionner dossier ${String(r.d.dossier)} ligne ${String(r.l.id)}`,
                    }}
                    actions={(r) => (
                      <button
                        type="button"
                        className="whitespace-nowrap underline"
                        onClick={() => {
                          changer({ fiche: r.d.id, page: search.page })
                        }}
                      >
                        Ouvrir le dossier {r.d.dossier}
                      </button>
                    )}
                  />
                }
              </>
            ) : (
              <>
                <BoutonExportTableau nom="coordination-index" tableau="Dossiers" />
                <table {...glissement} className="w-full text-sm" aria-label="Dossiers">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th scope="col" className="px-3 py-2">
                        <span className="sr-only">Sélection</span>
                      </th>
                      {[
                        'Dossier',
                        'Annonceur',
                        'Atelier',
                        'Départ',
                        'Validation admin',
                        'Préparation',
                        ...((search.pour ?? 'deroulant') === 'deroulant' ? ['Instruction OK'] : []),
                        'Écart BC / Circé',
                        'Visuels',
                      ].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((d) => (
                      <LigneDossier
                        key={d.id}
                        d={d}
                        selectionnee={selection.includes(d.id)}
                        onSelection={(oui) => {
                          setSelection(
                            oui ? [...selection, d.id] : selection.filter((x) => x !== d.id),
                          )
                        }}
                        onFiche={() => {
                          changer({ fiche: d.id, page: search.page })
                        }}
                        onDemande={setDemande}
                        avecVisuels
                        avecInstructionOk={(search.pour ?? 'deroulant') === 'deroulant'}
                      />
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
        {donnees && donnees.total > donnees.pageSize && (
          <div className="flex justify-between p-3 text-sm">
            <span>{donnees.total} dossier(s)</span>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={donnees.page <= 1}
                onClick={() => {
                  changer({ page: donnees.page - 1 })
                }}
              >
                Précédente
              </button>
              <button
                type="button"
                disabled={donnees.page * donnees.pageSize >= donnees.total}
                onClick={() => {
                  changer({ page: donnees.page + 1 })
                }}
              >
                Suivante
              </button>
            </span>
          </div>
        )}
      </section>
      {search.fiche !== undefined && (
        <FicheDossierModale
          dossierId={search.fiche}
          onFermer={(modifie) => {
            changer({ fiche: undefined, page: search.page })
            if (modifie) {
              setMaj((x) => x + 1)
              recharger()
            }
          }}
        />
      )}
      {demande && (
        <ConfirmerStatut
          demande={demande}
          onFermer={(m) => {
            setDemande(null)
            if (m) {
              setMessage(m)
              recharger()
            }
          }}
        />
      )}
    </main>
  )
}

/** Liseré de la ligne d'un dossier (le fond reste blanc) : écart ou deadline dépassée, à faire, validé. */
const lisereDossier = (d: DossierCoordination): Lisere | null =>
  (d.ecart !== null && d.ecart !== 0) || d.deadlineDepassee
    ? 'critique'
    : d.aFaire
      ? 'attention'
      : d.validationAdmin.etat === 'VALIDEE'
        ? 'bon'
        : null

function LigneDossier({
  d,
  selectionnee,
  onSelection,
  onFiche,
  onDemande,
  avecVisuels,
  avecInstructionOk,
}: {
  d: DossierCoordination
  selectionnee: boolean
  onSelection: (oui: boolean) => void
  onFiche: () => void
  onDemande: (x: Demande) => void
  avecVisuels: boolean
  avecInstructionOk: boolean
}) {
  const prep = PREPARATION[d.preparation]
  const selectionnable =
    d.instructions.some((i) => i.actions.includes('INSTRUCTION_OK')) ||
    d.validationAdmin.aConfirmer > 0
  const va = pastilleValidation(d.validationAdmin)
  return (
    <tr
      data-selection-id={selectionnable ? d.id : undefined}
      className={`border-t border-slate-100 align-top ${(d.ecart !== null && d.ecart !== 0) || d.deadlineDepassee ? 'bg-red-50' : d.aFaire ? 'bg-amber-50' : d.validationAdmin.etat === 'VALIDEE' ? 'bg-emerald-50' : ''}`}
    >
      <td className="px-3 py-2">
        {selectionnable && (
          <input
            type="checkbox"
            aria-label={`Sélectionner le dossier ${String(d.dossier)}`}
            checked={selectionnee}
            onChange={(e) => {
              onSelection(e.target.checked)
            }}
          />
        )}
      </td>
      <td className="px-3 py-2 font-mono">
        <button
          type="button"
          className="underline"
          aria-label={`Ouvrir le dossier ${String(d.dossier)}`}
          onClick={onFiche}
        >
          {d.dossier}
        </button>
      </td>
      <td className="px-3 py-2">{d.annonceur ?? '—'}</td>
      <td className="px-3 py-2">
        {[
          ...new Set(
            d.instructions.map((i) =>
              i.atelier ? `${i.atelier.libelle} · ${i.atelier.plateforme}` : '—',
            ),
          ),
        ].join(', ') || '—'}
      </td>
      <td className="px-3 py-2">{d.departs.map(semaine).join('+') || '—'}</td>
      <td className="px-3 py-2">
        {d.validationAdmin.etat === 'SANS_OBJET' ? (
          '—'
        ) : (
          <Pastille ton={va.ton}>{va.libelle}</Pastille>
        )}
      </td>
      <td className="px-3 py-2">
        {/* RG-COO-066 / 076 : « Pas encore envoyée · deadline jeu. 15/10 16h » (Critique si dépassée). */}
        <Pastille ton={d.deadlineDepassee ? 'critique' : (prep?.ton ?? 'neutre')}>
          {prep?.libelle ?? d.preparation}
          {d.deadlinePrepa && ` · deadline ${echeance(d.deadlinePrepa)}`}
        </Pastille>
      </td>
      {avecInstructionOk && (
        <td className="px-3 py-2">
          {d.preparation === 'ANNULE' ? (
            // RG-COO-062 : dossier annulé → « — ».
            '—'
          ) : d.instructions.length === 0 ? (
            '—'
          ) : (
            <ul className="space-y-1" aria-label={`Instructions du dossier ${String(d.dossier)}`}>
              {d.instructions.map((i) => (
                <li key={i.code} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{i.code}</span>
                  {i.depart && <span className="text-xs text-slate-500">{semaine(i.depart)}</span>}
                  <Pastille ton={INSTRUCTION[i.statut]?.ton ?? 'neutre'}>
                    {libelleInstruction(i, d.preparation)}
                  </Pastille>
                  {i.actions
                    .filter((a): a is Demande['vers'] => a !== 'INSTRUCTION_OK')
                    .map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="text-xs underline"
                        onClick={() => {
                          onDemande({
                            code: i.code,
                            version: i.version,
                            vers: a,
                            depuis: i.statut,
                            dossier: d.dossier,
                          })
                        }}
                      >
                        {ACTION[a]}
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </td>
      )}
      <td className="px-3 py-2">
        {d.ecart === null ? (
          '—'
        ) : d.ecart === 0 ? (
          '0'
        ) : (
          <Pastille ton="critique">
            {d.ecart > 0 ? `+${String(d.ecart)}` : String(d.ecart)}
          </Pastille>
        )}
      </td>
      {avecVisuels && (
        <td className="px-3 py-2">
          {d.pastillesVisuels.nb}{' '}
          {d.pastillesVisuels.procheAVerifier && <Pastille ton="surveiller">thème proche</Pastille>}{' '}
          {d.pastillesVisuels.modifieBroadcast && (
            <Pastille ton="important">modifié dans BC</Pastille>
          )}
        </td>
      )}
    </tr>
  )
}

/** « À traiter » : résultat de Circé (nombre de lignes, quantités totales). */
function ResultatAT({
  nombreLignes,
  quantiteTotale,
  partiel,
}: {
  nombreLignes: number
  quantiteTotale: number
  partiel: boolean
}) {
  return (
    <div role="group" aria-label="Résultat" className="flex flex-wrap items-center gap-4 text-sm">
      <span className="text-slate-600">
        Nombre de lignes :{' '}
        <strong data-testid="at-nombre-lignes" className="tabular-nums text-slate-900">
          {nombreLignes.toLocaleString('fr-FR')}
        </strong>
      </span>
      <span className="text-slate-600">
        Quantité totales :{' '}
        <strong data-testid="at-quantite-totale" className="tabular-nums text-slate-900">
          {quantiteTotale.toLocaleString('fr-FR')}
        </strong>
      </span>
      {partiel && (
        <span
          className="text-xs text-slate-500"
          title="D’autres dossiers existent : voir la pagination"
        >
          (page courante)
        </span>
      )}
    </div>
  )
}
/** Confirmation : RG-COO-046 prévient de l'effacement du calcul des trains en sortie d'Instruction OK. */
function ConfirmerStatut({
  demande,
  onFermer,
}: {
  demande: Demande
  onFermer: (message: string | null) => void
}) {
  const [envoi, setEnvoi] = useState<
    { kind: 'repos' | 'en-cours' } | { kind: 'erreur'; error: unknown }
  >({ kind: 'repos' })
  async function confirmer() {
    setEnvoi({ kind: 'en-cours' })
    try {
      const r = await apiPost(
        `/api/coordination/instructions/${encodeURIComponent(demande.code)}/statut`,
        {
          schema: StatutInstructionChangeSchema,
          body: { version: demande.version, vers: demande.vers },
        },
      )
      onFermer(r.message)
    } catch (error) {
      setEnvoi({ kind: 'erreur', error })
    }
  }
  return (
    <Modale
      titre={`${ACTION[demande.vers]} l’instruction ${demande.code}`}
      ouverte
      onOuverture={(o) => {
        if (!o) onFermer(null)
      }}
    >
      <p className="text-sm">
        Dossier {demande.dossier} : {INSTRUCTION[demande.depuis]?.libelle ?? demande.depuis} →{' '}
        {INSTRUCTION[demande.vers]?.libelle ?? demande.vers}.
      </p>
      {demande.depuis === 'INSTRUCTION_OK' && (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm" role="note">
          Le calcul des trains de cette instruction sera effacé (les faces déjà « à imprimer » sont
          conservées).
        </p>
      )}
      {envoi.kind === 'erreur' && (
        <div className="mt-2">
          <ErrorMessage error={envoi.error} />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="text-sm underline"
          onClick={() => {
            onFermer(null)
          }}
        >
          Annuler
        </button>
        <Button type="button" disabled={envoi.kind === 'en-cours'} onClick={() => void confirmer()}>
          Confirmer
        </Button>
      </div>
    </Modale>
  )
}
