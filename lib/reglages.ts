// reglages.ts — Réglages IA modifiables depuis l'outil : moteur utilisé, clés API, prompts.
// Stockés dans un fichier JSON privé du stockage Supabase (lu/écrit avec la clé
// secrète, côté serveur uniquement). Clés API chiffrées (lib/chiffrement.ts).
import { promises as fs } from "node:fs";
import path from "node:path";
import { chiffrer, dechiffrer } from "./chiffrement";
import { supabaseActif } from "./supabase";

export type Fournisseur = "gemini" | "anthropic" | "openai";
export type DocType = "visite" | "chantier";
export const FOURNISSEURS: Fournisseur[] = ["gemini", "anthropic", "openai"];

export const MODELES_DEFAUT: Record<Fournisseur, string> = {
  gemini: "gemini-2.5-flash",
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-5",
};

type Stocke = {
  fournisseur?: Fournisseur;
  cles?: Partial<Record<Fournisseur, string>>; // chiffrées
  modeles?: Partial<Record<Fournisseur, string>>;
  prompts?: Partial<Record<DocType, string>>; // partie rédactionnelle personnalisée
  maj?: string;
  par?: string;
};

const BUCKET = "reglages";
const OBJET = "reglages-ia.json";
const base = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const entetes = () => {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: k, Authorization: `Bearer ${k}` };
};

async function lireStocke(): Promise<Stocke> {
  if (!supabaseActif()) return {};
  const r = await fetch(`${base()}/storage/v1/object/${BUCKET}/${OBJET}`, { headers: entetes(), cache: "no-store" });
  if (!r.ok) return {}; // pas encore de réglages enregistrés
  return (await r.json().catch(() => ({}))) as Stocke;
}

