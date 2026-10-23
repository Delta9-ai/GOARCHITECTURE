"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BoutonEnvoi, CarteAuth, MessageErreur, MessageSucces } from "../components/CarteAuth";

const MDP_MIN = 8;

// Le lien de l'e-mail passe par Supabase, qui renvoie ici avec le jeton dans
// l'ancre de l'URL (#access_token=…&type=recovery), ou une erreur si le lien a expiré.
export default function ReinitialiserPage() {
  const [jeton, setJeton] = useState<string | null>(null);
  const [lienInvalide, setLienInvalide] = useState("");
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [fait, setFait] = useState(false);
  const [charge, setCharge] = useState(false);

  const lu = useRef(false);

  useEffect(() => {
    // Lecture unique : l'ancre est effacée juste après, une seconde exécution
    // (mode strict de React en développement) croirait le lien incomplet.
    if (lu.current) return;
    lu.current = true;
    const ancre = new URLSearchParams(window.location.hash.slice(1));
    const t = ancre.get("access_token");
    if (t) setJeton(t);
    else setLienInvalide(ancre.get("error") ? "Ce lien a expiré ou a déjà servi." : "Ce lien est incomplet.");
    // On retire le jeton de la barre d'adresse (historique, captures d'écran).
    history.replaceState(null, "", window.location.pathname);
  }, []);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (mdp.length < MDP_MIN) return setErreur(`Le mot de passe doit faire au moins ${MDP_MIN} caractères.`);
    if (mdp !== confirmation) return setErreur("Les deux mots de passe ne sont pas identiques.");
    setCharge(true);
    try {
      const r = await fetch("/api/reinitialiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jeton, mdp }),
      });
      if (r.ok) {
        setFait(true);
        return;
      }
      const d = await r.json().catch(() => ({}));
      setErreur(d.detail || "La modification a échoué.");
    } catch {
      setErreur("Le serveur ne répond pas.");
    } finally {
      setCharge(false);
    }
  }

  return (
    <CarteAuth sousTitre="Choisissez un nouveau mot de passe.">
      {fait ? (
        <>
          <MessageSucces texte="Mot de passe modifié. Vous pouvez vous connecter avec le nouveau." />
          <Link href="/login" className="btn-primaire w-full h-12 text-[15px] flex items-center justify-center">Se connecter</Link>
        </>
      ) : lienInvalide ? (
        <>
          <MessageErreur texte={lienInvalide} />
          <Link href="/mot-de-passe-oublie" className="btn-primaire w-full h-12 text-[15px] flex items-center justify-center">Recevoir un nouveau lien</Link>
        </>
      ) : jeton ? (
        <>
          <MessageErreur texte={erreur} />
          <form onSubmit={soumettre} noValidate>
            <label className="block kicker text-muted mb-1.5" htmlFor="mdp">Nouveau mot de passe</label>
            <input
              id="mdp" type="password" autoComplete="new-password" value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              className="champ w-full h-12 mb-1.5" placeholder={`${MDP_MIN} caractères minimum`}
            />
            <p className="text-[12px] text-faint mb-4">{MDP_MIN} caractères minimum.</p>
            <label className="block kicker text-muted mb-1.5" htmlFor="confirmation">Confirmer</label>
            <input
              id="confirmation" type="password" autoComplete="new-password" value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="champ w-full h-12 mb-5" placeholder="••••••••"
            />
            <BoutonEnvoi charge={charge} libelle="Enregistrer le mot de passe" enCours="Enregistrement…" />
          </form>
        </>
      ) : null}
      {!fait && <Link href="/login" className="block text-center text-[13px] text-accent hover:underline mt-5">Retour à la connexion</Link>}
    </CarteAuth>
  );
}
