import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../generated/prisma/client.ts'

export type Db = PrismaClient

/** Client Prisma sur SQLite (Q-343). `url` : `file:./prisma/dev.db`, relatif à apps/api. */
export function createDb(databaseUrl: string): Db {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl }) })
}

/**
 * Statistiques du planificateur SQLite (ANALYZE). Sans elles, SQLite choisit l'index le moins sélectif sur les
 * grosses tables (ex. `etat_ligne` au lieu de `cont_num` sur `tf_prepa_affiche`) : constaté sur le volume réel
 * repris de Circé. `PRAGMA optimize` (0x10002 : toutes les tables) n'analyse que les tables qui en ont besoin.
 * Analyse complète, pas `analysis_limit` : l'échantillon dépend de l'ordre des lignes et peut fausser les plans
 * (moins d'une seconde sur la base de dev de 220 Mo). À appeler au démarrage et après un chargement massif.
 */
export async function optimiserStatistiques(db: Db): Promise<void> {
  await db.$queryRawUnsafe('PRAGMA optimize=0x10002')
}
