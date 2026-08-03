# BACKLOG — Site vitrine AGE-QC (age-qc.com)

**Repo :** `age-climate-platform/site` (Astro, build statique)
**Domaine :** age-qc.com
**Hébergement :** IONOS Deploy Now (migré depuis Vercel le 10/07/2026)
**Dernière mise à jour :** 17/07/2026 (session — page "bientôt disponible" + redirection temporaire bouton Connexion)

---

## Fait

### Structure & design
- [x] Squelette Astro créé (`site/`), build vérifié sans erreur
- [x] Palette "AGE Sauge" : primaire `#3F7A5D`, secondaire `#111111`, accent mint `#3FCDA0` / `#1F8F6B` (texte), fond `#F2F2F0`, tokens dans `src/styles/tokens.css`
- [x] Typographie : Space Grotesk (titres), Inter (corps), JetBrains Mono (data), via `@fontsource`
- [x] Header + Footer (nav publique, CTA "Demander une démo", lien Connexion vers `app.age-qc.com`)
- [x] Renommage marque : AGE Climate → **AGE-QC** partout (logo, meta, titres) ; AGE Legacy → AGE-QC (footer copyright)
- [x] Renommage terminologie : "Module(s)" → **"Solutions"** (nav, URL `/solutions`, boutons, variable `solutions`)

### Pages
- [x] Page d'accueil (`src/pages/index.astro`) : hero, section "De la donnée à l'action", grille des 4 solutions
- [x] `/solutions` — page liste + sous-pages détaillées (AGEprévention, AGEadapt, AGEcarbone, AGEplace)
- [x] `/vous-etes/*` — 6 pages audience (particulier, notaire, assureur, banque, collectivité, entreprise)
- [x] `/a-propos`
- [x] `/contact` (formulaire Supabase-backed, table `demandes_contact_site`)
- [x] **`/mentions-legales`** — infos CAPTB (SIRET, RCS, siège Vitrolles), directeur de publication Hubert Roche, hébergeur 1&1 IONOS SARL
- [x] **`/politique-de-confidentialite`** — RGPD, tableau données/finalités/base légale/durée, sous-traitants (Supabase + IONOS), droits CNIL
- [x] Footer mis à jour avec les 2 nouveaux liens légaux (colonne "Informations")
- [x] Correction bug : import `Layout.astro` (casse) dans les pages légales — cassait le build Linux (fonctionnait en local Windows, insensible à la casse)
- [x] **`/bientot-disponible` (17/07/2026)** — page annonçant la connexion prochaine à la plateforme AGE-QC ; message + présentation courte ("plateforme de référence pour la gestion des risques climatiques", sans détail des 4 solutions), CTA "Nous contacter" / "Retour à l'accueil"

### Blog & Actualités (15/07/2026)
- [x] Content Collections Astro créées : `src/content/blog/`, `src/content/actualites/`, schéma de validation dans `src/content/config.ts` (title, description, pubDate, updatedDate, author, image, persona[], solution, tags[], draft)
- [x] Pages listing `/blog` et `/actualites` :
  - Blog : article à la une pleine largeur (liseré `#3F7A5D` en haut, ombre portée) + grille 2 colonnes pour le reste
  - Actualités : flux vertical type "journal" (date en JetBrains Mono, marqueur mint `#3FCDA0`, ligne de temps)
- [x] Templates article individuel `[slug].astro` (blog et actualités) avec données structurées JSON-LD (`Article` pour blog, `NewsArticle` pour actualités)
- [x] Bloc "Aller plus loin" en fin d'article blog — liens dynamiques vers la solution et les personas associés (champs `solution`/`persona` du frontmatter)
- [x] Lien "Blog" ajouté à la nav principale (header desktop + mobile)
- [x] Colonne "Ressources" (Blog + Actualités) ajoutée au footer, grille footer passée de 4 à 5 colonnes (breakpoints ajustés : 3 col. à 1024px, 2 col. à 860px, 1 col. à 640px)
- [x] Décision actée avec le PO : **pas d'agrégation de flux RSS/API externe** pour les actualités — risque de contenu non original pénalisé par les mises à jour Google de mars/mai 2026 ; actualités = contenu rédigé maison, format court, réactif
- [x] 4 articles de blog publiés :
  - RGA en 2026 : 55% du territoire français désormais exposé
  - Guide ERRIAL : comprendre l'état des risques pour une transaction immobilière
  - Notaire : intégrer le risque climatique dans une transaction immobilière
  - Submersion marine et recul du trait de côte : comprendre l'exposition d'un bien littoral
