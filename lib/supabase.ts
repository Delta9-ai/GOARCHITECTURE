// supabase.ts — Comptes utilisateurs via Supabase Auth (appels REST directs, sans SDK).
// Côté serveur uniquement : la clé secrète ne doit jamais partir au navigateur.
//
// Supabase ne sert qu'à vérifier / changer les identifiants. La session de l'outil
// reste notre propre cookie signé (lib/session.ts), lu par le middleware.

const base = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const anon = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const secrete = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const MDP_MIN = 8;

export function supabaseActif(): boolean {
  return Boolean(base() && anon() && secrete());
}

export type Utilisateur = { id: string; email: string };

async function appel(chemin: string, init: RequestInit & { cle?: string; jeton?: string } = {}) {
  const { cle = anon(), jeton, headers, ...reste } = init;
  const r = await fetch(base() + chemin, {
    ...reste,
    headers: {
      apikey: cle,
      Authorization: `Bearer ${jeton ?? cle}`,
      "Content-Type": "application/json",
      ...headers,
    },
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

/** Vérifie e-mail + mot de passe. Renvoie l'utilisateur, ou null si refusé. */
export async function verifierIdentifiants(email: string, mdp: string): Promise<Utilisateur | null> {
  const r = await appel("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password: mdp }),
  });
  if (!r.ok || !r.data?.user?.id) return null;
  return { id: r.data.user.id, email: r.data.user.email };
}

/** Change le mot de passe et/ou l'e-mail d'un compte (clé secrète). */
export async function modifierCompte(id: string, champs: { password?: string; email?: string }) {
  const corps: Record<string, unknown> = { ...champs };
  // L'e-mail est changé par l'utilisateur lui-même, après avoir redonné son mot de passe :
  // on ne lui impose pas un second aller-retour par e-mail.
  if (champs.email) corps.email_confirm = true;
  const r = await appel(`/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    cle: secrete(),
    body: JSON.stringify(corps),
  });
  return { ok: r.ok, message: traduire(r.data) };
}

/** Envoie l'e-mail « mot de passe oublié » avec un lien vers `retour`. */
export async function envoyerLienReinitialisation(email: string, retour: string) {
  const r = await appel(`/auth/v1/recover?redirect_to=${encodeURIComponent(retour)}`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return { ok: r.ok, status: r.status, message: traduire(r.data) };
}

/** Pose un nouveau mot de passe avec le jeton reçu par le lien de l'e-mail. */
export async function reinitialiserAvecJeton(jeton: string, mdp: string) {
  const r = await appel("/auth/v1/user", {
    method: "PUT",
    jeton,
    body: JSON.stringify({ password: mdp }),
  });
  return { ok: r.ok, message: traduire(r.data) };
}

/** Messages Supabase (en anglais) → phrases compréhensibles pour l'utilisateur. */
function traduire(data: { msg?: string; message?: string; error_description?: string; error_code?: string }): string {
  const brut = `${data?.error_code ?? ""} ${data?.msg ?? data?.message ?? data?.error_description ?? ""}`.toLowerCase();
  if (!brut.trim()) return "";
  if (brut.includes("same_password") || brut.includes("different from the old")) return "Le nouveau mot de passe doit être différent de l'ancien.";
  if (brut.includes("weak_password") || brut.includes("at least")) return `Mot de passe trop court (${MDP_MIN} caractères minimum).`;
  if (brut.includes("email_exists") || brut.includes("already been registered")) return "Cette adresse e-mail est déjà utilisée par un autre compte.";
  if (brut.includes("invalid") && brut.includes("email")) return "Adresse e-mail invalide.";
  if (brut.includes("rate") || brut.includes("seconds")) return "Trop de demandes rapprochées. Réessayez dans quelques minutes.";
  if (brut.includes("expired") || brut.includes("jwt") || brut.includes("session")) return "Le lien a expiré. Refaites une demande de réinitialisation.";
  return "L'opération a échoué. Réessayez dans un instant.";
}
