// ia.ts — Appel du moteur de rédaction choisi dans les réglages (Gemini, Claude ou OpenAI).
// Même entrée (prompt système + message) et même sortie (texte JSON) pour les trois :
// le reste de l'outil ne sait pas quel moteur a rédigé.
import type { Fournisseur } from "./reglages";

type Appel = { fournisseur: Fournisseur; modele: string; cle: string; system: string; user: string; maxTokens?: number };

export async function generer({ fournisseur, modele, cle, system, user, maxTokens = 16384 }: Appel): Promise<string> {
  if (fournisseur === "anthropic") return claude(modele, cle, system, user, maxTokens);
  if (fournisseur === "openai") return openai(modele, cle, system, user, maxTokens);
  return gemini(modele, cle, system, user, maxTokens);
}

async function gemini(modele: string, cle: string, system: string, user: string, maxTokens: number) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: maxTokens,
        // Les modèles « flash » acceptent de couper le raisonnement : réponses ~5-10 s
        // au lieu de 20-70 s (évite les timeouts Vercel). Les « pro » l'exigent.
        ...(modele.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });
  const data = await lire(r, "Gemini");
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? "").join("");
}

async function claude(modele: string, cle: string, system: string, user: string, maxTokens: number) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": cle, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: modele,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await lire(r, "Claude");
  return (data?.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
}

async function openai(modele: string, cle: string, system: string, user: string, maxTokens: number) {
  // Modèles « raisonnants » (gpt-5, o3…) : effort minimal, sinon la réponse dépasse
  // facilement la minute pour un simple travail de rédaction.
  const raisonnant = /^(gpt-5|o\d)/.test(modele);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
    body: JSON.stringify({
      model: modele,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
      ...(raisonnant ? { reasoning_effort: "minimal" } : {}),
    }),
  });
  const data = await lire(r, "OpenAI");
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Lit la réponse ; en cas d'erreur, un message clair plutôt que du JSON brut. */
async function lire(r: Response, nom: string) {
  if (r.ok) return r.json();
  const t = await r.text().catch(() => "");
  if (r.status === 401 || r.status === 403 || /api[_ ]?key/i.test(t)) throw new Error(`la clé ${nom} est refusée (invalide ou désactivée).`);
  if (r.status === 404 || (r.status === 400 && /model/i.test(t))) throw new Error(`le modèle demandé n'existe pas chez ${nom}. Vérifiez son nom dans les réglages IA.`);
  if (r.status === 429) throw new Error(`${nom} limite les requêtes (quota atteint ou crédit épuisé). Réessayez plus tard.`);
  if (r.status === 402 || /credit|billing|insufficient/i.test(t)) throw new Error(`le compte ${nom} n'a plus de crédit.`);
  throw new Error(`${nom} a renvoyé une erreur ${r.status} : ${t.slice(0, 200)}`);
}

/** Extrait l'objet JSON d'une réponse, même entourée de texte ou de balises ```json. */
export function extraireJson<T>(txt: string): T {
  const debut = txt.indexOf("{");
  const fin = txt.lastIndexOf("}");
  if (debut < 0 || fin < debut) throw new Error("la réponse du moteur ne contient pas de JSON exploitable.");
  return JSON.parse(txt.slice(debut, fin + 1)) as T;
}
