import { TableMetier, type ColonneMetier } from '../../components/ui/table-metier.tsx'
import { BarreFiltres } from '../../components/ui/barre-filtres.tsx'
import { FiltreSemaines } from '../../components/ui/filtre-semaines.tsx'
import { Icone } from '../../components/ui/icone.tsx'
import { VignetteVisuel } from '../../components/ui/vignette-visuel.tsx'
import { dansIntervalle, semaineParDefaut } from '../../lib/semaine-navigation.ts'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  EncollerSchema,
  REPERES_UNITAIRE,
  ResultatLiberationSchema,
  ResultatUnitaireSchema,
  STATUTS_UNITE_UNITAIRE,
  SyntheseSchema,
  TYPES_UNITAIRE,
  UnitaireSchema,
  type Encoller,
  type LigneUnitaire,
  type RefRepartition,
  type SemaineLiberation,
  type Synthese,
  type TypeUnitaire,
} from '@circe/shared'
import { useState } from 'react'
import { barresCode39 } from '../../lib/code39.ts'
import { z } from 'zod'
import { Button } from '../../components/button.tsx'
import { ErrorMessage } from '../../components/error-message.tsx'
import { contexteDesFiltres, Edition } from '../../components/impression/edition.tsx'
import { Modale } from '../../components/ui/modale.tsx'
import { Pastille } from '../../components/ui/pastille.tsx'
import { apiPost, apiRequest } from '../../lib/api-client.ts'
import { can, getMe, requirePermission } from '../../lib/session.ts'
import { useApi } from '../../lib/use-api.ts'

// COO-P12 — ECR-COO-09 : Préparation 2 m² fixe / Pliage / Bus (écran « unitaire »). Liste des unités (UM, lot PL,
// BU) avec entretien à l'afficheur (RG-COO-238), actions de ligne « Corriger l'intitulé » (RG-COO-244) et de quantité
// (RG-COO-239), actions groupées « Plié : saisir le comptage » (RG-COO-247), « Retirer » / « Préparer »
// (RG-COO-249, 250), « Rendre la main à la Pré-Prod » (RG-COO-243), « Fiche de synthèse » (RG-COO-246) et « Quantités à
// encoller » (Bus, RG-COO-304). Étape 8 (Q-265, option (c) par défaut) : « Libérer la Sxx » (RG-COO-240, ne crée pas les
// UM), repères « à libérer » et « arrivé après libération » (RG-COO-241, 242) et « Colisage » (RG-COO-260 à 262).

const SearchSchema = z.object({
  type: z.enum(TYPES_UNITAIRE).default('fixe'),
  atelier: z.coerce.number().int().positive().optional(),
  depart: z.string().optional(),
  dossier: z.coerce.number().int().positive().optional(),
  annonceur: z.string().optional(),
  statut: z.enum(STATUTS_UNITE_UNITAIRE).optional(),
  destinataire: z.string().optional(),
  afficheur: z.string().optional(),
  repere: z.enum(REPERES_UNITAIRE).optional(),
})
type Search = z.infer<typeof SearchSchema>

export const Route = createFileRoute('/coordination/unitaire')({
  validateSearch: SearchSchema,
  beforeLoad: requirePermission('train.consulter'),
  component: Unitaire,
})

// En-tête de la page : l'onglet de l'atelier en sur-titre, puis « Préparation » (demande du 23/11 : la page appartient à
// l'onglet 2 m² fixe ou Pliage ; la Coordination peut y travailler, mais elle n'en est pas le titre). Comme « À traiter ».
const ONGLETS: Record<TypeUnitaire, string> = {
  fixe: '2 m² fixe',
  pliage: 'Pliage',
  bus: 'Bus',
}
const TITRES: Record<TypeUnitaire, string> = {
  fixe: 'Préparation',
  pliage: 'Préparation',
  bus: 'Préparation par centre',
}
const STATUTS: Record<string, { libelle: string; ton: 'neutre' | 'info' | 'ok' | 'surveiller' }> = {
  A_TRAITER: { libelle: 'À traiter', ton: 'surveiller' },
  EN_COURS: { libelle: 'En cours', ton: 'info' },
  PREPARE: { libelle: 'Préparé', ton: 'ok' },
  A_EXPEDIER: { libelle: 'À expédier', ton: 'ok' },
  TERMINE: { libelle: 'Terminé', ton: 'ok' },
  AU_ROULAGE: { libelle: 'Au roulage', ton: 'ok' },
  EXPORT_PREPA: { libelle: 'Export prépa', ton: 'ok' },
  A_IMPRIMER: { libelle: 'À imprimer', ton: 'info' },
  INSTRUCTION_OK: { libelle: 'Instruction OK', ton: 'info' },
}
const AFFICHE = { VALIDEE: '✓', PROPOSEE: '•', AUCUNE: '' } as const

// Couleur des boutons selon leur origine (demande du 23/11) : action de Circé en noir (composant Button), document à
// imprimer ou exporter en vert, bouton venu de la maquette (absent de la page Préparation de Circé) en rose.
const BOUTON_EXPORT =
  'inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50'
const BOUTON_MAQUETTE =
  'rounded-md bg-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-pink-600 disabled:cursor-not-allowed disabled:opacity-50'
const ORIGINE_MAQUETTE = 'Bouton de la maquette : absent de la page Préparation de Circé'

const query = (s: Search & { departDe?: string; departA?: string }) => {
  const p = new URLSearchParams()
  const valeurs: Record<string, string | number | undefined> = { ...s }
  for (const [k, v] of Object.entries(valeurs)) if (v !== undefined && v !== '') p.set(k, String(v))
  return p.toString()
}
const refsDe = (lignes: readonly LigneUnitaire[]): RefRepartition[] => lignes.flatMap((l) => l.refs)

