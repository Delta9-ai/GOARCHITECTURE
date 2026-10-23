// POST /api/reinitialiser — pose le nouveau mot de passe avec le jeton du lien reçu par e-mail.
import { NextResponse } from "next/server";
import { MDP_MIN, reinitialiserAvecJeton, comptesActifs } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!comptesActifs()) {
    return NextResponse.json({ detail: "La réinitialisation n'est pas activée sur cette installation." }, { status: 501 });
  }
  const corps = await req.json().catch(() => ({}));
  const jeton = String(corps.jeton ?? "");
  const mdp = String(corps.mdp ?? "");
  if (!jeton) return NextResponse.json({ detail: "Lien incomplet. Refaites une demande de réinitialisation." }, { status: 400 });
  if (mdp.length < MDP_MIN) {
    return NextResponse.json({ detail: `Le mot de passe doit faire au moins ${MDP_MIN} caractères.` }, { status: 400 });
  }
  const r = await reinitialiserAvecJeton(jeton, mdp);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ detail: r.message }, { status: 400 });
}
