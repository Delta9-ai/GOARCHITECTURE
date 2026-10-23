// redaction.ts — Rédaction structurée du compte rendu (port de cr_engine.extraire).
// Le moteur (Gemini, Claude ou OpenAI), la clé et le prompt viennent des réglages IA ;
// par défaut : Gemini avec la clé de l'installation et les prompts d'origine.
import type { Chantier, DonneesCR } from "./types";
import { configPourRedaction, type DocType } from "./reglages";
import { extraireJson, generer } from "./ia";

// Une réunion de chantier n'est pas un diagnostic : avancement, réserves, décisions
// et échéances d'un côté, pathologies du bâti de l'autre. Chaque type de document a
// donc son propre prompt, et le métier qui va avec (prompt_diagnostic.md / prompt_chantier.md).

export async function extraire(
  transcription: string,
  chantier: Chantier,
  photos: string[],
  docType = "visite",
  meta: { numeroReunion?: string; objet?: string; prochaineReunion?: string } = {},
): Promise<DonneesCR> {
  const config = await configPourRedaction((docType === "chantier" ? "chantier" : "visite") as DocType);

  const nom = (c: Chantier["contacts"][number]) => c.nom || c.role || c.organisme || "";
  const presents = chantier.contacts.filter((c) => c.present).map(nom).filter(Boolean).join(", ");
  const absents = chantier.contacts.filter((c) => !c.present).map(nom).filter(Boolean).join(", ");
  const listePhotos = photos.length ? photos.map((p, i) => `${i + 1}. ${p}`).join("\n") : "(aucune)";

  // Champs du bloc titre saisis dans l'app : sans eux, le modèle écrivait
  // « la prochaine réunion sera fixée ultérieurement » alors que la date
  // figurait déjà en tête du document.
  const bloc = [
    meta.numeroReunion ? `- N° de réunion : ${meta.numeroReunion}` : "",
    meta.objet ? `- Objet de l'opération : ${meta.objet}` : "",
    meta.prochaineReunion ? `- Date de la prochaine réunion : ${meta.prochaineReunion}` : "",
  ].filter(Boolean).join("\n");

  const user = `FICHE CHANTIER
- SDC / immeuble : ${chantier.sdc}
- Adresse : ${chantier.adresse ?? ""}
- Code immeuble : ${chantier.code_immeuble ?? ""}
- N° d'affaire : ${chantier.n_affaire ?? ""}
- MOA / syndic : ${chantier.moa ?? ""}
- Date de la visite : ${chantier.date_visite ?? ""}
- Présents : ${presents}
- Absents : ${absents}
${bloc}

FICHIERS PHOTOS (ordre chronologique)
${listePhotos}

NOTE DE L'ARCHITECTE (dictée puis transcrite, ou écrite au clavier)
"""
${transcription}
"""`;

  const txt = await generer({ ...config, user });
  return extraireJson<DonneesCR>(txt);
}
