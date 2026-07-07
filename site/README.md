# AGE Climate — site vitrine

Site vitrine + blog, construit avec Astro (rendu statique, bon pour le SEO).
Déployé en tant que projet Vercel séparé, sur le domaine age-nature.com,
distinct de l'app métier (age-climate-platform).

## Démarrage

    pnpm install
    pnpm dev

## Structure

- `src/styles/tokens.css` — palette "AGE Sauge" + échelle typographique (Space Grotesk / Inter / JetBrains Mono)
- `src/components/DecayCurve.astro` — signature visuelle : courbe de décote climatique (avec/sans adaptation), réutilisée en hero et en séparateur de section
- `src/pages/index.astro` — page d'accueil (hero + teaser des 4 modules)

## Pages restant à construire

- /modules (page liste + une sous-page par module : Brown Value, AGEadapt, AGEcarbon, RGA)
- /tarifs
- /blog (index + template d'article)
- /a-propos
- /contact (formulaire)
