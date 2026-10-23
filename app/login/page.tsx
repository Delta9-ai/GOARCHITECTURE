"use client";

import Link from "next/link";
import { useState } from "react";
import { BoutonEnvoi, CarteAuth, MessageErreur } from "../components/CarteAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (!email.trim() || !mdp) {
      setErreur("Renseignez votre e-mail et votre mot de passe.");
      return;
    }
    setCharge(true);
    const fd = new FormData();
    fd.append("email", email.trim());
    fd.append("mdp", mdp);
    try {
      const r = await fetch("/api/login", { method: "POST", body: fd });
      if (r.ok) {
        window.location.href = "/";
        return;
      }
      const d = await r.json().catch(() => ({}));
      setErreur(d.detail || "Connexion impossible.");
    } catch {
      setErreur("Le serveur ne répond pas. Vérifiez qu'il est bien démarré.");
    } finally {
      setCharge(false);
    }
  }

  return (
    <CarteAuth sousTitre="Connectez-vous pour accéder à l'outil.">
      <MessageErreur texte={erreur} />
      <form onSubmit={soumettre} noValidate>
        <label className="block kicker text-muted mb-1.5" htmlFor="email">Adresse e-mail</label>
        <input
          id="email" type="email" autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="champ w-full h-12 mb-4" placeholder="vous@exemple.com"
        />
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="kicker text-muted" htmlFor="mdp">Mot de passe</label>
          <Link href="/mot-de-passe-oublie" className="text-[12.5px] text-accent hover:underline">Mot de passe oublié ?</Link>
        </div>
        <input
          id="mdp" type="password" autoComplete="current-password" value={mdp}
          onChange={(e) => setMdp(e.target.value)}
          className="champ w-full h-12 mb-5" placeholder="••••••••"
        />
        <BoutonEnvoi charge={charge} libelle="Se connecter" enCours="Connexion…" />
      </form>
    </CarteAuth>
  );
}
