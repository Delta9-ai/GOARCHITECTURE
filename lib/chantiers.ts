// chantiers.ts — Bibliothèque d'immeubles côté client (localStorage, sans BDD).
// Démarre vide : l'architecte crée ses immeubles depuis l'outil.
import type { Chantier } from "./types";

const CLE = "cr_diag_chantiers";

// Ancien immeuble de démonstration, amorcé automatiquement par les premières versions.
// On le retire des bibliothèques existantes : pour le client, il faisait reste de test.
const estExemple = (c: Chantier) => c.code_immeuble === "EXE-00-000" && c.sdc === "SDC EXEMPLE";

export function lireChantiers(): Chantier[] {
  if (typeof window === "undefined") return [];
  try {
    const liste = JSON.parse(localStorage.getItem(CLE) || "[]") as Chantier[];
    const sansExemple = liste.filter((c) => !estExemple(c));
    if (sansExemple.length !== liste.length) localStorage.setItem(CLE, JSON.stringify(sansExemple));
    return sansExemple;
  } catch {
    return [];
  }
}

export function ecrireChantiers(chantiers: Chantier[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLE, JSON.stringify(chantiers));
}
