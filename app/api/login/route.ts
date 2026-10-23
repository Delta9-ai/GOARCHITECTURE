// POST /api/login — vérifie les identifiants et pose le cookie de session.
// Comptes Supabase activés (COMPTES_SUPABASE=1) : ce sont eux qui font foi (mot de
// passe modifiable depuis l'outil). Sinon, connexion par AUTH_EMAIL / AUTH_PASSWORD_HASH.
import { NextResponse } from "next/server";
import { verifierMdp, comparerConstante } from "@/lib/password";
import { signerSession, COOKIE, OPTIONS_COOKIE, type InfosSession } from "@/lib/session";
import { comptesActifs, verifierIdentifiants } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const mdp = String(form.get("mdp") ?? "");

  let infos: InfosSession | null = null;

  if (comptesActifs()) {
    const u = email && mdp ? await verifierIdentifiants(email, mdp) : null;
    if (u) infos = { sub: u.id, email: u.email };
  } else {
    const emailOk = comparerConstante(email, (process.env.AUTH_EMAIL ?? "").trim().toLowerCase());
    const mdpOk = verifierMdp(mdp, process.env.AUTH_PASSWORD_HASH ?? "");
    // On évalue toujours les deux (pas de court-circuit) pour ne pas révéler
    // par le temps de réponse lequel est faux.
    if (emailOk && mdpOk) infos = { email };
  }

  if (!infos) {
    await new Promise((r) => setTimeout(r, 500)); // délai anti-force-brute
    return NextResponse.json({ detail: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await signerSession(infos), OPTIONS_COOKIE);
  return res;
}
