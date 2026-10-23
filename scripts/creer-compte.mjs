// Crée un compte (ou remet le mot de passe d'un compte existant) dans Supabase.
// Usage :  node scripts/creer-compte.mjs "email@exemple.com" "mot-de-passe"
// Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local.
import { readFileSync } from "node:fs";

const [email, mdp] = process.argv.slice(2);
if (!email || !mdp) {
  console.error('Usage : node scripts/creer-compte.mjs "email" "mot-de-passe"');
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = env.NEXT_PUBLIC_SUPABASE_URL, cle = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: cle, Authorization: `Bearer ${cle}`, "Content-Type": "application/json" };

let r = await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers: h, body: JSON.stringify({ email, password: mdp, email_confirm: true }) });
if (r.status === 422) {
  // Déjà existant : on retrouve le compte et on lui remet ce mot de passe.
  const liste = await (await fetch(`${base}/auth/v1/admin/users?per_page=1000`, { headers: h })).json();
  const u = liste.users.find((x) => x.email === email.toLowerCase());
  r = await fetch(`${base}/auth/v1/admin/users/${u.id}`, { method: "PUT", headers: h, body: JSON.stringify({ password: mdp }) });
  console.log(r.ok ? `Mot de passe remis pour ${email}` : `Échec : ${await r.text()}`);
} else {
  console.log(r.ok ? `Compte créé : ${email}` : `Échec : ${await r.text()}`);
}
