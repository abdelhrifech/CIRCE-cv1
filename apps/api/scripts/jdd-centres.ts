// Nom de plateforme des JDD fictifs des centres (seed:centres, seed:news, seed:scenarios). Q-437 : quand la base de
// dev porte les données reprises de Circé (plateformes réelles « Wissous », « Nîmes »), scripts/start.mjs fixe
// JDD_SUFFIXE_CENTRES (ex. « (JDD) ») pour que les JDD fictifs aillent sur des plateformes distinctes et n'entrent
// jamais en collision avec les données réelles. Sans la variable : noms historiques (comportement inchangé).
export function nomCentre(nom: string): string {
  const suffixe = (process.env['JDD_SUFFIXE_CENTRES'] ?? '').trim()
  return suffixe ? `${nom} ${suffixe}` : nom
}
