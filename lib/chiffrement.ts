// chiffrement.ts — Chiffre les clés API avant de les stocker (AES-256-GCM).
// La clé de chiffrement dérive de SESSION_SECRET : sans le serveur, le fichier
// stocké chez Supabase est illisible.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function cle(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET manquant");
  return createHash("sha256").update(`${secret}:reglages-ia`).digest();
}

export function chiffrer(texte: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cle(), iv);
  const donnees = Buffer.concat([c.update(texte, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), donnees.toString("base64")].join(":");
}

/** Renvoie null si la valeur est illisible (SESSION_SECRET changé, donnée corrompue). */
export function dechiffrer(valeur: string): string | null {
  try {
    const [v, iv, tag, donnees] = valeur.split(":");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", cle(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(donnees, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
