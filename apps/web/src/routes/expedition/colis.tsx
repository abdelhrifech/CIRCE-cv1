import { createFileRoute } from '@tanstack/react-router'
import {
  TransportListeSchema,
  ResultatFinDeJourneeSchema,
  STATUTS_COLIS,
  type StatutColis,
} from '@circe/shared'
import { useState, type ReactNode } from 'react'
import { z } from 'zod'
import { Button } from '../../components/button.tsx'
import { ErrorMessage } from '../../components/error-message.tsx'
import { BarreFiltres } from '../../components/ui/barre-filtres.tsx'
import { FiltrePeriode, dansPeriode, jourIso } from '../../components/ui/filtre-periode.tsx'
import { Modale } from '../../components/ui/modale.tsx'
import { Pastille, type Ton } from '../../components/ui/pastille.tsx'
import { TableMetier, type ColonneMetier } from '../../components/ui/table-metier.tsx'
import { apiPost, apiRequest } from '../../lib/api-client.ts'
import { requirePermission } from '../../lib/session.ts'
import {
  CodesUnites,
  TransportSaisie,
  GeodisIndisponible,
} from '../../components/expedition/transport.tsx'
import { useApi } from '../../lib/use-api.ts'

// COO-P13 — ECR-EXP-02 « Liste des colis » (RG-COO-268, 269, 271, RG-X-087). « Fin de journée » : colis « Clos · à
// expédier » → « Expédié » (RG-COO-269) et sorties de stock automatiques (RG-X-087). Le batch planifié est hors dépôt
// (Q-005) : l'action est manuelle. Boucle, canal, étiquette Geodis, preuve de livraison : Q-284 / D-17 (ECARTS).
// Disposition des écrans de Circé (demande du 23/11), comme « À traiter » et « Préparation » : actions de Circé en noir
// (« Fin de journée », « Envoi manuel » de ListeColisController.cs:79-150), export en vert ; recherche de Circé (période
// Début / Fin, Format) dans le cadre du tableau ; résultat « Nombre de lignes | Nombre d'affiches » ; colonnes de la
// Liste des colis de Circé (vue ListeColis/Index, relevée par la maquette, expedition.js:116-131), puis les colonnes
// ajoutées en gras rouge.

const SearchSchema = z.object({
  type: z.enum(['fixe', 'pliage']).optional(),
  dossier: z.coerce.number().int().positive().optional(),
  depart: z
    .string()
    .regex(/^\d{4}-W\d{2}$/)
    .optional(),
  destinataire: z.string().optional(),
  statut: z.enum(STATUTS_COLIS).optional(),
})

export const Route = createFileRoute('/expedition/colis')({
  validateSearch: SearchSchema,
  beforeLoad: requirePermission('colis.gerer'),
  component: ListeDesColis,
})

const STATUT: Record<StatutColis, { libelle: string; ton: Ton }> = {
  EN_COURS: { libelle: 'Colis ouvert', ton: 'surveiller' },
  A_EXPEDIER: { libelle: 'Clos · à expédier', ton: 'info' },
  TERMINE: { libelle: 'Expédié', ton: 'ok' },
}

type Colis = z.infer<typeof TransportListeSchema>['colis'][number]
type Boucles = z.infer<typeof TransportListeSchema>['boucles']

const dateHeure = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const lien = (url: string, texte: string): ReactNode => (
  <a className="underline" href={url} target="_blank" rel="noreferrer">
    {texte}
  </a>
)