- [x] 4 actualités publiées :
  - Décret Tertiaire : rappel des échéances 2030
  - CSRD : rappel des seuils d'application
  - Sécheresse été 2026 : point de vigilance RGA
  - Base Carbone ADEME : mise à jour des facteurs d'émission
- [x] Déployé en production et vérifié fonctionnel sur `age-qc.com/blog` et `age-qc.com/actualites`

### Blog & Actualités — GEO/AEO (15/07/2026, session suite)
- [x] **Schema.org FAQPage sur les articles blog** — visibilité dans les réponses IA (ChatGPT, Perplexity, Gemini, AI Overviews)
  - Champ `faq` optionnel ajouté au schéma de la collection `blog` dans `src/content/config.ts` (array de `{question, reponse}`), non ajouté à la collection `actualites` (format court peu adapté)
  - `src/pages/blog/[slug].astro` : génération conditionnelle du JSON-LD `FAQPage` (`mainEntity` en `Question`/`acceptedAnswer`), injecté en plus du JSON-LD `Article` existant
  - Affichage visuel en accordéons natifs `<details>/<summary>` (accessible clavier, sans JS), section "Questions fréquentes" placée après le corps de l'article et avant le bloc "Aller plus loin"
  - FAQ rédigées et intégrées pour les 4 articles existants (4-5 questions chacun, basées sur le contenu réel de chaque article) :
    - `guide-errial-etat-risques.md`
    - `notaire-risque-climatique-transaction.md`
    - `rga-2026-territoire-expose.md`
    - `submersion-marine-trait-de-cote.md`
  - Bug rencontré et corrigé pendant la session : duplication accidentelle de la ligne `{(post.data.persona?.length || post.data.solution) && (` lors du collage d'un patch → erreur esbuild "Expected identifier but found (" → résolu en supprimant le doublon
  - Déployé et vérifié fonctionnel en production (JSON-LD présent, accordéons opérationnels)

### Backend / Contact
- [x] Table Supabase `demandes_contact_site` : `id`, `created_at`, `nom`, `email`, `telephone`, `organisation`, `profil`, `message`, `traite`
- [x] **Notification email des demandes de contact** — Edge Function `notify-contact-request`, déclenchée par Database Webhook (INSERT sur `demandes_contact_site`)
  - Tentative initiale SMTP direct vers IONOS (`smtp.ionos.fr`, ports 587 puis 465) → **échec systématique (timeout)**
  - Diagnostic réseau confirmé : IONOS bloque les IP sortantes de Supabase (Gmail/Office365 passent en 4ms depuis la même fonction, IONOS timeout à chaque fois)
  - Bascule vers **API Resend** (HTTPS, jamais bloqué) : domaine `age-qc.com` vérifié (DKIM, SPF, MX), envoi depuis `contact@age-qc.com` → **fonctionnel, testé et validé**
  - Fonction de diagnostic temporaire `diagnose-smtp` créée puis **supprimée** après usage

### Hébergement & domaine
- [x] **Migration Vercel → IONOS Deploy Now** effectuée
  - Pack "Adhésion + projet statique" (1 Go, 5 stages)
  - Build : `cd site && npm install` puis `cd site && npm run build`
  - Publish directory : `site/dist`
  - Variables d'environnement (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`) configurées dans IONOS
  - Déploiement continu opérationnel (push sur `main` → build auto)
  - Confirmé : pas de fonctions serverless Vercel côté plateforme principale (`vercel.json` = simple rewrite SPA, pas de dossier `api/`, pas de dépendance `@vercel/*`) — migration plateforme principale possible sans réécriture de code
