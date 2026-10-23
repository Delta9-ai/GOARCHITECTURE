"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageErreur, MessageSucces } from "../components/CarteAuth";

type Fournisseur = "gemini" | "anthropic" | "openai";
type DocType = "visite" | "chantier";
type Vue = {
  modifiable: boolean;
  fournisseur: Fournisseur;
  modeles: Record<Fournisseur, string>;
  modelesDefaut: Record<Fournisseur, string>;
  cles: Record<Fournisseur, { enregistree: boolean; fin: string }>;
  cleGeminiInstallation: boolean;
  prompts: Record<DocType, { texte: string; origine: string; sortie: string; personnalise: boolean }>;
  maj: string | null;
  par: string | null;
};

const MOTEURS: { id: Fournisseur; nom: string; editeur: string; aide: string; lien: string }[] = [
  { id: "gemini", nom: "Gemini", editeur: "Google", aide: "aistudio.google.com/apikey", lien: "https://aistudio.google.com/apikey" },
  { id: "anthropic", nom: "Claude", editeur: "Anthropic", aide: "console.anthropic.com", lien: "https://console.anthropic.com/settings/keys" },
  { id: "openai", nom: "ChatGPT", editeur: "OpenAI", aide: "platform.openai.com/api-keys", lien: "https://platform.openai.com/api-keys" },
];

const DOCS: { id: DocType; nom: string }[] = [
  { id: "visite", nom: "Rapport de visite" },
  { id: "chantier", nom: "Compte rendu de chantier" },
];

type Message = { erreur: string; succes: string };
const AUCUN: Message = { erreur: "", succes: "" };

