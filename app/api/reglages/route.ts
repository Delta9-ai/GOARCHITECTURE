// /api/reglages — Réglages IA : moteur, clés API (jamais renvoyées en clair), prompts.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, lireSession } from "@/lib/session";
import { modifierReglages, vueReglages, type Modification } from "@/lib/reglages";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await vueReglages());
}

export async function POST(req: Request) {
  const session = await lireSession(cookies().get(COOKIE)?.value);
  try {
    await modifierReglages((await req.json()) as Modification, session?.email ?? "inconnu");
    return NextResponse.json(await vueReglages());
  } catch (e) {
    return NextResponse.json({ detail: e instanceof Error ? e.message : "Enregistrement impossible." }, { status: 400 });
  }
}