- [x] **Domaine `age-qc.com` connecté au projet IONOS Deploy Now** (13/07/2026)
  - Panne de 4 jours (10 → 13/07) : `ERR_SSL_PROTOCOL_ERROR` sur apex ET www
  - Cause racine : l'apex était rattaché en DNS personnalisé (enregistrement A manuel vers `217.160.0.102`) à un autre produit IONOS (`Hébergement Web Plus`, vide/jamais configuré), pas au projet Deploy Now
  - Résolu via **"Force domain connect"** dans Deploy Now → Domain
  - Site accessible en HTTPS sur apex et www, certificat SSL valide (confirmé en navigation privée)

### SEO
- [x] SEO technique : sitemap (`@astrojs/sitemap`), `robots.txt` confirmés en prod (13/07/2026) — `robots.txt` autorise l'exploration et référence `sitemap-index.xml` → `sitemap-0.xml` correctement
- [x] Meta-description personnalisée sur chaque page (accueil, `/solutions`, 4 pages solutions, 6 pages `/vous-etes/*`, `/a-propos`, `/contact`) — via prop `description` sur `<Layout>`, testé sans régression (13/07/2026)
- [x] Balises Open Graph / Twitter Card ajoutées dans `Layout.astro` (`og:title`, `og:description`, `og:image`, `twitter:card`) + `<link rel="canonical">`
- [x] Image `/public/images/og-default.jpg` (1200×630px) créée et déployée — aperçu de partage (WhatsApp, LinkedIn) testé et fonctionnel (13/07/2026)
- [x] Données structurées schema.org (`Organization`) ajoutées en JSON-LD dans `Layout.astro` — nom, url, description, `sameAs` (LinkedIn : `https://www.linkedin.com/company/greenage-assets-services/`), `logo` pointant vers `/images/og-default.jpg` (en attendant un vrai logo carré dédié au schema, distinct du logo header)
- [x] **Google Search Console configuré (15/07/2026)** : propriété type **Domaine** créée pour `age-qc.com`, vérifiée par enregistrement TXT DNS chez IONOS ; sitemap `sitemap-index.xml` soumis, statut **Réussite** ; indexation de la homepage demandée manuellement via Inspection de l'URL
- [x] **Schema.org FAQPage sur les articles blog (15/07/2026)** — voir section "Blog & Actualités — GEO/AEO" ci-dessus

### Bouton Connexion / plateforme (17/07/2026)
- [x] **Bug identifié** : clic sur "Connexion" → `DNS_PROBE_FINISHED_NXDOMAIN`. Cause : le sous-domaine `app.age-qc.com` n'a pas d'enregistrement DNS chez IONOS et/ou n'est pas configuré comme domaine custom côté Vercel (plateforme principale)
- [x] **Solution provisoire appliquée** : lien du bouton "Connexion" dans `Header.astro` redirigé de `https://app.age-qc.com` vers `/bientot-disponible` (desktop + mobile), en attendant l'ouverture de la plateforme
- [x] Page `/bientot-disponible` créée en amont pour porter cette redirection (voir section Pages)

## Reste à faire

- [ ] `/tarifs`
- [ ] **CGU** — 3ème page légale, footer y fait déjà référence dans le plan mais pas encore créée/liée
- [ ] Remplacer la vidéo hero placeholder par une vidéo définitive
- [ ] Décider du sort de `DecayCurve.astro` (réutiliser en séparateur ou supprimer si non utilisé)
- [ ] Logo intégré dans le header (`Header.astro`, remplace le texte "AGE-QC") — **statut à reconfirmer** :
  - Fichier reçu du PO sans vraie transparence (damier "imprimé" dans le PNG, pas un canal alpha) → reconstruit avec transparence réelle + rogné (texte noir `#111111` sur fond alpha 0)
  - Piège rencontré : fichier commité sous le nom `logo.png` alors que le patch initial référençait `logo-header.png` → 404 → corrigé en alignant `Header.astro` sur `logo.png`
  - Dernier push : remplacement du fichier `logo.png` par la version avec vraie transparence — **non revérifié visuellement depuis** (à valider au prochain démarrage de session : net, fond transparent, `height: 28px`)
