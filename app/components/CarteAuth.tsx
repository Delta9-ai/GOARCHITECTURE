// Cadre commun des écrans hors connexion (connexion, mot de passe oublié, réinitialisation).
import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function CarteAuth({ sousTitre, children }: { sousTitre: string; children: ReactNode }) {
  return (
    <main data-theme="agence" className="min-h-screen flex items-center justify-center p-5 text-[#1C1C1C]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-7">
          <Logo className="w-12 h-12 mb-4" />
          <div className="marque text-[14px]">GO Architecture</div>
          <h1 className="font-display text-[22px] font-semibold mt-1 [text-wrap:balance]">Comptes rendus de visite et de chantier</h1>
          <p className="text-[13.5px] text-muted mt-1">{sousTitre}</p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-6 shadow-[0_1px_3px_rgba(14,36,61,.05)]">{children}</div>
      </div>
    </main>
  );
}

export function MessageErreur({ texte }: { texte: string }) {
  if (!texte) return null;
  return (
    <div className="mb-4 rounded-lg border border-urgent/25 bg-[#FBEDEC] text-urgent px-3.5 py-2.5 text-[13.5px] leading-snug">{texte}</div>
  );
}

export function MessageSucces({ texte }: { texte: string }) {
  if (!texte) return null;
  return (
    <div className="mb-4 rounded-lg border border-[#1E7B4F]/25 bg-[#E9F5EE] text-[#1E7B4F] px-3.5 py-2.5 text-[13.5px] leading-snug">{texte}</div>
  );
}

export function BoutonEnvoi({ charge, libelle, enCours }: { charge: boolean; libelle: string; enCours: string }) {
  return (
    <button
      type="submit" disabled={charge}
      className="btn-primaire w-full h-12 text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {charge ? enCours : libelle}
      {charge && (
        <svg className="w-4 h-4 spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
    </button>
  );
}
