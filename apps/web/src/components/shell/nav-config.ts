// ECR-NAV-01 / EX-TRA-008 : onglets du bandeau 2, repris de `M.NAV` (maquette `core.js`, version du 16/11/2026 : plus d'onglet
// Pré-production, ordre Pilotage, Réception, 2 m² fixe, Pliage, Déroulant, Bus, Expédition, Administration) et LIMITÉS aux écrans qui
// existent. Les entrées de la maquette sans écran (Suivi de prod, Suivi par thème, Fichiers multi-rouleuse, Stocks…) sont
// omises et listées dans ECARTS_EXISTANT_VS_CIBLE.md (aucun lien mort). `permission` reprend la garde de la route
// (`requirePermission`) : confort d'affichage, le serveur reste juge (RG-REC-002).
import type { MeResponse, PermissionCode } from '@circe/shared'

export type CleBadge = 'palettes' | 'inconnues' | 'alertes'

export interface EntreeNav {
  id: string
  libelle: string
  /** Route réelle (TanStack Router). */
  to: string
  search?: Record<string, string>
  /** Valeur de l'écran quand le paramètre est absent de l'adresse (ex. vue `trains` de la Liste des trains). */
  defaut?: Record<string, string>
  permission: PermissionCode
  badge?: CleBadge
}

export interface OngletNav {
  id: string
  titre: string
  entrees: EntreeNav[]
}