function Unitaire() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  // Semaine de départ, du … au … : la semaine en cours + 1 par défaut, comme « À traiter » (demande du 23/11).
  const [semaines, setSemaines] = useState(() => {
    const s = search.depart ?? semaineParDefaut()
    return { de: s, a: s }
  })
  // Filtres à choix multiples (OU dans un filtre, ET entre filtres), appliqués aux lignes chargées.
  const [filtres, setFiltres] = useState<{ statut: string[]; repere: string[]; atelier: string[] }>(
    () => ({
      statut: search.statut ? [search.statut] : [],
      repere: search.repere ? [search.repere] : [],
      atelier: search.atelier === undefined ? [] : [String(search.atelier)],
    }),
  )
  // L'API reçoit la semaine quand elle est unique (libération de la semaine) ; statut, repère et atelier sont filtrés ici.
  const qs = query({
    ...search,
    statut: undefined,
    repere: undefined,
    atelier: undefined,
    depart: semaines.de && semaines.de === semaines.a ? semaines.de : undefined,
    departDe: semaines.de && semaines.de !== semaines.a ? semaines.de : undefined,
    departA: semaines.a && semaines.de !== semaines.a ? semaines.a : undefined,
  })
  const { etat, recharger } = useApi(`unitaire-${qs}`, (signal) =>
    apiRequest('GET', `/api/coordination/unitaire?${qs}`, { schema: UnitaireSchema, signal }),
  )
  // Pendant un rechargement (changement de semaine ou de filtre), le tableau précédent reste affiché, avec ses filtres.
  const [derniere, setDerniere] = useState<z.infer<typeof UnitaireSchema> | null>(null)
  if (etat.kind === 'ready' && etat.data !== derniere) setDerniere(etat.data)
  const donnees = etat.kind === 'ready' ? etat.data : derniere
  // Semaine par défaut sans donnée : au premier chargement, l'écran se place sur la dernière semaine qui en a (demande du
  // 23/11, données reprises de Circé). Un choix de l'utilisateur ou un lien (?depart=) n'est jamais modifié.
  const [semaineAjustee, setSemaineAjustee] = useState(search.depart !== undefined)
  if (!semaineAjustee && donnees) {
    setSemaineAjustee(true)
    const dispo = donnees.semainesDisponibles
    const derniereSemaine = dispo[dispo.length - 1]
    if (derniereSemaine && !dispo.includes(semaines.de))
      setSemaines({ de: derniereSemaine, a: derniereSemaine })
  }
  const { etat: moi } = useApi('moi', () => getMe())
  const peut = (code: Parameters<typeof can>[1]) => moi.kind === 'ready' && can(moi.data, code)
  const [choix, setChoix] = useState<ReadonlySet<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<unknown>(null)
  const [modale, setModale] = useState<
    | { kind: 'intitule' | 'quantite'; ligne: LigneUnitaire }
    | { kind: 'main' | 'comptage' | 'synthese' | 'encoller' | 'etiquettes' }
    | null
  >(null)
  const statutDe = (l: LigneUnitaire) => (l.aLiberer ? 'A_LIBERER' : l.statut)
  const lignes = (donnees ? donnees.lignes : []).filter(
    (l) =>
      dansIntervalle(l.depart, semaines.de, semaines.a) &&
      (filtres.statut.length === 0 || filtres.statut.includes(statutDe(l))) &&
      (filtres.repere.length === 0 ||
        filtres.repere.some(
          (r) =>
            (r === 'RENDU' && l.rendue) ||
            (r === 'A_LIBERER' && l.aLiberer) ||
            (r === 'APRES_LIBERATION' && l.apresLiberation),
        )) &&
      (filtres.atelier.length === 0 || filtres.atelier.includes(String(l.atelier.id))),
  )
  const selection = lignes.filter((l) => choix.has(l.cle))
  const bus = search.type === 'bus'

  const fermer = (msg: string | null) => {
    setModale(null)
    if (msg) {
      setMessage(msg)
      setChoix(new Set())
      recharger()
    }
  }
  async function liberer(sem: SemaineLiberation) {
    setMessage(null)
    setErreur(null)
    try {
      const r = await apiPost('/api/coordination/unitaire/liberer', {
        schema: ResultatLiberationSchema,
        body: { atelierId: sem.atelierId, depart: sem.depart },
      })
      setMessage(r.message)
      recharger()
    } catch (e) {
      setErreur(e)
    }
  }
  async function action(chemin: 'retirer' | 'preparer' | 'colisage') {
    setMessage(null)
    setErreur(null)
    try {
      const r = await apiPost(`/api/coordination/unitaire/${chemin}`, {
        schema: ResultatUnitaireSchema,
        body: { lignes: refsDe(selection) },
      })
      fermer(r.message)
    } catch (e) {
      setErreur(e)
    }
  }
  const ecriture = peut('unite.gerer')

  // Première ligne du cadre (demande du 23/11) : actions à gauche, documents et export Excel à droite.
  // Circé (Préparation 2 m² fixe / pliage) : « Préparer » et « Retirer » (PreparationService.cs, RG-COO-249 / 250),
  // « Etiquette » et « Synthese » (_2m2FixePreparationController.cs:178-212, états …EtiquetteCCFReport et
  // …SyntheseA4Report). Pas de Colisage ici : dans Circé il est sur « À traiter » (demande du 23/11). Les autres viennent de
  // la maquette : Rendre la main (Administration › Déblocage dans Circé, RG-COO-243 ; retiré du pliage le 24/11), Bus. Le
  // comptage du pliage (« Plié : saisir le comptage », RG-COO-247) est retiré de l'écran à la demande du 24/11.
  const sansSelection = selection.length === 0
  const actionsBarre = (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Actions">
      <Button
        type="button"
        disabled={!ecriture || sansSelection}
        onClick={() => {
          void action('preparer')
        }}
      >
        Préparer
      </Button>
      <Button
        type="button"
        disabled={!ecriture || sansSelection}
        onClick={() => {
          void action('retirer')
        }}
      >
        Retirer
      </Button>
      {/* Demande du 24/11 : « Rendre la main à la Pré-Prod » et « Plié : saisir le comptage » retirés du pliage. */}
      {search.type !== 'pliage' && (
        <button
          type="button"
          className={BOUTON_MAQUETTE}
          disabled={!peut('preprod.rendre_main') || sansSelection}
          title={
            peut('preprod.rendre_main')
              ? `À confirmer (doute du 23/11, Q-433). ${ORIGINE_MAQUETTE} (dans Circé : Administration › Déblocage préparations)`
              : 'Réservé à la Coordination'
          }
          onClick={() => {
            setModale({ kind: 'main' })
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icone nom="x" className="size-4" />
            Rendre la main à la Pré-Prod
          </span>
        </button>
      )}
      {bus && (
        <button
          type="button"
          className={BOUTON_MAQUETTE}
          title={ORIGINE_MAQUETTE}
          onClick={() => {
            setModale({ kind: 'encoller' })
          }}
        >
          Quantités à encoller
        </button>
      )}
    </div>
  )
  const exportsBarre = (
    <>
      <button
        type="button"
        className={BOUTON_EXPORT}
        disabled={sansSelection}
        title="Étiquettes des UM cochées, à imprimer (« Etiquette » de Circé)"
        onClick={() => {
          setModale({ kind: 'etiquettes' })
        }}
      >
        <Icone nom="printer" />
        Étiquettes
      </button>
      <button
        type="button"
        className={BOUTON_EXPORT}
        title="Fiche de synthèse à imprimer (« Synthèse » de Circé)"
        onClick={() => {
          setModale({ kind: 'synthese' })
        }}
      >
        <Icone nom="file-spreadsheet" />
        Fiche de synthèse
      </button>
    </>
  ) // Ligne des filtres : la semaine de départ d'abord, puis Statut, Repère, Atelier (choix multiples, compteurs).
  const toutesDeLaSemaine = (donnees ? donnees.lignes : []).filter((l) =>
    dansIntervalle(l.depart, semaines.de, semaines.a),
  )
  const compter = (test: (l: LigneUnitaire) => boolean) => toutesDeLaSemaine.filter(test).length
  const barreFiltres = (
    <BarreFiltres
      libelle="Filtres de la préparation"
      debut={<FiltreSemaines valeur={semaines} onChange={setSemaines} onActualiser={recharger} />}
      filtres={[
        {
          id: 'statut',
          libelle: 'Statut',
          options: [...new Set(toutesDeLaSemaine.map(statutDe))].map((s) => ({
            valeur: s,
            libelle: s === 'A_LIBERER' ? 'À libérer' : (STATUTS[s]?.libelle ?? s),
            nombre: compter((l) => statutDe(l) === s),
          })),
          selection: filtres.statut,
          onChange: (sel) => {
            setFiltres((x) => ({ ...x, statut: sel }))
          },
        },
        {
          id: 'repere',
          libelle: 'Repère',
          options: [
            {
              valeur: 'RENDU',
              libelle: 'Main rendue à la Pré-Prod',
              nombre: compter((l) => l.rendue),
            },
            { valeur: 'A_LIBERER', libelle: 'À libérer', nombre: compter((l) => l.aLiberer) },
            {
              valeur: 'APRES_LIBERATION',
              libelle: 'Arrivé après libération',
              nombre: compter((l) => l.apresLiberation),
            },
          ],
          selection: filtres.repere,
          onChange: (sel) => {
            setFiltres((x) => ({ ...x, repere: sel }))
          },
        },
        {
          id: 'atelier',
          libelle: 'Atelier',
          options: (donnees ? donnees.ateliers : []).map((a) => ({
            valeur: String(a.id),
            libelle: `${a.libelle} · ${a.plateforme}`,
            nombre: compter((l) => l.atelier.id === a.id),
          })),
          selection: filtres.atelier,
          onChange: (sel) => {
            setFiltres((x) => ({ ...x, atelier: sel }))
          },
        },
      ]}
    />
  )
  return (
    // Pleine largeur, comme « À traiter » (demande du 23/11).
    <main className="w-full p-6">
      <p className="text-sm text-slate-500">{ONGLETS[search.type]}</p>
      <h1 className="text-2xl font-semibold">{TITRES[search.type]}</h1>

      {donnees && (
        <section
          className="mt-3 space-y-2"
          aria-label="Libération de la semaine"
          data-testid="liberation"
        >
          {donnees.liberation.semaines.length === 0 && (
            <p role="note" className="rounded-md border border-sky-200 bg-sky-50 p-2 text-sm">
              Aucune semaine de départ à libérer pour ces filtres.
            </p>
          )}
          {donnees.liberation.semaines.map((sem) => (
            <div
              key={`${String(sem.atelierId)}-${sem.depart}`}
              role="note"
              className={`rounded-md border p-2 text-sm ${sem.libereeLe ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'}`}
            >
              {sem.libereeLe ? (
                <p>
                  {sem.depart} libérée vers l’atelier {sem.atelier} le{' '}
                  {new Date(sem.libereeLe).toLocaleString('fr-FR', { timeZone: 'UTC' })}
                  {sem.libereePar ? ` (${sem.libereePar})` : ''} — Toute préparation reçue après
                  déclenche une alerte et un mail.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p>
                    {sem.depart} pas encore libérée vers l’atelier {sem.atelier} — ses{' '}
                    {sem.lignesALiberer} ligne(s) sont « à libérer ».
                  </p>
                  <Button
                    type="button"
                    disabled={!peut('semaine.liberer')}
                    title={peut('semaine.liberer') ? undefined : 'Réservé à la Coordination'}
                    onClick={() => {
                      void liberer(sem)
                    }}
                  >
                    Libérer la {sem.depart.slice(5)}
                  </Button>
                </div>
              )}
              {sem.dossiersApres.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-amber-900">
                  Arrivés après la libération : dossier(s) {sem.dossiersApres.join(', ')}.
                  <Button
                    type="button"
                    onClick={() => {
                      void navigate({
                        search: (x) => ({
                          ...x,
                          atelier: sem.atelierId,
                          repere: 'APRES_LIBERATION',
                        }),
                      })
                    }}
                  >
                    Voir ces dossiers
                  </Button>
                </p>
              )}
            </div>
          ))}
        </section>
      )}
      {donnees && donnees.themesExclus.length > 0 && (
        <p className="mt-2 text-xs text-slate-600" aria-label="Thèmes exclus">
          Thèmes exclus par Broadcast, sortis de la liste : {donnees.themesExclus.join(', ')}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm"
        >
          {message}
        </p>
      )}
      {erreur !== null && (
        <div className="mt-3">
          <ErrorMessage error={erreur} />
        </div>
      )}

      <section className="mt-3" aria-label="Unités">
        {etat.kind === 'loading' && !donnees && <p>Chargement…</p>}
        {etat.kind === 'loading' && donnees && (
          <p role="status" className="mb-1 text-xs text-slate-500">
            Actualisation…
          </p>
        )}
        {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
        {donnees && (
          <TableMetier
            key={search.type}
            nom="Unités de préparation"
            lignes={lignes}
            cle={(l) => l.cle}
            colonnes={colonnesUnitaire(search.type)}
            recherche={false}
            boutonsEnHaut
            outils={actionsBarre}
            outilsDroite={exportsBarre}
            resume={barreFiltres}
            // Résultat, comme « À traiter » : nombre de lignes | quantités totales (Qté des lignes affichées).
            resumeDroite={
              <span
                role="group"
                aria-label="Résultat"
                className="flex items-center gap-3 text-sm text-slate-600"
              >
                <span>
                  Nombre de lignes :{' '}
                  <strong className="tabular-nums text-slate-900">{lignes.length}</strong>
                </span>
                <span aria-hidden="true" className="h-4 w-px bg-slate-300" />
                <span>
                  Quantité totales :{' '}
                  <strong className="tabular-nums text-slate-900">
                    {lignes.reduce((s, l) => s + l.qte, 0).toLocaleString('fr-FR')}
                  </strong>
                </span>
              </span>
            }
            compteur={false}
            densite={false}
            vide={
              donnees.ateliers.length === 0
                ? 'Pas d’atelier de préparation sur ce site.'
                : 'Aucune unité à préparer pour ces filtres : changez la semaine de départ ou les filtres.'
            }
            selection={{
              cle: (l) => l.cle,
              choisis: [...choix],
              onChange: (ids) => {
                setChoix(new Set(ids))
              },
              libelle: (l) => `Sélectionner ${l.theme ?? ''}`,
            }}
            actions={(l) => (
              <div className="flex gap-2 whitespace-nowrap">
                {!bus && (
                  <Button
                    type="button"
                    disabled={!peut('intitule.corriger')}
                    onClick={() => {
                      setModale({ kind: 'intitule', ligne: l })
                    }}
                  >
                    Corriger l’intitulé
                  </Button>
                )}
                {bus && (
                  <Button
                    type="button"
                    disabled={!peut('intitule.corriger')}
                    onClick={() => {
                      setModale({ kind: 'intitule', ligne: l })
                    }}
                  >
                    Textes de bague
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={!ecriture || l.refs.length !== 1}
                  title={
                    l.refs.length === 1
                      ? undefined
                      : 'Ligne regroupée : modifiez une unité à la fois'
                  }
                  onClick={() => {
                    setModale({ kind: 'quantite', ligne: l })
                  }}
                >
                  Quantité
                </Button>
              </div>
            )}
          />
        )}{' '}
      </section>

      {modale?.kind === 'intitule' && <ModaleIntitule ligne={modale.ligne} onFermer={fermer} />}
      {modale?.kind === 'quantite' && <ModaleQuantite ligne={modale.ligne} onFermer={fermer} />}
      {modale?.kind === 'main' && <ModaleMain lignes={selection} onFermer={fermer} />}
      {modale?.kind === 'comptage' && <ModaleComptage lignes={selection} onFermer={fermer} />}
      {modale?.kind === 'etiquettes' && (
        <ModaleEtiquettes
          type={search.type}
          lignes={selection}
          onFermer={() => {
            setModale(null)
          }}
        />
      )}
      {modale?.kind === 'synthese' && (
        <ModaleSynthese
          qs={qs}
          onFermer={() => {
            setModale(null)
          }}
        />
      )}
      {modale?.kind === 'encoller' && (
        <ModaleEncoller
          peutEcrire={ecriture}
          onFermer={fermer}
          depart={search.depart}
          sites={[
            ...new Map(
              (lignes.length > 0
                ? lignes.map((l) => l.atelier)
                : donnees
                  ? donnees.ateliers
                  : []
              ).map((a) => [a.plateformeId, a.plateforme] as const),
            ),
          ]}
        />
      )}
    </main>
  )
}

/** Envoi commun des modales : bouton désactivé pendant la requête, erreur métier affichée. */
function useEnvoi() {
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<unknown>(null)
  async function lancer(corps: () => Promise<void>) {
    setEnvoi(true)
    setErreur(null)
    try {
      await corps()
    } catch (e) {
      setErreur(e)
    } finally {
      setEnvoi(false)
    }
  }
  return { envoi, erreur, lancer }
}

/** ECR-COO-09c (RG-COO-244) : annonceur imprimé, thème, « Prévenir la Pré-Prod ». */
function ModaleIntitule({
  ligne,
  onFermer,
}: {
  ligne: LigneUnitaire
  onFermer: (m: string | null) => void
}) {
  const [annonceur, setAnnonceur] = useState(ligne.annonceur ?? '')
  const [theme, setTheme] = useState(ligne.theme ?? '')
  const [prevenir, setPrevenir] = useState(true)
  const { envoi, erreur, lancer } = useEnvoi()
  const ref = ligne.refs[0]
  return (
    <Modale
      titre={ligne.type === 'bus' ? 'Textes de bague' : 'Corriger l’intitulé'}
      ouverte
      onOuverture={(o) => {
        if (!o) onFermer(null)
      }}
    >
      {ligne.enProduction && (
        <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm" role="note">
          La production est lancée : la correction porte sur l’intitulé imprimé seulement.
        </p>
      )}
      <label className="block text-sm">
        Annonceur imprimé
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
          value={annonceur}
          onChange={(e) => {
            setAnnonceur(e.target.value)
          }}
        />
      </label>
      <label className="mt-2 block text-sm">
        Thème
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
          value={theme}
          onChange={(e) => {
            setTheme(e.target.value)
          }}
        />
      </label>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={prevenir}
          onChange={(e) => {
            setPrevenir(e.target.checked)
          }}
        />
        Prévenir la Pré-Prod, pour aligner Broadcast si besoin
      </label>
      {erreur !== null && (
        <div className="mt-3">
          <ErrorMessage error={erreur} />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => {
            onFermer(null)
          }}
        >
          Annuler
        </Button>
        <Button
          type="button"
          disabled={envoi || !ref}
          onClick={() => {
            if (ref)
              void lancer(async () => {
                const r = await apiPost('/api/coordination/unitaire/corriger-intitule', {
                  schema: ResultatUnitaireSchema,
                  body: { ...ref, annonceur, theme, prevenirPreProd: prevenir },
                })
                onFermer(r.message)
              })
          }}
        >
          Corriger
        </Button>
      </div>
    </Modale>
  )
}

/** RG-COO-239 : modifier la quantité à produire d'une ligne. */
function ModaleQuantite({
  ligne,
  onFermer,
}: {
  ligne: LigneUnitaire
  onFermer: (m: string | null) => void
}) {
  const [valeur, setValeur] = useState(String(ligne.qte))
  const { envoi, erreur, lancer } = useEnvoi()
  const ref = ligne.refs[0]
  return (
    <Modale
      titre="Modifier la quantité à produire"
      ouverte
      onOuverture={(o) => {
        if (!o) onFermer(null)
      }}
    >
      <label className="block text-sm">
        Quantité
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
          inputMode="numeric"
          value={valeur}
          onChange={(e) => {
            setValeur(e.target.value)
          }}
        />
      </label>
      {erreur !== null && (
        <div className="mt-3">
          <ErrorMessage error={erreur} />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => {
            onFermer(null)
          }}
        >
          Annuler
        </Button>
        <Button
          type="button"
          disabled={envoi || !ref || !/^\d+$/.test(valeur.trim())}
          onClick={() => {
            if (ref)
              void lancer(async () => {
                const r = await apiPost('/api/coordination/unitaire/quantite', {
                  schema: ResultatUnitaireSchema,
                  body: { ...ref, quantite: Number(valeur.trim()) },
                })
                onFermer(r.message)
              })
          }}
        >
          Enregistrer
        </Button>
      </div>
    </Modale>
  )
}

/** ECR-COO-09b (RG-COO-243) : motif (défaut de la maquette) et avertissement des unités déjà en production. */
function ModaleMain({
  lignes,
  onFermer,
}: {
  lignes: LigneUnitaire[]
  onFermer: (m: string | null) => void
}) {
  const [motif, setMotif] = useState('Changement de visuel demandé par le client')
  const { envoi, erreur, lancer } = useEnvoi()
  const lancees = lignes.filter((l) => l.enProduction).length
  return (
    <Modale
      titre="Rendre la main à la Pré-Prod"
      ouverte
      onOuverture={(o) => {
        if (!o) onFermer(null)
      }}
    >
      {lancees > 0 && (
        <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm" role="note">
          {lancees} unité(s) déjà en production — Elles ne seront pas retirées (point de
          non-retour).
        </p>
      )}
      <label className="block text-sm">
        Motif
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
          value={motif}
          maxLength={200}
          onChange={(e) => {
            setMotif(e.target.value)
          }}
        />
      </label>
      {erreur !== null && (
        <div className="mt-3">
          <ErrorMessage error={erreur} />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => {
            onFermer(null)
          }}
        >
          Annuler
        </Button>
        <Button
          type="button"
          disabled={envoi}
          onClick={() => {
            void lancer(async () => {
              const r = await apiPost('/api/coordination/unitaire/rendre-la-main', {
                schema: ResultatUnitaireSchema,
                body: { lignes: refsDe(lignes), motif },
              })
              onFermer(r.message)
            })
          }}
        >
          Rendre la main
        </Button>
      </div>
    </Modale>
  )
}

/** RG-COO-247 : « Affiches comptées » (défaut = attendu), « Valider le comptage ». */
function ModaleComptage({
  lignes,
  onFermer,
}: {
  lignes: LigneUnitaire[]
  onFermer: (m: string | null) => void
}) {
  const attendu = lignes.reduce((x, l) => x + l.total, 0)
  const [comptees, setComptees] = useState(String(attendu))
  const { envoi, erreur, lancer } = useEnvoi()
  return (
    <Modale
      titre="Plié : saisir le comptage"
      ouverte
      onOuverture={(o) => {
        if (!o) onFermer(null)
      }}
    >
      <p className="text-sm">Attendu : {attendu} affiche(s).</p>
      <label className="mt-2 block text-sm">
        Affiches comptées
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
          inputMode="numeric"
          value={comptees}
          onChange={(e) => {
            setComptees(e.target.value)
          }}
        />
      </label>
      {erreur !== null && (
        <div className="mt-3">
          <ErrorMessage error={erreur} />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => {
            onFermer(null)
          }}
        >
          Annuler
        </Button>
        <Button
          type="button"
          disabled={envoi || !/^\d+$/.test(comptees.trim())}
          onClick={() => {
            void lancer(async () => {
              const r = await apiPost('/api/coordination/unitaire/comptage', {
                schema: ResultatUnitaireSchema,
                body: { lignes: refsDe(lignes), comptees: Number(comptees.trim()) },
              })
              onFermer(r.message)
            })
          }}
        >
          Valider le comptage
        </Button>
      </div>
    </Modale>
  )
}

/**
 * « Etiquette » de Circé (_2m2FixePreparationController.cs:178-207 : étiquettes des UM cochées, état
 * PreparationColisageEtiquetteCCFReport / PliageColisageEtiquetteCCFReport). La mise en page RDLC d'origine n'est pas
 * dans le dossier de Circé : contenu repris des colonnes de la page (HYPOTHÈSE Q-432). Une étiquette par UM ; les
 * lignes cochées sans UM sont signalées (l'UM se crée par le Colisage, sur « À traiter »). Impression par le navigateur (D-18).
 */
function ModaleEtiquettes({
  type,
  lignes,
  onFermer,
}: {
  type: TypeUnitaire
  lignes: readonly LigneUnitaire[]
  onFermer: () => void
}) {
  const avecUm = lignes.filter((l) => l.unite !== null)
  const sansUm = lignes.length - avecUm.length
  return (
    <Modale
      titre="Étiquettes"
      ouverte
      large
      onOuverture={(o) => {
        if (!o) onFermer()
      }}
    >
      {sansUm > 0 && (
        <p role="note" className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm">
          {sansUm} ligne(s) cochée(s) sans UM : pas d’étiquette (l’UM se crée par le Colisage, sur «
          À traiter »).
        </p>
      )}
      {avecUm.length === 0 ? (
        <p className="text-sm text-slate-600">Aucune UM dans la sélection.</p>
      ) : (
        <Edition titre={`Étiquettes · ${TITRES[type]} ${ONGLETS[type]}`}>
          <div className="grid grid-cols-2 gap-3">
            {avecUm.map((l) => (
              <EtiquetteUm key={l.cle} ligne={l} />
            ))}
          </div>
        </Edition>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" onClick={onFermer}>
          Fermer
        </Button>
        <Button
          type="button"
          disabled={avecUm.length === 0}
          onClick={() => {
            window.print()
          }}
        >
          Imprimer les étiquettes
        </Button>
      </div>
    </Modale>
  )
}

function EtiquetteUm({ ligne }: { ligne: LigneUnitaire }) {
  const code = ligne.unite?.code ?? ''
  const { barres, longueur } = barresCode39(code, 2)
  return (
    <section
      aria-label={`Étiquette ${code}`}
      className="break-inside-avoid rounded border border-slate-400 p-2 text-xs"
    >
      <p className="text-base font-bold">{code}</p>
      <svg
        role="img"
        aria-label={`Code-barres ${code}`}
        viewBox={`0 0 ${String(longueur)} 24`}
        className="my-1 h-8 w-full"
        preserveAspectRatio="none"
      >
        {barres.map((b) => (
          <rect key={b.x} x={b.x} y={0} width={b.largeur} height={24} fill="currentColor" />
        ))}
      </svg>
      <p>
        <strong>{ligne.destinataire ?? '—'}</strong>
      </p>
      <p>
        Dossier {ligne.dossier ?? '—'} · {ligne.annonceur ?? '—'}
      </p>
      <p>
        {ligne.theme ?? '—'}
        {ligne.repiquage ? ` · ${ligne.repiquage}` : ''}
      </p>
      <p>
        {ligne.format ?? '—'} · Qté {ligne.total} · {ligne.depart ?? '—'} · {ligne.atelier.libelle}
      </p>
    </section>
  )
}
/** ECR-COO-09d (RG-COO-246) : fiche de synthèse groupée par destinataire ; impression côté navigateur (RG-COO-306). */
function ModaleSynthese({ qs, onFermer }: { qs: string; onFermer: () => void }) {
  const { etat, recharger } = useApi(`unitaire-synthese-${qs}`, (signal) =>
    apiRequest('GET', `/api/coordination/unitaire/synthese?${qs}`, {
      schema: SyntheseSchema,
      signal,
    }),
  )
  return (
    <Modale
      titre="Fiche de synthèse"
      ouverte
      large
      onOuverture={(o) => {
        if (!o) onFermer()
      }}
    >
      {etat.kind === 'loading' && <p>Chargement…</p>}
      {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
      {etat.kind === 'ready' && (
        // D-18 : modèle d'édition imprimé par le navigateur (zone d'impression, en-tête, filtres appliqués).
        <Edition
          titre={`Fiche de synthèse · ${TITRES[etat.data.type]} ${ONGLETS[etat.data.type]}`}
          contexte={contexteDesFiltres(new URLSearchParams(qs), {
            depart: 'Départ',
            dossier: 'N° de dossier',
            annonceur: 'Annonceur',
            statut: 'Statut',
            destinataire: 'Destinataire',
            afficheur: 'Afficheur',
            repere: 'Repère',
          })}
        >
          <TableSynthese synthese={etat.data} />
        </Edition>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" onClick={onFermer}>
          Fermer
        </Button>
        <Button
          type="button"
          onClick={() => {
            window.print()
          }}
        >
          Imprimer la fiche
        </Button>
      </div>
    </Modale>
  )
}

function TableSynthese({ synthese }: { synthese: Synthese }) {
  if (synthese.groupes.length === 0)
    return <p className="text-sm text-slate-600">Aucune ligne pour ces filtres.</p>
  return (
    <table className="w-full text-sm" aria-label="Synthèse par destinataire">
      <thead>
        <tr className="border-b text-left text-slate-500">
          <th>Destinataire</th>
          <th>Dossier</th>
          <th>Annonceur</th>
          <th>Thème</th>
          <th>Repiquage</th>
          <th>Format</th>
          <th className="text-right">Qté</th>
          <th className="text-right">Entretien</th>
          <th className="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {synthese.groupes.flatMap((g) => [
          ...g.lignes.map((l, i) => (
            <tr key={`${g.destinataire}-${String(i)}`} className="border-b">
              <td>{i === 0 ? g.destinataire : ''}</td>
              <td>{l.dossier ?? '—'}</td>
              <td>{l.annonceur ?? '—'}</td>
              <td>{l.theme ?? '—'}</td>
              <td>{l.repiquage ?? '—'}</td>
              <td>{l.format ?? '—'}</td>
              <td className="text-right">{l.qte}</td>
              <td className="text-right">{l.entretien}</td>
              <td className="text-right">{l.total}</td>
            </tr>
          )),
          <tr key={`${g.destinataire}-total`} className="border-b font-medium">
            <td colSpan={6}>Total {g.destinataire}</td>
            <td className="text-right">{g.qte}</td>
            <td className="text-right">{g.entretien}</td>
            <td className="text-right">{g.total}</td>
          </tr>,
        ])}
        <tr className="font-semibold">
          <td colSpan={6}>Total général</td>
          <td className="text-right">{synthese.qte}</td>
          <td className="text-right">{synthese.entretien}</td>
          <td className="text-right">{synthese.total}</td>
        </tr>
      </tbody>
    </table>
  )
}

/** ECR-COO-09e (RG-COO-304) : quantités à encoller du Bus, ajustement global et par centre. */
function ModaleEncoller({
  peutEcrire,
  depart,
  sites,
  onFermer,
}: {
  peutEcrire: boolean
  depart: string | undefined
  sites: readonly (readonly [number, string])[]
  onFermer: (m: string | null) => void
}) {
  const [site, setSite] = useState<number | undefined>(sites[0]?.[0])
  const params = new URLSearchParams()
  if (depart) params.set('depart', depart)
  if (site !== undefined) params.set('plateforme', String(site))
  const qs = params.size > 0 ? `?${params.toString()}` : ''
  const { etat, recharger } = useApi(`unitaire-encoller-${qs}`, (signal) =>
    apiRequest('GET', `/api/coordination/unitaire/encoller${qs}`, {
      schema: EncollerSchema,
      signal,
    }),
  )
  return (
    <Modale
      titre="Quantités à encoller"
      ouverte
      large
      onOuverture={(o) => {
        if (!o) onFermer(null)
      }}
    >
      <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm" role="note">
        Bus Nanterre : calcul Broadcast (+8 % +20 %), ajusté globalement puis par centre (hypothèse
        Q-196).
      </p>
      {sites.length > 1 && (
        <label className="mb-2 block text-sm">
          Site
          <select
            className="ml-1 rounded-md border border-slate-300 px-2 py-1"
            value={site ?? ''}
            onChange={(ev) => {
              setSite(Number(ev.target.value))
            }}
          >
            {sites.map(([id, nom]) => (
              <option key={id} value={id}>
                {nom}
              </option>
            ))}
          </select>
        </label>
      )}
      {etat.kind === 'loading' && <p>Chargement…</p>}
      {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
      {etat.kind === 'ready' && (
        <FormulaireEncoller
          key={etat.data.plateformeId}
          e={etat.data}
          peutEcrire={peutEcrire}
          onFermer={onFermer}
        />
      )}
    </Modale>
  )
}

function FormulaireEncoller({
  e,
  peutEcrire,
  onFermer,
}: {
  e: Encoller
  peutEcrire: boolean
  onFermer: (m: string | null) => void
}) {
  const [global, setGlobal] = useState(String(e.ajustementGlobal))
  const [centres, setCentres] = useState(
    Object.fromEntries(e.centres.map((c) => [c.destinataireId, String(c.ajustement)])),
  )
  const { envoi, erreur, lancer } = useEnvoi()
  const nombre = (v: string | undefined) => (v !== undefined && v.trim() !== '' ? Number(v) : 0)
  const valide = [global, ...Object.values(centres)].every((v) => Number.isFinite(nombre(v)))
  return (
    <>
      <label className="block text-sm">
        Ajustement global (%)
        <input
          className="ml-1 w-24 rounded-md border border-slate-300 px-2 py-1"
          inputMode="decimal"
          value={global}
          disabled={!peutEcrire}
          onChange={(ev) => {
            setGlobal(ev.target.value)
          }}
        />
      </label>
      {e.centres.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Aucun centre bus pour {e.depart}.</p>
      ) : (
        <table className="mt-3 w-full text-sm" aria-label="Centres bus">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th>Centre bus</th>
              <th className="text-right">Quantité commandée</th>
              <th className="text-right">Calcul Broadcast (+8 % +20 %)</th>
              <th className="text-right">Ajustement centre (%)</th>
              <th className="text-right">À encoller</th>
            </tr>
          </thead>
          <tbody>
            {e.centres.map((c) => (
              <tr key={c.destinataireId} className="border-b">
                <td>{c.centre}</td>
                <td className="text-right">{c.commande}</td>
                <td className="text-right">{c.calculBroadcast}</td>
                <td className="text-right">
                  <input
                    aria-label={`Ajustement ${c.centre}`}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right"
                    inputMode="decimal"
                    value={centres[c.destinataireId] ?? '0'}
                    disabled={!peutEcrire}
                    onChange={(ev) => {
                      setCentres({ ...centres, [c.destinataireId]: ev.target.value })
                    }}
                  />
                </td>
                <td className="text-right">{c.aEncoller}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-sm">Total à encoller (dernier enregistrement) : {e.total}</p>
      {erreur !== null && (
        <div className="mt-3">
          <ErrorMessage error={erreur} />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => {
            onFermer(null)
          }}
        >
          Fermer
        </Button>
        <Button
          type="button"
          disabled={envoi || !peutEcrire || !valide}
          onClick={() => {
            void lancer(async () => {
              await apiPost('/api/coordination/unitaire/encoller', {
                schema: EncollerSchema,
                body: {
                  plateformeId: e.plateformeId,
                  depart: e.depart,
                  ajustementGlobal: nombre(global),
                  centres: e.centres.map((c) => ({
                    destinataireId: c.destinataireId,
                    ajustement: nombre(centres[c.destinataireId]),
                  })),
                  version: e.version,
                },
              })
              onFermer(
                'Quantités à encoller enregistrées : états de collage à éditer (impression navigateur).',
              )
            })
          }}
        >
          Enregistrer et éditer les états de collage
        </Button>
      </div>
    </>
  )
}

// EX-NEW16-COO-001 — ordre des colonnes Circé, métadonnées de l’UM et ajouts de la maquette.
function colonnesUnitaire(type: TypeUnitaire): ColonneMetier<LigneUnitaire>[] {
  const cols: ColonneMetier<LigneUnitaire>[] = [
    { id: 'type', titre: 'Type prépa', valeur: (l) => l.typePreparation },
    { id: 'dossier', titre: 'Dossier', valeur: (l) => l.dossier },
    { id: 'annonceur', titre: 'Annonceur', valeur: (l) => l.annonceur },
    // Thème en texte, comme dans Circé ; le visuel a sa propre colonne, juste après (demande du 24/11).
    { id: 'theme', titre: 'Thème', valeur: (l) => l.theme },
    // Vignette du visuel (maquette `ui.poster`), absente de Circé : marquée en gras rouge plus bas ; zoom au survol.
    {
      id: 'visuel',
      titre: 'Visuel',
      valeur: (l) => l.theme,
      rendu: (l) => <VignetteVisuel theme={l.theme} />,
    },
    { id: 'repiquage', titre: 'Repiquage', valeur: (l) => l.repiquage },
    {
      id: 'dest',
      titre: type === 'bus' ? 'Centre bus' : 'Destinataire',
      valeur: (l) => l.destinataire,
    },
    { id: 'qte', titre: 'Qté', valeur: (l) => l.qte },
    { id: 'format', titre: 'Format', valeur: (l) => l.format },
    {
      id: 'statut',
      titre: 'Statut',
      valeur: (l) => (l.aLiberer ? 'À libérer' : (STATUTS[l.statut]?.libelle ?? l.statut)),
      rendu: (l) => (
        <Pastille
          ton={l.aLiberer ? 'neutre' : (STATUTS[l.statut]?.ton ?? 'neutre')}
          production={l.aLiberer ? 'A_TRAITER' : l.statut}
        >
          {l.aLiberer ? 'À libérer' : (STATUTS[l.statut]?.libelle ?? l.statut)}
        </Pastille>
      ),
    },
    // Format de Circé (CONVERT 103 : jj/mm/aaaa) ; la valeur reste aaaa-mm-jj pour le tri et l'export.
    {
      id: 'dateAff',
      titre: 'Date Affichage',
      valeur: (l) => l.jourAffichage?.slice(0, 10) ?? '',
      rendu: (l) =>
        l.jourAffichage ? l.jourAffichage.slice(0, 10).split('-').reverse().join('/') : '',
    },
    {
      id: 'commentaireUM',
      titre: 'Commentaire UM',
      valeur: (l) => l.detailsUm?.commentaires.join(' / ') ?? '',
    },
    { id: 'colis', titre: 'Code colis', valeur: (l) => l.detailsUm?.colis.join(', ') ?? '' },
    { id: 'qtePrep', titre: 'Qté préparée', valeur: (l) => l.detailsUm?.quantitePreparee ?? 0 },
    { id: 'afficheur', titre: 'Afficheur', valeur: (l) => l.afficheur },
    { id: 'repart', titre: 'Répart', valeur: (l) => l.detailsUm?.repartitions.join(', ') ?? '' },
    {
      id: 'prepCode',
      titre: 'Préparation',
      valeur: (l) => l.detailsUm?.preparations.join(', ') ?? '',
    },
    { id: 'id', titre: 'UM', valeur: (l) => l.unite?.code ?? '—' },
    {
      id: 'atelier',
      titre: 'Atelier',
      valeur: (l) => `${l.atelier.libelle} · ${l.atelier.plateforme}`,
    },
    {
      id: 'nAffiche',
      titre: 'numéro affiche',
      valeur: (l) => l.detailsUm?.affiches.join(', ') ?? '',
    },
    {
      id: 'dateCrea',
      titre: 'Date Création',
      valeur: (l) => l.detailsUm?.creation?.slice(0, 10) ?? '',
      cachee: type === 'fixe',
    },
    { id: 'entretien', titre: 'Entretien', valeur: (l) => l.entretien, ajout: true },
    { id: 'total', titre: 'Total', valeur: (l) => l.total, ajout: true },
    { id: 'depart', titre: 'Départ', valeur: (l) => l.depart, ajout: true },
    {
      id: 'repere',
      titre: 'Repère',
      valeur: (l) =>
        [
          l.apresLiberation ? 'Arrivé après libération' : '',
          l.rendue ? 'main rendue' : '',
          l.enProduction ? 'en production' : '',
          l.corrigeePlateforme ? 'corrigé par la plateforme' : '',
        ]
          .filter(Boolean)
          .join(' · '),
      ajout: true,
    },
    {
      id: 'afficheRecue',
      titre: 'Affiche reçue',
      valeur: (l) => AFFICHE[l.afficheRecue],
      ajout: true,
    },
  ]
  const ordre =
    type === 'pliage'
      ? [
          'dossier',
          'annonceur',
          'theme',
          'visuel',
          'dest',
          'qte',
          'format',
          'statut',
          'dateAff',
          'commentaireUM',
          'colis',
          'qtePrep',
          'afficheur',
          'repart',
          'atelier',
          'prepCode',
          'id',
          'dateCrea',
          'type',
          'nAffiche',
        ]
      : []
  // Colonnes de la Préparation de Circé, par atelier (vues Preparation/_Preparation2m2FixeGrid et PreparationPliage/_PliageGrid,
  // relevées par la maquette, unitaire.js:123-128 ; recoupées avec p_s_listeUM_2m2.sql et p_s_listeUM_pliage.sql, ce dernier
  // sans repiquage). Les autres colonnes, absentes de Circé pour cet atelier : titre en gras rouge (demande du 23/11) ; le
  // Bus n'a pas de page dans Circé, rien n'y est marqué.
  const circe: Record<TypeUnitaire, string[]> = {
    fixe: [
      'type',
      'dossier',
      'annonceur',
      'theme',
      'repiquage',
      'dest',
      'qte',
      'format',
      'statut',
      'dateAff',
      'commentaireUM',
      'colis',
      'qtePrep',
      'afficheur',
      'repart',
      'prepCode',
      'id',
      'atelier',
      'nAffiche',
    ],
    // L'ordre du pliage place aussi « Visuel » (absent de Circé) après « Thème » : il n'est pas une colonne de Circé.
    pliage: ordre.filter((id) => id !== 'visuel'),
    bus: [],
  }
  const ordonnees = ordre.length
    ? [
        ...ordre.flatMap((id) => cols.filter((c) => c.id === id)),
        ...cols.filter((c) => !ordre.includes(c.id)),
      ]
    : cols
  return type === 'bus'
    ? ordonnees
    : ordonnees.map((c) =>
        circe[type].includes(c.id)
          ? c
          : // Absente de Circé pour cet atelier : en gras rouge, masquée par défaut sauf les ajouts déjà visibles.
            {
              ...c,
              ajout: true,
              cachee: c.cachee ?? (c.id === 'repiquage' || c.id === 'dateCrea'),
            },
      )
}