- [ ] Correction footer : "AGEcarbone" (typo/incohérence signalée le 13/07, statut de commit non revérifié)
- [ ] Images des pages solutions (convention `ageprevention-1.jpg` etc. dans `public/images/solutions/`, pas encore téléchargées)
- [ ] Décommissionner le projet Vercel une fois `age-qc.com` confirmé stable sur IONOS (garder en fallback quelques jours)

### Plateforme / connexion — suite (nouveau, 17/07/2026)
- [ ] **Configurer `app.age-qc.com`** quand la plateforme sera prête à ouvrir : enregistrement CNAME `app` chez IONOS pointant vers Vercel + ajout du domaine custom `app.age-qc.com` dans les paramètres du projet Vercel
- [ ] **Remettre le bouton "Connexion" vers `https://app.age-qc.com`** une fois le DNS et Vercel configurés (actuellement pointe vers `/bientot-disponible` en solution provisoire — voir section Fait)
- [ ] Vérifier si `/bientot-disponible` doit être dépubliée/redirigée une fois la plateforme ouverte, ou conservée pour d'autres usages

### Blog & Actualités — suite
- [ ] Rédiger de nouveaux articles blog (calendrier proposé : 1 par quinzaine, mix pédagogique / data propriétaire / persona) — **penser à ajouter le champ `faq` dès la rédaction pour les nouveaux articles**
- [ ] Vérifier et renforcer le maillage interne blog ↔ pages `/vous-etes/*` et `/solutions/*`
- [ ] Page équipe / expertise (E-E-A-T) — auteur actuellement toujours "Hubert Roche", envisager une page bio dédiée liée depuis les articles
- [ ] Ajouter des images de couverture aux articles blog (champ `image` du schéma déjà prêt, non utilisé pour l'instant)

### GEO/AEO — suite (15/07/2026)
- [ ] Ajouter une section FAQ (avec schema.org `FAQPage`) sur les pages `/vous-etes/*` et `/solutions/*`, au-delà des seuls articles blog
- [ ] Ajouter un paragraphe de "réponse directe" en ouverture de chaque page `/vous-etes/*` (2-3 phrases autonomes répondant à la question implicite du persona), format pyramide inversée pour favoriser l'extraction par les LLM
- [ ] Vérifier que `robots.txt` n'exclut pas les robots IA (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`) — a priori ouvert par défaut (aucune règle spécifique), à confirmer explicitement
- [ ] Mesure de visibilité IA : tester mensuellement 5-10 prompts sectoriels sur ChatGPT/Perplexity/Claude (ex. "outil évaluation risque climatique immobilier France") pour suivre l'apparition d'AGE-QC dans les réponses
- [ ] (Optionnel, plus tard) Renforcer l'autorité de marque hors site : présence sur annuaires professionnels immobilier/climat, presse spécialisée — les LLM recoupent plusieurs sources avant de citer

## Sécurité — actions de suivi

- [ ] **Révoquer le token d'accès Supabase** généré et collé en clair pendant la session du 10/07 (`sbp_f78a35d5...`) → régénérer un nouveau token personnel
- [ ] **Révoquer/régénérer la clé API Resend** collée en clair pendant la session du 10/07 (`re_UK5hfaUC...`)

## Suivi compte IONOS — à nettoyer

- Le compte IONOS possède plusieurs produits d'hébergement créés par erreur en plus de Deploy Now : `IONOS Hébergement Web Plus` (contrat 300187340) et `IONOS MyWebsite Now Plus` (contrat 300187397), tous deux **vides/jamais configurés**. Le domaine `age-qc.com` était rattaché par erreur à `Hébergement Web Plus`, ce qui bloquait le SSL sur l'apex et le www.
- Il existe aussi un **deuxième projet "Deploy Now Static L Project"** (contrat 300187418) dont l'usage n'a pas encore été vérifié.
- [ ] Vérifier si `Hébergement Web Plus` et `MyWebsite Now Plus` sont facturés inutilement → envisager résiliation si confirmés inutilisés
- [ ] Identifier l'usage réel du second projet Deploy Now (300187418)

## Notes techniques (pièges déjà rencontrés)

- **Fichier ajouté en local mais jamais poussé** : un fichier créé/copié dans `public/` (ou ailleurs) reste "untracked" tant qu'un `git add` explicite n'est pas fait — `git commit -m "..."` seul ne l'inclut pas automatiquement. Toujours vérifier `git status` après ajout d'un nouvel asset avant de pousser, sinon 404 en prod silencieux.
- **Cache des aperçus de partage (WhatsApp/Facebook/LinkedIn)** : ces plateformes mettent en cache l'aperçu Open Graph par URL exacte, parfois plusieurs jours, surtout si un scan a eu lieu avant que les balises soient correctes (ex. pendant une panne SSL). Pour forcer un nouveau scan : Facebook Sharing Debugger (nécessite compte) ou LinkedIn Post Inspector. Sans compte, tester avec une variante d'URL (`?ref=test1`) contourne le cache pour valider que le mécanisme fonctionne.
- Le dossier `site/` n'est **pas** dans le `pnpm-workspace.yaml` racine → toujours utiliser `npm install` / `npm run dev` dans `site/`, jamais `pnpm`
- Windows masque les extensions de fichiers par défaut → piège du double-extension. Activer "Extensions de noms de fichiers" avant de renommer un fichier média
- Un nouveau fichier dans `public/` pendant que `astro dev` tourne peut nécessiter un redémarrage serveur
- **Casse des noms de fichiers Windows vs Linux** : Windows est insensible à la casse (`layout.astro` == `Layout.astro`), le build Linux d'IONOS/GitHub Actions ne l'est pas → toujours vérifier la casse exacte des imports contre le nom réel du fichier sur GitHub
- **`.ts` sur Windows** : associé par défaut à un lecteur vidéo (Transport Stream), pas à un éditeur de code → ne jamais double-cliquer un fichier `.ts` téléchargé, toujours éditer via VS Code directement
- **SMTP sortant IONOS bloqué depuis Supabase Edge Functions** (confirmé par diagnostic réseau, tous ports testés) → utiliser une API HTTPS (Resend) plutôt que SMTP direct pour toute notification email déclenchée depuis Supabase
- **Supabase CLI sur poste AzureAD/entreprise** : le token de session `supabase login` ne persiste pas toujours entre les commandes → si erreur "Access token not provided" malgré une connexion réussie, utiliser `set SUPABASE_ACCESS_TOKEN=<token personnel généré sur le dashboard>` pour la session du terminal
- **Secrets contenant des caractères spéciaux** (`!`, `&`, etc.) : `cmd` Windows peut casser la commande même avec des guillemets → passer par un fichier temporaire (`notepad secrets.env` → `supabase secrets set --env-file secrets.env` → `del secrets.env`)
- **IONOS Deploy Now sur un monorepo** : bien préciser le sous-dossier (`site/`) dans les commandes de build (`cd site && ...`) puisque le projet Astro n'est pas à la racine du repo
- **Database Webhooks Supabase** : nécessitent l'extension `pg_net` activée (Database → Extensions) — sans elle, erreur PostgreSQL `3F000` (schéma invalide) à la création du webhook
- **Domaine IONOS multi-produits** : si un domaine est ajouté par erreur en "Paramètres DNS personnalisés" à un autre produit IONOS (Hébergement Web Plus, MyWebsite), Deploy Now ne peut pas le connecter tant qu'on n'utilise pas "Force domain connect" — toujours vérifier au préalable qu'aucun contenu actif n'est présent sur l'autre produit avant de forcer
- **Astro Content Collections — piège du fichier fantôme** (rencontré 2× le 15/07) : un fichier `.md` créé par erreur directement dans `src/pages/blog/` ou `src/pages/actualites/` (au lieu de `src/content/blog/` / `src/content/actualites/`) est traité par Astro comme une page Markdown autonome, sans layout ni `<head>`. Comme cette route statique est prioritaire sur la route dynamique `[slug].astro`, la page correspondante se rend sans header/footer/CSS, **sans aucune erreur visible côté serveur ni dans le terminal**. Toujours vérifier `dir src/pages/<collection>/` : seuls `index.astro` et `[slug].astro` doivent y figurer.
- **`mkdir` en cmd Windows peut échouer silencieusement** en laissant un fichier vide (0 octet) au lieu de créer un dossier, si un fichier du même nom existait déjà à cet emplacement. Toujours vérifier avec `dir` (présence de `<DIR>` sur les lignes `.` et `..`) juste après une création de dossier, avant d'y écrire quoi que ce soit.
- **Encodage UTF-8 corrompu (mojibake)** : un fichier `.astro` ou `.md` sauvegardé avec un mauvais encodage (symptôme : caractères du type `ÔÇö`, `├®`, `┬À` à la place des accents/tirets/apostrophes typographiques) peut faire échouer **silencieusement** le rendu du `<Layout>` parent — la page ne renvoie que le fragment de contenu, sans erreur dans le terminal `npm run dev`. Vérifier l'encodage affiché en bas à droite de VS Code (doit être "UTF-8", jamais "UTF-8 with BOM" ni "Windows 1252"). Par prudence, éviter les caractères typographiques spéciaux (—, →, ·) dans le code des composants `.astro` ; les réserver au contenu Markdown qui passe par un pipeline de rendu plus tolérant.
- **Mode lecture du navigateur (Edge "Mode Lecture" / Immersive Reader)** peut se déclencher automatiquement sur une page et donner l'illusion d'un bug CSS grave (aucun style, header/footer absents, police serif par défaut). Signe distinctif : l'URL commence par `read://` et une barre d'outils "Lire à haute voix / Traduire / Résumer" apparaît. Toujours vérifier l'URL avant de diagnostiquer un vrai bug de rendu.
- **`git status` peut afficher `deleted:` sur un chemin de dossier** (ex. `src/content/blog`) alors que le contenu réel n'a jamais été perdu — cela arrive quand Git a stagé ce chemin comme fichier à un moment antérieur (ex. avant la conversion fichier→dossier suite au piège `mkdir` ci-dessus). Vérifier avec `git diff --cached --stat` : une ligne à `0` insertion/suppression sur ce chemin confirme qu'il s'agit d'un artefact d'affichage sans perte de données.
- **Toujours relire `git status` avant un `git add -A` en fin de session** : une erreur de copier-coller de bloc CSS peut écraser le style d'une page non concernée (ex. le CSS du blog collé par erreur dans `src/pages/solutions/index.astro` le 15/07, repéré via `git diff` puis annulé avec `git restore`).
- **Duplication de ligne JSX lors d'un patch collé manuellement** (rencontré 15/07 sur `[slug].astro`) : coller un bloc de remplacement peut laisser une ligne dupliquée si la sélection de l'ancien bloc n'était pas exacte (ex. `{(post.data.persona?.length || post.data.solution) && (` dupliquée deux fois de suite) → erreur esbuild `Expected identifier but found "("` au build, sans indication claire de la ligne fautive dans le message d'erreur au-delà du numéro de ligne. Toujours relire la zone patchée après collage, pas seulement se fier au diff visuel rapide.
- **Sous-domaine `app.age-qc.com` non résolu (`DNS_PROBE_FINISHED_NXDOMAIN`, rencontré 17/07)** : le sous-domaine de la plateforme principale n'a pas d'enregistrement DNS chez IONOS tant qu'il n'est pas explicitement configuré (CNAME `app` → Vercel) + ajouté comme domaine custom dans le projet Vercel. Ne pas confondre avec un bug de code : le bouton "Connexion" du site vitrine était fonctionnel, c'est la cible qui n'existait pas encore en DNS.

## Workflow de session (identique à la plateforme principale)

1. Lire ce fichier en début de session
2. Poser les questions de cadrage avant de produire du code
3. Ne cocher une case qu'après confirmation explicite du PO
4. Fin de session : mettre à jour ce fichier + fournir les commandes Git