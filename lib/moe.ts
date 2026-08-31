// moe.ts — Contact de la maîtrise d'œuvre : l'agence elle-même.
// Ces coordonnées sont les mêmes sur tous les immeubles, l'utilisateur n'a donc
// aucune raison de les ressaisir. Elles viennent de l'environnement (MOE_*) et
// ne sont jamais écrites dans le dépôt, qui est public.
import type { Contact } from "./types";

export const MOE_VIDE: Contact = {
  groupe: "MOE",
  organisme: "GO ARCHITECTURE",
  nom: "",
  telephone: "",
  email: "",
  present: true,
};

/**
 * Les interfaces d'hébergement et la ligne de commande ne transportent pas les
 * retours à la ligne : on accepte donc la séquence littérale « \n » dans la
 * valeur, ce qui permet d'écrire les deux numéros de l'agence sur une seule
 * ligne de configuration. Une vraie coupure de ligne reste acceptée telle quelle.
 */
function multiligne(valeur: string | undefined): string {
  return (valeur || "").replace(/\\n/g, "\n").trim();
}

/** Lu côté serveur uniquement : process.env n'existe pas dans le navigateur. */
export function moeDepuisEnv(): Contact {
  return {
    groupe: "MOE",
    organisme: process.env.MOE_ORGANISME || MOE_VIDE.organisme,
    nom: process.env.MOE_NOM || "",
    telephone: multiligne(process.env.MOE_TEL),
    email: process.env.MOE_EMAIL || "",
    present: true,
  };
}

/** La ligne « maîtrise d'œuvre » d'une fiche. */
export function estMoe(c: Contact): boolean {
  return (c.groupe || "").toUpperCase() === "MOE";
}

/**
 * Garantit que la fiche porte le contact de l'agence, à jour.
 *
 * Ces coordonnées ont une seule source de vérité : l'environnement. On les
 * réécrit donc à chaque chargement plutôt que de les figer fiche par fiche —
 * sans quoi un changement de numéro ne toucherait que les immeubles créés
 * après coup, et les anciens garderaient indéfiniment l'ancien. Seule la
 * présence, qui se coche réunion par réunion, est conservée.
 */
export function avecMoe(contacts: Contact[] | undefined, moe: Contact): Contact[] {
  const liste = contacts ? [...contacts] : [];
  const i = liste.findIndex(estMoe);
  if (i === -1) return [...liste, { ...moe }];
  liste[i] = { ...liste[i], ...moe, present: liste[i].present ?? moe.present };
  return liste;
}
