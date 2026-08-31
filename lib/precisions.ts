// precisions.ts — Filet de sécurité sur l'étape de correction.
//
// L'architecte coche un point signalé par l'IA et saisit une précision. Cette
// précision est bien transmise au modèle, mais celui-ci l'ignore parfois sans
// rien signaler : le compte rendu sort alors amputé d'une information que
// l'architecte croit avoir ajoutée. On vérifie donc après coup qu'elle est
// arrivée dans le résultat, et on l'écrit nous-mêmes quand ce n'est pas le cas.

// Mots outils : trop fréquents pour témoigner de quoi que ce soit.
const MOTS_OUTILS = new Set([
  "avec", "dans", "pour", "sont", "cette", "celui", "celle", "leur", "leurs",
  "etre", "etait", "elle", "elles", "nous", "vous", "plus", "moins", "tres",
  "tout", "tous", "toute", "toutes", "mais", "donc", "alors", "aussi", "comme",
  "entre", "selon", "sous", "chez", "depuis", "pendant", "lors", "apres",
]);

/** Minuscules, sans accents ni ponctuation : de quoi comparer deux formulations. */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Les mots porteurs de sens d'une précision : au moins 4 lettres, hors mots outils. */
function motsPorteurs(texte: string): string[] {
  return [...new Set(normaliser(texte).split(" "))].filter(
    (m) => m.length >= 4 && !MOTS_OUTILS.has(m),
  );
}

/**
 * La précision se retrouve-t-elle dans le compte rendu rédigé ?
 * On tolère la reformulation — l'IA monte en registre, elle ne recopie pas —
 * en se contentant d'une majorité de mots porteurs retrouvés.
 */
export function precisionIntegree(precision: string, donnees: unknown): boolean {
  const mots = motsPorteurs(precision);
  if (!mots.length) return true;
  const redige = normaliser(JSON.stringify(donnees ?? ""));
  const retrouves = mots.filter((m) => redige.includes(m)).length;
  return retrouves / mots.length >= 0.6;
}

/** Celles que le modèle a laissées de côté, dans l'ordre de saisie. */
export function precisionsOubliees(saisies: string[], donnees: unknown): string[] {
  return saisies.filter((p) => !precisionIntegree(p, donnees));
}
