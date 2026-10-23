// POST /api/reglages/tester — vérifie qu'une clé enregistrée répond, par un appel minuscule.
import { NextResponse } from "next/server";
import { cleDe, FOURNISSEURS, NOMS, type Fournisseur } from "@/lib/reglages";
import { generer } from "@/lib/ia";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { fournisseur } = (await req.json().catch(() => ({}))) as { fournisseur?: Fournisseur };
  if (!fournisseur || !FOURNISSEURS.includes(fournisseur)) {
    return NextResponse.json({ detail: "Moteur inconnu." }, { status: 400 });
  }
  const { cle, modele } = await cleDe(fournisseur);
  if (!cle) return NextResponse.json({ detail: `Aucune clé ${NOMS[fournisseur]} enregistrée.` }, { status: 400 });
  try {
    await generer({
      fournisseur, modele, cle,
      system: 'Réponds uniquement par l\'objet JSON {"ok": true}.',
      user: "Test de connexion.",
      maxTokens: 64,
    });
    return NextResponse.json({ ok: true, message: `${NOMS[fournisseur]} répond (modèle ${modele}).` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erreur inconnue";
    return NextResponse.json({ detail: msg.charAt(0).toUpperCase() + msg.slice(1) }, { status: 502 });
  }
}