export default function ReglagesPage() {
  const [vue, setVue] = useState<Vue | null>(null);
  const [chargeErreur, setChargeErreur] = useState("");

  const [saisieCles, setSaisieCles] = useState<Record<Fournisseur, string>>({ gemini: "", anthropic: "", openai: "" });
  const [modeles, setModeles] = useState<Record<Fournisseur, string>>({ gemini: "", anthropic: "", openai: "" });
  const [msgMoteur, setMsgMoteur] = useState<Message>(AUCUN);
  const [tests, setTests] = useState<Partial<Record<Fournisseur, { ok: boolean; texte: string } | "cours">>>({});
  const [enCours, setEnCours] = useState("");

  const [doc, setDoc] = useState<DocType>("visite");
  const [prompts, setPrompts] = useState<Record<DocType, string>>({ visite: "", chantier: "" });
  const [msgPrompt, setMsgPrompt] = useState<Message>(AUCUN);
  const [voirSortie, setVoirSortie] = useState(false);

  function appliquer(v: Vue) {
    setVue(v);
    setModeles(v.modeles);
    setPrompts({ visite: v.prompts.visite.texte, chantier: v.prompts.chantier.texte });
  }

  useEffect(() => {
    fetch("/api/reglages")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(appliquer)
      .catch(() => setChargeErreur("Impossible de charger les réglages."));
  }, []);

  async function enregistrer(corps: object): Promise<Vue> {
    const r = await fetch("/api/reglages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.detail || "Enregistrement impossible.");
    return d as Vue;
  }

  // ---- Moteur & clés --------------------------------------------------------
  async function choisirMoteur(f: Fournisseur) {
    if (!vue || f === vue.fournisseur) return;
    setMsgMoteur(AUCUN);
    setEnCours("moteur");
    try {
      appliquerSansPrompts(await enregistrer({ fournisseur: f }));
      setMsgMoteur({ ...AUCUN, succes: `Les prochains comptes rendus seront rédigés par ${MOTEURS.find((m) => m.id === f)!.nom}.` });
    } catch (e) {
      setMsgMoteur({ ...AUCUN, erreur: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setEnCours("");
    }
  }

  // Enregistrer une clé ne doit pas écraser un prompt en cours de modification.
  function appliquerSansPrompts(v: Vue) {
    setVue(v);
    setModeles(v.modeles);
  }

  async function enregistrerCle(f: Fournisseur) {
    setMsgMoteur(AUCUN);
    const cle = saisieCles[f].trim();
    const modeleChange = vue && modeles[f].trim() !== vue.modeles[f];
    if (!cle && !modeleChange) return setMsgMoteur({ ...AUCUN, erreur: "Collez d'abord une clé." });
    setEnCours(f);
    try {
      const v = await enregistrer({ cles: cle ? { [f]: cle } : {}, modeles: { [f]: modeles[f] } });
      appliquerSansPrompts(v);
      setSaisieCles((s) => ({ ...s, [f]: "" }));
      setTests((t) => ({ ...t, [f]: undefined }));
      setMsgMoteur({ ...AUCUN, succes: cle ? "Clé enregistrée. Testez-la pour vérifier qu'elle fonctionne." : "Modèle enregistré." });
    } catch (e) {
      setMsgMoteur({ ...AUCUN, erreur: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setEnCours("");
    }
  }

  async function supprimerCle(f: Fournisseur) {
    if (!confirm("Supprimer cette clé ?")) return;
    setMsgMoteur(AUCUN);
    setEnCours(f);
    try {
      appliquerSansPrompts(await enregistrer({ cles: { [f]: null } }));
      setTests((t) => ({ ...t, [f]: undefined }));
      setMsgMoteur({ ...AUCUN, succes: "Clé supprimée." });
    } catch (e) {
      setMsgMoteur({ ...AUCUN, erreur: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setEnCours("");
    }
  }

  async function tester(f: Fournisseur) {
    setTests((t) => ({ ...t, [f]: "cours" }));
    try {
      const r = await fetch("/api/reglages/tester", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fournisseur: f }) });
      const d = await r.json().catch(() => ({}));
      setTests((t) => ({ ...t, [f]: { ok: r.ok, texte: r.ok ? d.message : d.detail || "Échec du test." } }));
    } catch {
      setTests((t) => ({ ...t, [f]: { ok: false, texte: "Le serveur ne répond pas." } }));
    }
  }

  // ---- Prompts --------------------------------------------------------------
  async function enregistrerPrompt() {
    setMsgPrompt(AUCUN);
    if (!prompts[doc].trim()) return setMsgPrompt({ ...AUCUN, erreur: "Le prompt est vide. Utilisez « Revenir à l'original » pour repartir du texte d'origine." });
    setEnCours("prompt");
    try {
      const v = await enregistrer({ prompts: { [doc]: prompts[doc] } });
      setVue(v);
      setMsgPrompt({ ...AUCUN, succes: v.prompts[doc].personnalise ? "Prompt enregistré. Il servira dès le prochain compte rendu." : "Texte identique à l'original : rien à personnaliser." });
    } catch (e) {
      setMsgPrompt({ ...AUCUN, erreur: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setEnCours("");
    }
  }

  async function restaurerPrompt() {
    if (!vue) return;
    if (!confirm("Revenir au prompt d'origine ? Vos modifications de ce prompt seront perdues.")) return;
    setMsgPrompt(AUCUN);
    setEnCours("prompt");
    try {
      const v = await enregistrer({ prompts: { [doc]: null } });
      setVue(v);
      setPrompts((p) => ({ ...p, [doc]: v.prompts[doc].texte }));
      setMsgPrompt({ ...AUCUN, succes: "Prompt d'origine rétabli." });
    } catch (e) {
      setMsgPrompt({ ...AUCUN, erreur: e instanceof Error ? e.message : "Erreur." });
    } finally {
      setEnCours("");
    }
  }

  const promptModifie = vue ? prompts[doc] !== vue.prompts[doc].texte : false;

  function statutCle(f: Fournisseur): string {
    if (!vue) return "";
    if (vue.cles[f].enregistree) return `Clé enregistrée (se termine par ${vue.cles[f].fin})`;
    if (f === "gemini" && vue.cleGeminiInstallation) return "Clé en place";
    return "Aucune clé";
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line/80 bg-surface/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/" className="btn-fant h-10 px-3 text-[13.5px] flex items-center gap-1.5 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Retour à l&apos;outil
          </Link>
          <div className="ml-auto leading-tight text-right min-w-0">
            <div className="marque text-ink text-[12px]">GO Architecture</div>
            <div className="font-display font-semibold text-[15.5px] -mt-[1px]">Réglages IA</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-5">
        {chargeErreur && <MessageErreur texte={chargeErreur} />}
        {!vue && !chargeErreur && <p className="text-[14px] text-muted">Chargement…</p>}

        {vue && !vue.modifiable && (
          <section className="card p-5 sm:p-6 text-[14px] text-muted leading-relaxed">
            Les réglages ne sont pas modifiables sur cette installation (stockage non configuré).
          </section>
        )}

        {vue && vue.modifiable && (
          <>
            {/* ---- Moteur de rédaction ---- */}
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-[19px] font-semibold leading-none mb-1.5">Moteur de rédaction</h2>
              <p className="text-[12.5px] text-faint mb-4">
                L&apos;IA qui rédige les comptes rendus à partir de votre note. La transcription de la voix ne change pas.
              </p>
              <MessageErreur texte={msgMoteur.erreur} />
              <MessageSucces texte={msgMoteur.succes} />

              <div className="grid sm:grid-cols-3 gap-3 mb-6" role="radiogroup" aria-label="Moteur de rédaction">
                {MOTEURS.map((m) => {
                  const actif = vue.fournisseur === m.id;
                  return (
                    <button
                      key={m.id} type="button" role="radio" aria-checked={actif}
                      onClick={() => choisirMoteur(m.id)} disabled={enCours === "moteur"}
                      className={`text-left rounded-[11px] border p-4 transition ${actif ? "border-accent bg-[var(--tint-strong)]" : "border-line hover:border-accent/50"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${actif ? "border-accent" : "border-line"}`}>
                          {actif && <span className="w-2 h-2 rounded-full bg-accent" />}
                        </span>
                        <span className="font-display font-semibold text-[15px]">{m.nom}</span>
                        <span className="text-[12px] text-faint">{m.editeur}</span>
                      </div>
                      <div className="text-[12px] text-muted mt-1.5 pl-6">{statutCle(m.id)}</div>
                    </button>
                  );
                })}
              </div>

              <h3 className="kicker text-muted mb-3">Clés API</h3>
              <div className="space-y-4">
                {MOTEURS.map((m) => {
                  const t = tests[m.id];
                  const aUneCle = vue.cles[m.id].enregistree || (m.id === "gemini" && vue.cleGeminiInstallation);
                  return (
                    <div key={m.id} className="rounded-[11px] border border-line p-4">
                      <div className="flex items-baseline justify-between gap-2 mb-2">
                        <label className="font-display font-semibold text-[14.5px]" htmlFor={`cle-${m.id}`}>{m.nom}</label>
                        <a href={m.lien} target="_blank" rel="noreferrer" className="text-[12px] text-accent hover:underline truncate">Obtenir une clé : {m.aide}</a>
                      </div>
                      <div className="grid sm:grid-cols-[1fr_190px] gap-2.5">
                        <input
                          id={`cle-${m.id}`} type="password" autoComplete="off" spellCheck={false}
                          value={saisieCles[m.id]} onChange={(e) => setSaisieCles((s) => ({ ...s, [m.id]: e.target.value }))}
                          className="champ w-full h-11 font-mono text-[13px]"
                          placeholder={vue.cles[m.id].enregistree ? `•••• ${vue.cles[m.id].fin} (collez-en une autre pour la remplacer)` : "Collez la clé ici"}
                        />
                        <input
                          aria-label={`Modèle ${m.nom}`} spellCheck={false}
                          value={modeles[m.id]} onChange={(e) => setModeles((s) => ({ ...s, [m.id]: e.target.value }))}
                          className="champ w-full h-11 font-mono text-[13px]" placeholder={vue.modelesDefaut[m.id]}
                          title="Nom du modèle"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <button type="button" onClick={() => enregistrerCle(m.id)} disabled={enCours === m.id} className="btn-primaire h-9 px-3.5 text-[13px] disabled:opacity-60">
                          {enCours === m.id ? "Enregistrement…" : "Enregistrer"}
                        </button>
                        {aUneCle && (
                          <button type="button" onClick={() => tester(m.id)} disabled={t === "cours"} className="btn-fant h-9 px-3.5 text-[13px] disabled:opacity-60">
                            {t === "cours" ? "Test…" : "Tester"}
                          </button>
                        )}
                        {vue.cles[m.id].enregistree && (
                          <button type="button" onClick={() => supprimerCle(m.id)} className="h-9 px-2 text-[13px] text-urgent hover:underline">Supprimer</button>
                        )}
                        {t && t !== "cours" && (
                          <span className={`text-[12.5px] ${t.ok ? "text-[#1E7B4F]" : "text-urgent"}`}>{t.ok ? "✓ " : ""}{t.texte}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[12px] text-faint mt-3">
                Les clés sont chiffrées avant d&apos;être enregistrées et ne sont plus jamais affichées en entier. Le champ de droite est le nom du modèle : laissez la valeur proposée sauf besoin précis.
              </p>
            </section>

            {/* ---- Prompt ---- */}
            <section className="card p-5 sm:p-6">
              <div className="flex items-baseline gap-3 mb-1.5">
                <h2 className="font-display text-[19px] font-semibold leading-none">Prompt de rédaction</h2>
                <span className={`ml-auto text-[11.5px] px-2 py-0.5 rounded-full border ${vue.prompts[doc].personnalise ? "border-accent/40 text-accent" : "border-line text-faint"}`}>
                  {vue.prompts[doc].personnalise ? "Personnalisé" : "Version d'origine"}
                </span>
              </div>
              <p className="text-[12.5px] text-faint mb-4">
                Les consignes que suit l&apos;IA pour rédiger. Modifiez le ton, le niveau de détail, la structure des paragraphes, le vocabulaire…
              </p>

              <div className="flex gap-1.5 mb-3 p-1 rounded-[11px] bg-[var(--tint-depot)] border border-line w-full sm:w-fit" role="tablist">
                {DOCS.map((d) => (
                  <button
                    key={d.id} type="button" role="tab" aria-selected={doc === d.id}
                    onClick={() => { setDoc(d.id); setMsgPrompt(AUCUN); setVoirSortie(false); }}
                    className={`flex-1 sm:flex-none h-9 px-3.5 rounded-lg text-[13px] font-medium transition ${doc === d.id ? "bg-surface shadow-sm text-ink" : "text-muted hover:text-ink"}`}
                  >
                    {d.nom}
                  </button>
                ))}
              </div>

              <MessageErreur texte={msgPrompt.erreur} />
              <MessageSucces texte={msgPrompt.succes} />

              <textarea
                value={prompts[doc]}
                onChange={(e) => setPrompts((p) => ({ ...p, [doc]: e.target.value }))}
                spellCheck={false} aria-label={`Prompt — ${DOCS.find((d) => d.id === doc)!.nom}`}
                className="champ w-full py-3 font-mono text-[12.5px] leading-relaxed resize-y min-h-[420px]"
              />

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button type="button" onClick={enregistrerPrompt} disabled={enCours === "prompt" || !promptModifie} className="btn-primaire h-10 px-4 text-[13.5px] disabled:opacity-50">
                  {enCours === "prompt" ? "Enregistrement…" : "Enregistrer le prompt"}
                </button>
                {promptModifie && (
                  <button type="button" onClick={() => setPrompts((p) => ({ ...p, [doc]: vue.prompts[doc].texte }))} className="btn-fant h-10 px-3.5 text-[13.5px]">
                    Annuler les modifications
                  </button>
                )}
                {vue.prompts[doc].personnalise && (
                  <button type="button" onClick={restaurerPrompt} disabled={enCours === "prompt"} className="h-10 px-2 text-[13.5px] text-urgent hover:underline ml-auto">
                    Revenir à l&apos;original
                  </button>
                )}
              </div>

              <div className="mt-5 rounded-[11px] border border-line bg-[var(--tint-depot)] p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-muted shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <div className="text-[12.5px] text-muted leading-relaxed flex-1">
                    Le <strong>format de sortie</strong> est ajouté automatiquement à la fin du prompt et n&apos;est pas modifiable : c&apos;est lui qui permet de remplir le modèle Word.
                    <button type="button" onClick={() => setVoirSortie((v) => !v)} className="block text-accent hover:underline mt-1">
                      {voirSortie ? "Masquer" : "Voir le format de sortie"}
                    </button>
                  </div>
                </div>
                {voirSortie && (
                  <pre className="mt-3 text-[11.5px] leading-relaxed whitespace-pre-wrap font-mono text-muted max-h-80 overflow-auto">{vue.prompts[doc].sortie}</pre>
                )}
              </div>
            </section>

            {vue.maj && (
              <p className="text-[12px] text-faint text-center">
                Dernière modification le {new Date(vue.maj).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}{vue.par ? ` par ${vue.par}` : ""}.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