async function ecrireStocke(s: Stocke): Promise<void> {
  const envoyer = () =>
    fetch(`${base()}/storage/v1/object/${BUCKET}/${OBJET}`, {
      method: "POST",
      headers: { ...entetes(), "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache" },
      body: JSON.stringify(s),
    });
  let r = await envoyer();
  if (r.status === 400 || r.status === 404) {
    // Premier enregistrement : le dossier privé n'existe pas encore.
    await fetch(`${base()}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...entetes(), "Content-Type": "application/json" },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
    });
    r = await envoyer();
  }
  if (!r.ok) throw new Error(`Enregistrement impossible (${r.status}).`);
}

// ---- Prompts ---------------------------------------------------------------
// Le fichier .md contient la partie rédactionnelle (persona, mission, règles) puis
// « ### Sortie » : le format JSON attendu par le générateur Word. Seule la première
// partie est modifiable ; le format de sortie est toujours rajouté tel quel.

const FICHIERS: Record<DocType, string> = { visite: "prompt_diagnostic.md", chantier: "prompt_chantier.md" };
const MARQUE_SORTIE = "### Sortie";

async function promptOrigine(doc: DocType): Promise<{ redaction: string; sortie: string }> {
  const md = await fs.readFile(path.join(process.cwd(), FICHIERS[doc]), "utf-8");
  const system = md.split("## SYSTEM")[1].split("## USER")[0].trim().replace(/\n-{3,}\s*$/, "").trim();
  const i = system.indexOf(MARQUE_SORTIE);
  return { redaction: system.slice(0, i).trim(), sortie: system.slice(i).trim() };
}

// ---- Lecture pour la rédaction ----------------------------------------------

export type ConfigIA = { fournisseur: Fournisseur; modele: string; cle: string; system: string };

/** Ce qu'il faut pour rédiger un document : moteur, modèle, clé en clair, prompt complet. */
export async function configPourRedaction(doc: DocType): Promise<ConfigIA> {
  const s = await lireStocke();
  const fournisseur = s.fournisseur ?? "gemini";
  const { redaction, sortie } = await promptOrigine(doc);

  const chiffree = s.cles?.[fournisseur];
  let cle = chiffree ? dechiffrer(chiffree) ?? "" : "";
  // Gemini garde la clé gratuite de l'installation tant qu'aucune autre n'est saisie.
  if (!cle && fournisseur === "gemini") cle = process.env.GEMINI_API_KEY ?? "";
  if (!cle) throw new Error(`Aucune clé API ${NOMS[fournisseur]} n'est enregistrée. Ajoutez-la dans les réglages IA.`);

  return {
    fournisseur,
    modele: s.modeles?.[fournisseur] || MODELES_DEFAUT[fournisseur],
    cle,
    system: `${s.prompts?.[doc]?.trim() || redaction}\n\n${sortie}`,
  };
}

export const NOMS: Record<Fournisseur, string> = { gemini: "Gemini", anthropic: "Claude", openai: "OpenAI" };

/** Clé en clair d'un fournisseur (pour le bouton « Tester »). */
export async function cleDe(f: Fournisseur): Promise<{ cle: string; modele: string }> {
  const s = await lireStocke();
  const chiffree = s.cles?.[f];
  let cle = chiffree ? dechiffrer(chiffree) ?? "" : "";
  if (!cle && f === "gemini") cle = process.env.GEMINI_API_KEY ?? "";
  return { cle, modele: s.modeles?.[f] || MODELES_DEFAUT[f] };
}

// ---- Vue pour la page Réglages (jamais de clé en clair) ---------------------

export async function vueReglages() {
  const s = await lireStocke();
  const etatCle = (f: Fournisseur) => {
    const c = s.cles?.[f] ? dechiffrer(s.cles[f]!) : null;
    return { enregistree: Boolean(c), fin: c ? c.slice(-4) : "" };
  };
  const prompts = {} as Record<DocType, { texte: string; origine: string; sortie: string; personnalise: boolean }>;
  for (const doc of ["visite", "chantier"] as DocType[]) {
    const o = await promptOrigine(doc);
    const perso = s.prompts?.[doc]?.trim();
    prompts[doc] = { texte: perso || o.redaction, origine: o.redaction, sortie: o.sortie, personnalise: Boolean(perso) };
  }
  return {
    modifiable: supabaseActif(),
    fournisseur: s.fournisseur ?? "gemini",
    modeles: { ...MODELES_DEFAUT, ...s.modeles },
    modelesDefaut: MODELES_DEFAUT,
    cles: { gemini: etatCle("gemini"), anthropic: etatCle("anthropic"), openai: etatCle("openai") },
    cleGeminiInstallation: Boolean(process.env.GEMINI_API_KEY),
    prompts,
    maj: s.maj ?? null,
    par: s.par ?? null,
  };
}

// ---- Modification ------------------------------------------------------------

export type Modification = {
  fournisseur?: Fournisseur;
  cles?: Partial<Record<Fournisseur, string | null>>; // null = supprimer
  modeles?: Partial<Record<Fournisseur, string>>;
  prompts?: Partial<Record<DocType, string | null>>; // null = revenir à l'original
};

export async function modifierReglages(m: Modification, par: string): Promise<void> {
  if (!supabaseActif()) throw new Error("Les réglages ne sont pas modifiables sur cette installation.");
  const s = await lireStocke();
  s.cles = { ...s.cles };
  s.modeles = { ...s.modeles };
  s.prompts = { ...s.prompts };

  for (const f of FOURNISSEURS) {
    const c = m.cles?.[f];
    if (c === null) delete s.cles[f];
    else if (typeof c === "string" && c.trim()) s.cles[f] = chiffrer(c.trim());

    const mod = m.modeles?.[f];
    if (typeof mod === "string") {
      if (mod.trim() && mod.trim() !== MODELES_DEFAUT[f]) s.modeles[f] = mod.trim();
      else delete s.modeles[f];
    }
  }

  for (const doc of ["visite", "chantier"] as DocType[]) {
    const p = m.prompts?.[doc];
    if (p === undefined) continue;
    const origine = (await promptOrigine(doc)).redaction;
    // Un texte identique à l'original n'est pas une personnalisation.
    if (p === null || !p.trim() || p.trim() === origine) delete s.prompts[doc];
    else s.prompts[doc] = p.trim();
  }

  if (m.fournisseur) {
    if (!FOURNISSEURS.includes(m.fournisseur)) throw new Error("Moteur inconnu.");
    const aUneCle = Boolean(s.cles[m.fournisseur]) || (m.fournisseur === "gemini" && Boolean(process.env.GEMINI_API_KEY));
    if (!aUneCle) throw new Error(`Enregistrez d'abord une clé ${NOMS[m.fournisseur]} avant de choisir ce moteur.`);
    s.fournisseur = m.fournisseur;
  }
  // Supprimer la clé du moteur actif sans solution de repli : on revient sur Gemini.
  if (s.fournisseur && s.fournisseur !== "gemini" && !s.cles[s.fournisseur]) s.fournisseur = "gemini";

  s.maj = new Date().toISOString();
  s.par = par;
  await ecrireStocke(s);
}
