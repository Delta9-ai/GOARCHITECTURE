// /api/compte — « Mon compte » : lire l'e-mail, changer le mot de passe ou l'e-mail.
// Toute modification exige le mot de passe actuel, même avec une session ouverte
// (un ordinateur resté allumé ne doit pas suffire à prendre le compte).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, OPTIONS_COOKIE, lireSession, signerSession } from "@/lib/session";
import { MDP_MIN, modifierCompte, supabaseActif, verifierIdentifiants } from "@/lib/supabase";

export const runtime = "nodejs";

const erreur = (detail: string, status = 400) => NextResponse.json({ detail }, { status });

async function sessionCompte() {
  const s = await lireSession(cookies().get(COOKIE)?.value);
  return s?.sub && s.email ? { sub: s.sub, email: s.email } : null;
}

export async function GET() {
  if (!supabaseActif()) return NextResponse.json({ actif: false });
  const s = await sessionCompte();
  return NextResponse.json({ actif: true, email: s?.email ?? null });
}

export async function POST(req: Request) {
  if (!supabaseActif()) return erreur("La gestion du compte n'est pas activée sur cette installation.", 501);
  const s = await sessionCompte();
  if (!s) return erreur("Reconnectez-vous pour modifier votre compte.", 401);

  const corps = await req.json().catch(() => ({}));
  const actuel = String(corps.actuel ?? "");

  if (!(await verifierIdentifiants(s.email, actuel))) {
    await new Promise((r) => setTimeout(r, 500));
    return erreur("Mot de passe actuel incorrect.", 403);
  }

  if (corps.action === "mdp") {
    const nouveau = String(corps.nouveau ?? "");
    if (nouveau.length < MDP_MIN) return erreur(`Le nouveau mot de passe doit faire au moins ${MDP_MIN} caractères.`);
    if (nouveau === actuel) return erreur("Le nouveau mot de passe doit être différent de l'ancien.");
    const r = await modifierCompte(s.sub, { password: nouveau });
    return r.ok ? NextResponse.json({ ok: true }) : erreur(r.message);
  }

  if (corps.action === "email") {
    const email = String(corps.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erreur("Adresse e-mail invalide.");
    if (email === s.email) return erreur("C'est déjà votre adresse actuelle.");
    const r = await modifierCompte(s.sub, { email });
    if (!r.ok) return erreur(r.message);
    // La session porte l'e-mail : on la réémet pour que la suite utilise la nouvelle adresse.
    const res = NextResponse.json({ ok: true, email });
    res.cookies.set(COOKIE, await signerSession({ sub: s.sub, email }), OPTIONS_COOKIE);
    return res;
  }

  return erreur("Action inconnue.");
}
