/** @type {import('next').NextConfig} */
const PROMPTS = ["./prompt_diagnostic.md", "./prompt_chantier.md"];

const nextConfig = {
  // Les prompts sont lus au runtime (fs) : on force leur inclusion dans le bundle de
  // chaque fonction serverless qui les lit, sinon ils n'existent qu'en local et la
  // rédaction échoue une fois en ligne. (Le template Word, lui, est servi en statique
  // depuis public/ et récupéré par le navigateur qui génère le .docx localement.)
  experimental: {
    outputFileTracingIncludes: {
      "/api/extract": PROMPTS,
      "/api/reglages": PROMPTS,
    },
  },
};

export default nextConfig;
