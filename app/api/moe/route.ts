// GET /api/moe — coordonnées de l'agence (maîtrise d'œuvre).
// Servi par le serveur, derrière le garde d'authentification : ni le dépôt
// public ni le bundle envoyé au navigateur ne portent ces données en clair.
import { NextResponse } from "next/server";
import { moeDepuisEnv } from "@/lib/moe";

export const runtime = "nodejs";
// Sans cela Next fige la réponse au build : changer MOE_* n'aurait plus d'effet.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(moeDepuisEnv());
}
