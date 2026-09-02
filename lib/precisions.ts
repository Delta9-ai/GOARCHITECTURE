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

// Une précision reformulée reste groupée dans une phrase ou deux ; des mots
// éparpillés d'un bout à l'autre du compte rendu ne prouvent rien.
const FENETRE = 40; // mots

/**
 * La précision se retrouve-t-elle dans le compte rendu rédigé ?
 *
 * On tolère la reformulation — l'IA monte en registre, elle ne recopie pas —
 * mais on exige que les mots se retrouvent **groupés** : chercher dans tout le
 * document donnait de fausses détections. « Devis attendu pour le 8 septembre »
 * était jugée présente parce que « devis » figurait dans une observation et
 * « septembre » dans une autre, à dix lignes de là.
 *
 * Une précision courte doit se retrouver en entier ; au-delà de trois mots
 * porteurs, une majorité suffit, la reformulation en perdant toujours quelques-uns.
 */
export function precisionIntegree(precision: string, donnees: unknown): boolean {
  const mots = motsPorteurs(precision);
  if (!mots.length) return true;
  const requis = mots.length <= 3 ? mots.length : Math.ceil(mots.length * 0.6);
  const jetons = normaliser(JSON.stringify(donnees ?? "")).split(" ").filter(Boolean);
  for (let i = 0; i < Math.max(jetons.length - 1, 1); i++) {
    const fenetre = " " + jetons.slice(i, i + FENETRE).join(" ") + " ";
    if (mots.filter((m) => fenetre.includes(m)).length >= requis) return true;
  }
  return false;
}

/** Celles que le modèle a laissées de côté, dans l'ordre de saisie. */
export function precisionsOubliees(saisies: string[], donnees: unknown): string[] {
  return saisies.filter((p) => !precisionIntegree(p, donnees));
}

/** Une phrase propre : majuscule initiale et ponctuation finale. */
function enPhrase(texte: string): string {
  const t = texte.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const debut = t[0].toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(debut) ? debut : debut + ".";
}

/**
 * Le paragraphe à ajouter aux généralités pour les précisions que le modèle a
 * laissées de côté. L'architecte saisit souvent un fragment (« 3 lots ») : posé
 * tel quel entre deux paragraphes rédigés, il passe pour une coquille. Une
 * amorce explicite le rattache au document et le rend lisible, qu'il s'agisse
 * d'un fragment ou d'une phrase complète.
 */
export function paragraphePrecisions(oubliees: string[]): string {
  const phrases = oubliees.map(enPhrase).filter(Boolean);
  if (!phrases.length) return "";
  const amorce = phrases.length > 1 ? "Précisions apportées par l'architecte" : "Précision apportée par l'architecte";
  return `${amorce} : ${phrases.join(" ")}`;
}