function colonnesColis(boucles: Boucles): ColonneMetier<Colis>[] {
  const d = (c: Colis) => c.transport?.donnees
  return [
    // Colonnes de la Liste des colis de Circé, dans son ordre.
    {
      id: 'colis',
      titre: 'Colis',
      valeur: (c) => c.code,
      rendu: (c) => <code className="whitespace-nowrap">{c.code}</code>,
    },
    // Circé : « Format » de la recherche = atelier / plateforme (« 2m² Fixe / Wissous »).
    {
      id: 'format',
      titre: 'Format',
      valeur: (c) => `${c.atelier.libelle} / ${c.atelier.plateforme}`,
    },
    {
      id: 'statut',
      titre: 'Statut',
      valeur: (c) => STATUT[c.statut].libelle,
      rendu: (c) => <Pastille ton={STATUT[c.statut].ton}>{STATUT[c.statut].libelle}</Pastille>,
    },
    { id: 'quantite', titre: 'Quantité', valeur: (c) => c.quantite },
    { id: 'dest', titre: 'Destinataire', valeur: (c) => c.destinataire.nom },
    // HYPOTHÈSE Q-435 : un seul transporteur, Geodis (maquette) ; vide tant qu'aucun transport n'est connu.
    {
      id: 'transporteur',
      titre: 'Transporteur',
      valeur: (c) => (c.transporteur !== null || c.transport ? 'Geodis' : ''),
    },
    // « Date expédition » de Circé = colis_dat_expe, posée à la clôture du colis (« Clos le » de la V2).
    {
      id: 'dateExpedition',
      titre: 'Date expédition',
      valeur: (c) => c.dateExpedition,
      rendu: (c) => dateHeure(c.dateExpedition),
    },
    {
      id: 'codeTransporteur',
      titre: 'Code transporteur',
      valeur: (c) => c.codeExterne ?? d(c)?.recepisse ?? null,
    },
    {
      id: 'dateLivraison',
      titre: 'Date livraison',
      valeur: (c) => d(c)?.dateLivraison ?? null,
      rendu: (c) => dateHeure(d(c)?.dateLivraison),
    },
    {
      id: 'dateEtat',
      titre: 'Date état',
      valeur: (c) => d(c)?.dateEtat ?? null,
      rendu: (c) => dateHeure(d(c)?.dateEtat),
    },
    { id: 'libelleEtat', titre: 'Libellé état', valeur: (c) => d(c)?.etatTransporteur ?? null },
    {
      id: 'image',
      titre: 'Image livraison',
      valeur: (c) => (d(c)?.images.length ? 'Oui' : ''),
      rendu: (c) => {
        const images = d(c)?.images ?? []
        return images.length ? (
          <span className="flex flex-wrap gap-2">
            {images.map((u, i) => (
              <span key={u}>{lien(u, `Image ${String(i + 1)}`)}</span>
            ))}
          </span>
        ) : (
          '—'
        )
      },
    },
    {
      id: 'preuve',
      titre: 'Preuve livraison',
      valeur: (c) => (d(c)?.preuveUrl ? 'Oui' : ''),
      rendu: (c) => {
        const u = d(c)?.preuveUrl
        return u ? lien(u, 'Preuve') : '—'
      },
    },
    {
      id: 'suivi',
      titre: 'Suivi transporteur',
      valeur: (c) => d(c)?.numeroSuivi ?? null,
      rendu: (c) => {
        const t = d(c)
        if (!t?.numeroSuivi && !t?.suiviUrl) return '—'
        return t.suiviUrl ? lien(t.suiviUrl, t.numeroSuivi ?? 'Suivre') : t.numeroSuivi
      },
    },
    // Colonnes absentes de Circé : titre en gras rouge.
    { id: 'depart', titre: 'Départ', valeur: (c) => c.depart, ajout: true },
    { id: 'unites', titre: 'Unités', valeur: (c) => c.nbUnites + c.nbTrains, ajout: true },
    {
      id: 'poids',
      titre: 'Poids',
      valeur: (c) => c.poids,
      rendu: (c) => (c.poids === null ? '—' : `${String(c.poids)} kg`),
      ajout: true,
    },
    {
      id: 'canal',
      titre: 'Canal · boucle',
      valeur: (c) => {
        const t = d(c)
        if (!t) return ''
        const b = boucles.find((x) => x.id === t.boucleId)
        return `${t.canal === 'MILK_RUN' ? 'Milk run' : 'Messagerie'} · ${b?.nom ?? 'boucle non renseignée'}`
      },
      ajout: true,
    },
    {
      id: 'expedieLe',
      titre: 'Expédié le',
      valeur: (c) => c.expedieLe,
      rendu: (c) => dateHeure(c.expedieLe),
      ajout: true,
    },
  ]
}

