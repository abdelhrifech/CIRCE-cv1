// Regroupement en une passe (Map clé → éléments, ordre d'origine conservé). À préférer à un `filter` par clé
// dans une boucle : sur le volume réel (centaines de milliers de faces, dizaines de milliers de lignes), le
// filtre répété est quadratique.
export function grouperPar<T, K>(liste: readonly T[], cle: (x: T) => K): Map<K, T[]> {
  const groupes = new Map<K, T[]>()
  for (const x of liste) {
    const k = cle(x)
    const groupe = groupes.get(k)
    if (groupe) groupe.push(x)
    else groupes.set(k, [x])
  }
  return groupes
}