export const NAV: OngletNav[] = [
  {
    id: 'pilotage',
    titre: 'Pilotage',
    entrees: [
      {
        id: 'reservations',
        libelle: 'État des réservations vivant',
        to: '/pilotage/reservations',
        permission: 'reservations.consulter',
      },
      {
        id: 'alertes',
        libelle: 'Alertes',
        to: '/pilotage/alertes',
        permission: 'alerte.consulter',
        badge: 'alertes',
      },
      {
        id: 'themes',
        libelle: 'Vérification des thèmes',
        to: '/coordination/themes',
        permission: 'verification_themes.consulter',
      },
    ],
  },
  {
    id: 'reception',
    titre: 'Réception',
    entrees: [
      {
        id: 'reception',
        libelle: 'Réception des affiches',
        to: '/reception',
        permission: 'reception.attendues.consulter',
        badge: 'palettes',
      },
      {
        id: 'inconnues',
        libelle: 'Réceptions inconnues',
        to: '/reception/inconnues',
        permission: 'reception.inconnue.consulter',
        badge: 'inconnues',
      },
      {
        id: 'affiches',
        libelle: 'Liste des affiches',
        to: '/reception/affiches',
        permission: 'affiche.consulter',
      },
    ],
  },
  {
    id: 'fixe',
    titre: '2 m² fixe',
    entrees: [
      {
        id: 'unitaire-fixe',
        libelle: 'Préparation',
        to: '/coordination/unitaire',
        search: { type: 'fixe' },
        permission: 'train.consulter',
      },
    ],
  },
  {
    id: 'pliage',
    titre: 'Pliage',
    entrees: [
      {
        id: 'unitaire-pliage',
        libelle: 'Préparation',
        to: '/coordination/unitaire',
        search: { type: 'pliage' },
        permission: 'train.consulter',
      },
    ],
  },
  {
    id: 'deroulant',
    titre: 'Déroulant',
    entrees: [
      {
        id: 'instructions',
        libelle: 'Liste des instructions',
        to: '/coordination',
        permission: 'instruction.consulter',
      },
      {
        id: 'trains',
        libelle: 'Liste des trains',
        to: '/coordination/trains',
        search: { tab: 'trains' },
        defaut: { tab: 'trains' },
        permission: 'train.consulter',
      },
      {
        id: 'trains-besoin',
        libelle: 'Suivi par thème',
        to: '/coordination/trains',
        search: { tab: 'besoin' },
        permission: 'train.consulter',
      },
      {
        id: 'trains-prepa',
        libelle: 'Préparation',
        to: '/coordination/trains',
        search: { tab: 'prepa' },
        permission: 'train.consulter',
      },
      {
        id: 'trains-d8',
        libelle: 'Suivi 8 m² (demies)',
        to: '/coordination/trains',
        search: { tab: 'd8' },
        permission: 'train.consulter',
      },
      {
        id: 'generateur',
        libelle: 'Fichiers Vendôme',
        to: '/coordination/generateur',
        permission: 'roulage.preparer',
      },
      { id: 'bagues', libelle: 'Bagues', to: '/coordination/bagues', permission: 'bague.imprimer' },
      {
        id: 'dispatch',
        libelle: 'Dispatch',
        to: '/coordination/dispatch',
        permission: 'dispatch.gerer',
      },
      {
        id: 'rouleurs',
        libelle: 'Rouleurs',
        to: '/coordination/rouleurs',
        permission: 'referentiel.gerer',
      },
    ],
  },
  {
    id: 'bus',
    titre: 'Bus',
    entrees: [
      {
        id: 'unitaire-bus',
        libelle: 'Préparation',
        to: '/coordination/unitaire',
        search: { type: 'bus' },
        permission: 'train.consulter',
      },
    ],
  },
  {
    id: 'expedition',
    titre: 'Expédition',
    entrees: [
      {
        id: 'colisage',
        libelle: 'Scan et colisage',
        to: '/expedition',
        permission: 'colis.gerer',
      },
      { id: 'colis', libelle: 'Colis', to: '/expedition/colis', permission: 'colis.gerer' },
      {
        id: 'departs',
        libelle: 'Départs camions',
        to: '/expedition/departs',
        permission: 'colis.gerer',
      },
    ],
  },
  {
    id: 'admin',
    titre: 'Administration',
    entrees: [
      {
        id: 'parametres',
        libelle: 'Paramètres',
        to: '/admin/parametres',
        permission: 'parametrage.gerer',
      },
      {
        id: 'utilisateurs',
        libelle: 'Utilisateurs',
        to: '/admin/utilisateurs',
        permission: 'utilisateur.gerer',
      },
      {
        id: 'plateformes',
        libelle: 'Plateformes',
        to: '/admin/plateformes',
        permission: 'parametrage.gerer',
      },
      {
        id: 'referentiels',
        libelle: 'Référentiels',
        to: '/admin/referentiels',
        permission: 'referentiel.gerer',
      },
      {
        id: 'admin-alertes',
        libelle: 'Alertes et mails',
        to: '/admin/alertes',
        permission: 'parametrage.gerer',
      },
      {
        id: 'sites',
        libelle: 'Sites et ateliers',
        to: '/admin/sites',
        permission: 'parametrage.gerer',
      },
      {
        id: 'destinataires',
        libelle: 'Destinataires',
        to: '/coordination/destinataires',
        permission: 'referentiel.gerer',
      },
      {
        id: 'deblocage',
        libelle: 'Déblocage préparations',
        to: '/coordination/deblocage',
        permission: 'deblocage.consulter',
      },
      {
        id: 'integration',
        libelle: 'Chargements Broadcast',
        to: '/coordination/integration',
        permission: 'alimentation.manuelle',
      },
    ],
  },
]

type Permis = Pick<MeResponse, 'permissions'>
const a = (me: Permis, code: PermissionCode) => me.permissions.includes(code)

/**
 * Écran d'ouverture (Q-365) : la maquette ouvre sur Pilotage › Suivi de prod, absent ici. Ouverture sur la première
 * page accessible du profil : Réception (recep), Coordination (coord, cheq), Expédition (expe), Administration
 * (admin), sinon Alertes, sinon la page « Mon profil ».
 */
export function pageOuverture(me: MeResponse): string {
  if (me.roles.includes('admin') && a(me, 'parametrage.gerer')) return '/admin/parametres'
  if (me.roles.includes('recep') && a(me, 'reception.attendues.consulter')) return '/reception'
  if (me.roles.includes('expe') && a(me, 'colis.gerer')) return '/expedition'
  if ((me.roles.includes('coord') || me.roles.includes('cheq')) && a(me, 'instruction.consulter'))
    return '/coordination'
  if (a(me, 'alerte.consulter')) return '/pilotage/alertes'
  if (a(me, 'reception.attendues.consulter')) return '/reception'
  return '/moi'
}