function ListeDesColis() {
  const search = Route.useSearch()
  // Les filtres posés par un lien (dossier, statut, départ, destinataire) restent appliqués par l'API.
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(search) as [string, string | number | undefined][])
    if (v !== undefined && v !== '') qs.set(k, String(v))
  const { etat, recharger } = useApi(`colis-${qs.toString()}`, (signal) =>
    apiRequest('GET', `/api/transport/colis?${qs.toString()}`, {
      schema: TransportListeSchema,
      signal,
    }),
  )
  // Recherche de Circé : période Début / Fin (les 7 derniers jours par défaut), Format ; Statut ajouté par la V2.
  const [periode, setPeriode] = useState(() => ({ debut: jourIso(-7), fin: jourIso(0) }))
  const [filtres, setFiltres] = useState<{ format: string[]; statut: string[] }>(() => ({
    format: [],
    statut: search.statut ? [search.statut] : [],
  }))
  const [coches, setCoches] = useState<number[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<unknown>(null)
  const [envoi, setEnvoi] = useState(false)
  const [confirmation, setConfirmation] = useState(false)

  async function finDeJournee() {
    setConfirmation(false)
    setEnvoi(true)
    setErreur(null)
    setMessage(null)
    try {
      const r = await apiPost('/api/coordination/colis/fin-de-journee', {
        schema: ResultatFinDeJourneeSchema,
        body: {},
      })
      setMessage(r.message)
      if (r.manquants.length > 0)
        setMessage(
          `${r.message} ${String(r.manquants.length)} quantité(s) sans stock suffisant (tracées).`,
        )
    } catch (e) {
      setErreur(e)
    } finally {
      setEnvoi(false)
      recharger()
    }
  }

  const d = etat.kind === 'ready' ? etat.data : null
  // Période par défaut sans colis : au premier chargement, l'écran se place sur les 7 jours qui finissent à la dernière date
  // d'expédition (demande du 23/11, données reprises de Circé). Un choix de l'utilisateur n'est jamais modifié.
  const [periodeAjustee, setPeriodeAjustee] = useState(false)
  if (!periodeAjustee && d) {
    setPeriodeAjustee(true)
    const dates = d.colis
      .map((c) => c.dateExpedition)
      .filter((x): x is string => !!x)
      .sort()
    const derniereDate = dates[dates.length - 1]
    if (derniereDate && !dates.some((x) => dansPeriode(x, periode.debut, periode.fin)))
      setPeriode({
        debut: jourIso(-7, new Date(derniereDate)),
        fin: jourIso(0, new Date(derniereDate)),
      })
  }
  // HYPOTHÈSE Q-435 : la période porte sur la date d'expédition (clôture) ; un colis encore ouvert, sans date, reste affiché.
  const dansLaPeriode = (c: Colis) =>
    c.dateExpedition === null || dansPeriode(c.dateExpedition, periode.debut, periode.fin)
  const dePeriode = (d?.colis ?? []).filter(dansLaPeriode)
  const lignes = dePeriode.filter(
    (c) =>
      (filtres.format.length === 0 || filtres.format.includes(String(c.atelier.id))) &&
      (filtres.statut.length === 0 || filtres.statut.includes(c.statut)),
  )
  const ateliers = [...new Map(dePeriode.map((c) => [c.atelier.id, c.atelier])).values()]

  // Première ligne du cadre : actions de Circé (noir) à gauche ; l'export Excel (vert) est à droite (tableau).
  const actions = (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Actions">
      <Button
        type="button"
        disabled={envoi || !d}
        title="Les colis clos passent « Expédié » et leurs sorties de stock sont créées"
        onClick={() => {
          setConfirmation(true)
        }}
      >
        Fin de journée
      </Button>
      {/* Circé (ListeColisController.cs:136-150) : crée un colis vide pour le destinataire par défaut de l'atelier.
          Pas encore dans la V2 : la règle (destinataire par défaut) n'est pas documentée (Q-435). */}
      <Button
        type="button"
        disabled
        title="Envoi manuel de Circé : pas encore disponible dans la V2 (question Q-435)"
        className="disabled:cursor-not-allowed disabled:opacity-50"
      >
        Envoi manuel
      </Button>
    </div>
  )
  const barre = (
    <BarreFiltres
      libelle="Filtres de la liste des colis"
      debut={<FiltrePeriode valeur={periode} onChange={setPeriode} onActualiser={recharger} />}
      filtres={[
        {
          id: 'format',
          libelle: 'Format',
          options: ateliers.map((a) => ({
            valeur: String(a.id),
            libelle: `${a.libelle} / ${a.plateforme}`,
            nombre: dePeriode.filter((c) => c.atelier.id === a.id).length,
          })),
          selection: filtres.format,
          onChange: (sel) => {
            setFiltres((f) => ({ ...f, format: sel }))
          },
        },
        {
          id: 'statut',
          libelle: 'Statut',
          options: STATUTS_COLIS.map((s) => ({
            valeur: s,
            libelle: STATUT[s].libelle,
            nombre: dePeriode.filter((c) => c.statut === s).length,
          })),
          selection: filtres.statut,
          onChange: (sel) => {
            setFiltres((f) => ({ ...f, statut: sel }))
          },
        },
      ]}
    />
  )
  // Résultat de Circé : nombre de lignes | nombre d'affiches (quantités des colis affichés).
  const resultat = (
    <span
      role="group"
      aria-label="Résultat"
      className="flex items-center gap-3 text-sm text-slate-600"
    >
      <span>
        Nombre de lignes : <strong className="tabular-nums text-slate-900">{lignes.length}</strong>
      </span>
      <span aria-hidden="true" className="h-4 w-px bg-slate-300" />
      <span>
        Nombre d’affiches :{' '}
        <strong className="tabular-nums text-slate-900">
          {lignes.reduce((s, c) => s + c.quantite, 0).toLocaleString('fr-FR')}
        </strong>
      </span>
    </span>
  )

  return (
    // Pleine largeur, comme « À traiter » et « Préparation ».
    <main className="w-full p-6">
      <p className="text-sm text-slate-500">
        {search.type === 'fixe' ? '2 m² fixe' : search.type === 'pliage' ? 'Pliage' : 'Expédition'}
      </p>
      <h1 className="text-2xl font-semibold">
        {search.type ? 'Liste des colis' : 'Expédition · Colis'}
      </h1>
      <Modale titre="Fin de journée" ouverte={confirmation} onOuverture={setConfirmation}>
        <p className="text-sm">
          Tous les colis clos du périmètre passent « Expédié » et leurs sorties de stock sont
          créées, quels que soient les filtres affichés. L’action est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            onClick={() => {
              setConfirmation(false)
            }}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={envoi}
            onClick={() => {
              void finDeJournee()
            }}
          >
            Confirmer la fin de journée
          </Button>
        </div>
      </Modale>
      <GeodisIndisponible />
      {message && (
        <p role="status" className="mt-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm">
          {message}
        </p>
      )}
      {erreur !== null && <ErrorMessage error={erreur} />}
      <section className="mt-3" aria-label="Colis">
        {etat.kind === 'loading' && <p>Chargement…</p>}
        {etat.kind === 'error' && <ErrorMessage error={etat.error} onRetry={recharger} />}
        {d && (
          <TableMetier
            nom="Colis"
            lignes={lignes}
            cle={(c) => c.id}
            colonnes={colonnesColis(d.boucles)}
            recherche={false}
            boutonsEnHaut
            outils={actions}
            resume={barre}
            resumeDroite={resultat}
            compteur={false}
            densite={false}
            vide={
              qs.size > 0
                ? 'Aucun colis ne correspond aux filtres.'
                : 'Aucun colis sur cette période : élargissez les dates de début et de fin.'
            }
            selection={{
              cle: (c) => c.id,
              choisis: coches,
              onChange: setCoches,
              libelle: (c) => `Sélectionner le colis ${c.code}`,
            }}
            actions={(c) => (
              <div className="flex items-center gap-2 whitespace-nowrap text-xs">
                <CodesUnites id={c.id} />
                {d.peutImporter && (
                  <TransportSaisie colis={c} boucles={d.boucles} onSauvee={recharger} />
                )}
              </div>
            )}
          />
        )}
      </section>
    </main>
  )
}
