// session.ts — Jetons de session signés (JWT HS256 via jose).
// Compatible Edge ET Node : utilisé par le middleware (edge) et les routes (node).
// N'importe AUCUN module Node natif, pour rester compatible edge.

import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "cr_session";
export const DUREE_SESSION = 7 * 24 * 3600; // 7 jours

function cle(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET manquant");
  return new TextEncoder().encode(secret);
}

export type InfosSession = { sub?: string; email?: string };

/** `sub` = identifiant Supabase du compte (absent en mode identifiants d'environnement). */
export async function signerSession(infos: InfosSession = {}): Promise<string> {
  return new SignJWT({ ok: true, ...infos })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_SESSION}s`)
    .sign(cle());
}

export async function sessionValide(jeton?: string): Promise<boolean> {
  if (!jeton) return false;
  try {
    await jwtVerify(jeton, cle());
    return true;
  } catch {
    return false;
  }
}

/** Contenu d'une session valide, ou null. */
export async function lireSession(jeton?: string): Promise<InfosSession | null> {
  if (!jeton) return null;
  try {
    const { payload } = await jwtVerify(jeton, cle());
    return { sub: payload.sub as string | undefined, email: payload.email as string | undefined };
  } catch {
    return null;
  }
}

export const OPTIONS_COOKIE = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DUREE_SESSION,
};
