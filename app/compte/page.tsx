"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BoutonEnvoi, MessageErreur, MessageSucces } from "../components/CarteAuth";

const MDP_MIN = 8;

type Etat = { charge: boolean; erreur: string; succes: string };
const VIDE: Etat = { charge: false, erreur: "", succes: "" };

async function envoyer(corps: Record<string, string>) {
  const r = await fetch("/api/compte", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || "La modification a échoué.");
  return d;
}

export default function ComptePage() {
  const [infos, setInfos] = useState<{ actif: boolean; email: string | null } | null>(null);

  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [etatMdp, setEtatMdp] = useState<Etat>(VIDE);

  const [email, setEmail] = useState("");
  const [mdpEmail, setMdpEmail] = useState("");
  const [etatEmail, setEtatEmail] = useState<Etat>(VIDE);

  useEffect(() => {
    fetch("/api/compte").then((r) => r.json()).then(setInfos).catch(() => setInfos({ actif: false, email: null }));
  }, []);

  async function changerMdp(e: React.FormEvent) {
    e.preventDefault();
    if (!actuel) return setEtatMdp({ ...VIDE, erreur: "Renseignez votre mot de passe actuel." });
    if (nouveau.length < MDP_MIN) return setEtatMdp({ ...VIDE, erreur: `Le nouveau mot de passe doit faire au moins ${MDP_MIN} caractères.` });
    if (nouveau !== confirmation) return setEtatMdp({ ...VIDE, erreur: "Les deux nouveaux mots de passe ne sont pas identiques." });
    setEtatMdp({ ...VIDE, charge: true });
    try {
      await envoyer({ action: "mdp", actuel, nouveau });
      setActuel(""); setNouveau(""); setConfirmation("");
      setEtatMdp({ ...VIDE, succes: "Mot de passe modifié. Il servira dès votre prochaine connexion." });
    } catch (err) {
      setEtatMdp({ ...VIDE, erreur: err instanceof Error ? err.message : "La modification a échoué." });
    }
  }

  async function changerEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setEtatEmail({ ...VIDE, erreur: "Renseignez la nouvelle adresse." });
    if (!mdpEmail) return setEtatEmail({ ...VIDE, erreur: "Renseignez votre mot de passe actuel." });
    setEtatEmail({ ...VIDE, charge: true });
    try {
      const d = await envoyer({ action: "email", actuel: mdpEmail, email: email.trim() });
      setInfos((i) => (i ? { ...i, email: d.email } : i));
      setEmail(""); setMdpEmail("");
      setEtatEmail({ ...VIDE, succes: `Adresse modifiée. Connectez-vous désormais avec ${d.email}.` });
    } catch (err) {
      setEtatEmail({ ...VIDE, erreur: err instanceof Error ? err.message : "La modification a échoué." });
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line/80 bg-surface/70">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/" className="btn-fant h-10 px-3 text-[13.5px] flex items-center gap-1.5 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Retour à l&apos;outil
          </Link>
          <div className="ml-auto leading-tight text-right min-w-0">
            <div className="marque text-ink text-[12px]">GO Architecture</div>
            <div className="font-display font-semibold text-[15.5px] -mt-[1px]">Mon compte</div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-5">
        {infos === null ? (
          <p className="text-[14px] text-muted">Chargement…</p>
        ) : !infos.actif ? (
          <section className="card p-5 sm:p-6 text-[14px] text-muted leading-relaxed">
            La gestion du compte n&apos;est pas activée sur cette installation.
          </section>
        ) : !infos.email ? (
          <section className="card p-5 sm:p-6 text-[14px] text-muted leading-relaxed">
            Pour modifier votre compte, <Link href="/login" className="text-accent hover:underline">reconnectez-vous</Link> une fois.
          </section>
        ) : (
          <>
            <section className="card p-5 sm:p-6">
              <div className="kicker text-muted">Connecté en tant que</div>
              <div className="font-display text-[17px] font-semibold mt-1 break-all">{infos.email}</div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-[19px] font-semibold leading-none mb-1.5">Mot de passe</h2>
              <p className="text-[12.5px] text-faint mb-4">{MDP_MIN} caractères minimum.</p>
              <MessageErreur texte={etatMdp.erreur} />
              <MessageSucces texte={etatMdp.succes} />
              <form onSubmit={changerMdp} noValidate className="space-y-4">
                <div>
                  <label className="block kicker text-muted mb-1.5" htmlFor="actuel">Mot de passe actuel</label>
                  <input id="actuel" type="password" autoComplete="current-password" value={actuel} onChange={(e) => setActuel(e.target.value)} className="champ w-full h-12" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block kicker text-muted mb-1.5" htmlFor="nouveau">Nouveau mot de passe</label>
                    <input id="nouveau" type="password" autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} className="champ w-full h-12" />
                  </div>
                  <div>
                    <label className="block kicker text-muted mb-1.5" htmlFor="confirmation">Confirmer</label>
                    <input id="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="champ w-full h-12" />
                  </div>
                </div>
                <BoutonEnvoi charge={etatMdp.charge} libelle="Changer le mot de passe" enCours="Enregistrement…" />
              </form>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-[19px] font-semibold leading-none mb-1.5">Adresse e-mail de connexion</h2>
              <p className="text-[12.5px] text-faint mb-4">C&apos;est l&apos;identifiant à saisir pour se connecter à l&apos;outil.</p>
              <MessageErreur texte={etatEmail.erreur} />
              <MessageSucces texte={etatEmail.succes} />
              <form onSubmit={changerEmail} noValidate className="space-y-4">
                <div>
                  <label className="block kicker text-muted mb-1.5" htmlFor="nouvel-email">Nouvelle adresse</label>
                  <input id="nouvel-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="champ w-full h-12" placeholder="vous@exemple.com" />
                </div>
                <div>
                  <label className="block kicker text-muted mb-1.5" htmlFor="mdp-email">Mot de passe actuel</label>
                  <input id="mdp-email" type="password" autoComplete="current-password" value={mdpEmail} onChange={(e) => setMdpEmail(e.target.value)} className="champ w-full h-12" />
                </div>
                <BoutonEnvoi charge={etatEmail.charge} libelle="Changer l'adresse" enCours="Enregistrement…" />
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
