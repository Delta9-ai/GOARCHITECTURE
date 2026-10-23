// POST /api/mdp-oublie — envoie l'e-mail avec le lien de réinitialisation.
// Répond toujours « envoyé » (sauf limite de débit) : on ne révèle pas si une
// adresse a un compte ou non.
import { NextResponse } from "next/server";
import { envoyerLienReinitialisation, supabaseActif } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!supabaseActif()) {
    return NextResponse.json({ detail: "La réinitialisation n'est pas activée sur cette installation." }, { status: 501 });
  }
  const corps = await req.json().catch(() => ({}));
  const email = String(corps.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ detail: "Adresse e-mail invalide." }, { status: 400 });
  }

  const retour = new URL("/reinitialiser", req.url).toString();
  const r = await envoyerLienReinitialisation(email, retour);
  if (r.status === 429) return NextResponse.json({ detail: r.message }, { status: 429 });
  return NextResponse.json({ ok: true });
}
