"use client";

import Link from "next/link";
import { useState } from "react";
import { BoutonEnvoi, CarteAuth, MessageErreur, MessageSucces } from "../components/CarteAuth";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [charge, setCharge] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (!email.trim()) {
      setErreur("Renseignez votre adresse e-mail.");
      return;
    }
    setCharge(true);
    try {
      const r = await fetch("/api/mdp-oublie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (r.ok) {
        setEnvoye(true);
        return;
      }
      const d = await r.json().catch(() => ({}));
      setErreur(d.detail || "L'envoi a échoué.");
    } catch {
      setErreur("Le serveur ne répond pas.");
    } finally {
      setCharge(false);
    }
  }

  return (
    <CarteAuth sousTitre="Recevez un lien pour choisir un nouveau mot de passe.">
      {envoye ? (
        <>
          <MessageSucces texte={`Si un compte existe pour ${email.trim()}, un e-mail vient de partir avec un lien de réinitialisation.`} />
          <p className="text-[13.5px] text-muted leading-relaxed">
            Le lien est valable une heure. Pensez à regarder dans les courriers indésirables.
          </p>
        </>
      ) : (
        <>
          <MessageErreur texte={erreur} />
          <form onSubmit={soumettre} noValidate>
            <label className="block kicker text-muted mb-1.5" htmlFor="email">Adresse e-mail du compte</label>
            <input
              id="email" type="email" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="champ w-full h-12 mb-5" placeholder="vous@exemple.com"
            />
            <BoutonEnvoi charge={charge} libelle="Envoyer le lien" enCours="Envoi…" />
          </form>
        </>
      )}
      <Link href="/login" className="block text-center text-[13px] text-accent hover:underline mt-5">Retour à la connexion</Link>
    </CarteAuth>
  );
}
