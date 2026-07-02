# BACKLOG — AGE Climate Platform
> Source de vérité du suivi de développement · Mis à jour à chaque session Claude
> Format statut : `[ ]` À faire · `[~]` En cours · `[x]` Terminé

**Dernière mise à jour :** 02/07/2026
**Rapport de référence :** Session 02/07/2026 — P3-14 clos (5 points de test validés par le PO), fiche module AGEadapt passée en v1.1 (enrichie PNACC3 + guides DGE/ADEME), corrections Niveau 1 (intégrité des données) et Niveau 2 (accessibilité RGAA) appliquées sur les 3 fichiers AGEadapt existants, gouvernance socle « Climate Change » actée (portée limitée aux nouveaux éléments Brown Value/AGEadapt, aucune rétroaction sur le code existant).

---

## BUGS BLOQUANTS

| ID | Environnement | Description | Statut |
|----|--------------|-------------|--------|
| BUG-01 | Espace particulier | `.single()` → `.maybeSingle()` sur `profils` | `[x]` 25/06/2026 |
| BUG-02 | Supabase / BDD | CHECK constraint `actifs.type_client` | `[x]` 25/06/2026 |
| BUG-03 | Espace particulier | Fallback `georisques_data` manquant | `[x]` 25/06/2026 |
| BUG-04 | B2B / Campagnes | Erreurs 406 sur `profils` dans `loadDemandesClient` | `[x]` 26/06/2026 |
| BUG-05 | B2B / Brown Value | `brown_value_cases.bien_id` recevait `actif_id` au lieu de `actif_id` (FK pointe vers `biens`, pas `actifs`) | `[x]` 30/06/2026 |
| BUG-06 | B2B / Clients | `Clients.tsx` ouvrait un drawer local au lieu de naviguer vers `/metier/clients/:id` | `[x]` 30/06/2026 |
| BUG-07 | B2B / FicheClient | `demandes_marketplace` interrogée avec colonne `titre` inexistante (réelle : `type_prestation`) — causait des 400 sur l'onglet Demandes | `[x]` 30/06/2026 |
| BUG-08 | B2B / Mandats | `sauvegarder()` dans `Mandats.tsx` exécutait `.neq('id', editId ?? '')` → `id=neq.` invalide en création, causait des 400/409 silencieux | `[x]` 30/06/2026 |
| BUG-09 | B2B / Brown Value | `BrownValueWizard.tsx` interrogeait `mandats.bien_id = actifId` pour débloquer le contexte post-travaux — erreur de conception, les mandats ne concernent que les particuliers (table `biens`), jamais les actifs B2B | `[x]` 30/06/2026 |
| BUG-10 | B2B / Analytics | `Analytics.tsx` sélectionnait `actifs.nom_site` (colonne inexistante, réelle : `nom`) | `[x]` 30/06/2026 |
| BUG-11 | B2B / Analytics | `Analytics.tsx` dépendait de `mandats.date_fin_travaux` pour apparier les scores avant/après — même erreur de conception que BUG-09, logique remplacée par comparaison directe des `brown_value_cases` (premier `initial` finalisé / dernier `post_travaux` finalisé) | `[x]` 30/06/2026 |
| BUG-12 | B2B / Client | `MesCampagnes.tsx` : `load()` avait perdu la déclaration `const { data: { user } } = await supabase.auth.getUser()`, causant `ReferenceError: user is not defined` — détecté et corrigé pendant le test P3-15 | `[x]` 01/07/2026 |

---

## PRIORITÉ 1 — Bloquant pour commercialisation Essential

| ID | Module | Description | Statut |
|----|--------|-------------|--------|
| P1-01 | RLS multi-tenant | `client_id` + policies 5 tables | `[x]` 26/06/2026 |
| P1-02 | M04 — Import portefeuille | Wizard 4 étapes CSV/Excel | `[x]` 26/06/2026 |
| P1-03 | M07 — Pipeline contacts campagne | Table `contacts_campagne` + kanban | `[x]` 26/06/2026 |
| P1-04 | M02 — Fiche client structurée | `organisations` enrichie + `FicheClient.tsx` | `[x]` 26/06/2026 |
| P1-05 | Factures.tsx — champs manquants | IBAN/BIC confirmés présents | `[x]` 25/06/2026 |

---

## PRIORITÉ 2 — Nécessaire pour formule Pro

| ID | Module | Description | Fichier(s) | Statut |
|----|--------|-------------|------------|--------|
| P2-01 | FicheDossierRGA | Liste + fiche + pipeline + documents + IA | `DossiersRGA.tsx` · `FicheDossierRGA.tsx` | `[x]` 26/06/2026 |
| P2-02 | M06 — Pré-diagnostic IA | `PreDiagDrawer` + Edge Function | `PreDiagDrawer.tsx` · `generate-rapport` | `[x]` 26/06/2026 |
| P2-03 | M08 — Publipostage | Modèles email/courrier + export CSV Brevo + PDF | `Publipostage.tsx` · `ModelesComm.tsx` | `[x]` 29/06/2026 |
| P2-04 | M09 — Qualification contacts | `QualificationDrawer` · alertes 48h kanban | `QualificationDrawer.tsx` · `CampagnePipeline.tsx` | `[x]` 29/06/2026 |
| P2-05 | M10 — RDV consultant | Agenda calendrier semaine/mois + compte rendu | `RDVConsultant.tsx` | `[x]` 29/06/2026 |
| P2-06 | M12 — Mandat | CERFA 17596*01 RGA + Yousign (lien manuel) | `Mandats.tsx` | `[x]` 29/06/2026 |
| P2-07 | M05 — Versioning scores | Historique + graphique Recharts + alertes seuil | `ScoreHistorique.tsx` | `[x]` 29/06/2026 |
| P2-08 | M11 — GED généraliste | Versioning v1/v2/v3 + vue arborescence + catégories étendues | `GED.tsx` | `[x]` 29/06/2026 |
| P2-09 | M13 — Analytics ROI | LGD réduite (banque) — formule, migration, UI et test fonctionnel **complets** | `Analytics.tsx` · `FormBienFinance.tsx` · `BrownValueWizard.tsx` · `Clients.tsx` · `FicheClient.tsx` · `brownValueEngine.ts` | `[x]` 30/06/2026 |

### Détail P2-09 — test fonctionnel réalisé
1. ✅ Compilation + navigation `Clients.tsx`/`FicheClient.tsx` (page dédiée)
2. ✅ Configuration LGD/encours sur l'actif "Martin" (client banque@test.fr)
3. ✅ Scénario complet post-travaux : 1 calcul `contexte=initial` + 1 calcul `contexte=post_travaux`, méthode DCF, comparatif visible
4. ✅ `Analytics.tsx` calcule correctement la LGD réduite — nouvel onglet "Analytics ROI" ajouté dans `FicheClient.tsx`
5. `[ ]` Export Excel du module Brown Value — toujours un placeholder, hors périmètre LGD, identifié en P3

### Évolutions du moteur Brown Value réalisées pendant le test P2-09
- `brownValueEngine.ts` : ajout du paramètre `ignorerCoutsAdaptation` sur `calculerHazard()`/`calculerBrownValue()`. Quand `contexte = 'post_travaux'`, les coûts d'adaptation (`coutAdaptation`) des aléas marqués "Adaptation réalisée" sont exclus du calcul de décote (sunk cost déjà engagé par le propriétaire, ne doit pas alourdir la décote pour un acheteur futur). Comportement automatique, pas d'action manuelle requise du consultant.
- Ajout d'un bandeau comparatif "Avant / Après travaux" à l'étape 5 du wizard, affiché automatiquement si un calcul `initial` finalisé existe déjà pour l'actif.
- **Point de vigilance pédagogique identifié :** le bouton "Nouveau calcul" réinitialise **tous** les champs aux valeurs par défaut, y compris la méthode finale (repasse à `MAX`). Le consultant doit impérativement resélectionner la méthode "DCF" à chaque nouveau calcul s'il veut que les aléas influencent réellement le résultat (sinon la méthode MAX peut masquer l'effet des travaux derrière le plancher "Décote Marché" fixe). À documenter dans l'aide contextuelle du wizard — non fait, à inscrire en P3.

---

## PRIORITÉ 3 — Roadmap Enterprise / LOT 2

| ID | Module | Description | Statut |
|----|--------|-------------|--------|
| P3-01 | AGEadapt | ACT Adaptation scoring — matrice maturité 5 niveaux, notation 0→1 par indicateur (v1.2) | `[ ]` |
| P3-02 | AGEadapt | Cartographie aléas par site — Géorisques + TRACC + Climadiag Entreprise Météo-France (v1.3) | `[ ]` |
| P3-03 | B2B | Analyse portefeuille agrégée + SIG (Brown Value v1.3) | `[ ]` |
| P3-04 | B2B | Stress tests GIEC — RCP 4.5/8.5 + Monte-Carlo (v2.0) | `[ ]` |
| P3-05 | B2B | Reporting CSRD/IFRS S2 | `[ ]` |
| P3-06 | B2B | APIs climatiques avancées | `[ ]` |
| P3-07 | B2B | Module subventions | `[ ]` |
| P3-08 | Tous | SSO entreprise + audit RGPD + responsive mobile | `[ ]` |
| P3-09 | B2B | Green Value | `[ ]` |
| P3-10 | B2B | Saisie manuelle de score (hors Brown Value/Géorisques) dans `FicheBien.tsx` | `[ ]` |
| P3-11 | B2B | Module Sinistres évités € (assureur) — pendant du module LGD pour profil assureur, formule à définir | `[ ]` |
| P3-12 | B2B | Export Excel Brown Value (placeholder actuel) | `[ ]` |
| P3-13 | B2B | Retirer le bouton "Créer un mandat" ajouté par erreur sur `FicheBien.tsx` (espace B2B) | `[ ]` — **décision 01/07/2026 : PO souhaite conserver le bouton, retrait annulé pour l'instant**, item laissé ouvert au cas où la position serait revue |
| P3-14 | B2B / Finance | **Repositionnement Brown Value sous Finance** — voir détail ci-dessous | `[x]` 02/07/2026 |
| P3-15 | B2B / Client | **Suppression de campagnes/demandes côté client** — voir détail ci-dessous | `[x]` 01/07/2026 |
| P3-16 | B2B / Admin | **Outil de purge en masse côté Administration** — permettre à l'admin de supprimer en bloc les campagnes, demandes (`demandes_marketplace`) et messages (`messages`) provenant des profils clients, avec effet global sur les vues responsable régional et consultant (données partagées, RLS différente selon rôle, donc une suppression admin doit se répercuter partout). À spécifier précisément avant code : scope exact des tables, DELETE vs soft delete, double confirmation (action destructive), restriction au rôle `admin`/`admin_national` uniquement. Peut désormais s'appuyer sur les colonnes `archivee`/`archivee_at` introduites par P3-15 sur `campagnes` et `demandes_marketplace`. | `[ ]` |
| P3-17 | B2B / Données | **Nettoyage des données de test à grande échelle** — voir détail ci-dessous | `[x]` 01/07/2026 |
| P3-18 | AGEadapt | Upload bilan existant réel (composant + parsing PDF/Excel ORKI, §4.3) — `ageadapt_bilans_imports` créée en base mais jamais utilisée par le code actuel | `[ ]` |
| P3-19 | AGEadapt | Écran de gestion `ageadapt_actions` (plan de transition/actions) — dépendance directe du KPI « tCO₂e évitées » et de l'ancrage PNACC3 §4.8, table créée mais aucun écran de saisie/lecture | `[ ]` |
| P3-20 | AGEadapt | Champs Bloc A/D manquants au wizard — Entreprise : `chiffre_affaires_tranche`, `regions_implantation[]`, `demarche_iso14001`, `reporting_csrd_scope` ; Collectivité : `type_epci`, `population_tranche`, `nb_communes`, `zones_exposees[]`, `infrastructure_critique[]`, `budget_adaptation_prevu` | `[ ]` |
| P3-21 | AGEadapt | Export Excel simulateur tarifaire (`format=xlsx`, §6 — seul PDF est implémenté aujourd'hui) | `[ ]` |
| P3-22 | AGEadapt | Tests unitaires sur la formule tarifaire §4.1, jeux de validation dérivés du tableau `base_j` — obligatoire au socle, absent à ce jour | `[ ]` |
| P3-23 | AGEadapt | Rapport IA enrichi — sortie JSON structurée du prompt `generate-rapport` + rendu graphique (matrice probabilité×intensité, radar de criticité, cartes de recommandation avec timeline) rattaché à la v2.0 déjà prévue en fiche (« rapport pré-diagnostic via Claude API »). Gabarit visuel cible : rapport « Pierre Fabre Médicament » fourni le 02/07/2026 (gabarit uniquement, pas de contenu par défaut) | `[ ]` |
| P3-24 | AGEadapt | Police Unicode embarquée dans jsPDF (`AGEadaptFiche.tsx`) — remplace la désaccentuation actuelle des libellés PDF, contraire à la règle socle « libellés repris mot pour mot » | `[ ]` |

### Détail P3-14 — Brown Value sous Finance (clos)

**Fait le 01/07/2026 :**
- `BrownValueSimulation.tsx` créé (`src/pages/metier/`) — 3 points d'entrée : sélection d'actif existant, saisie libre d'adresse, import CSV multi-adresses (parsing local dédié, colonnes `nom`/`adresse`/`code_postal`/`ville`/`valeur_marche`, aucune écriture dans `biens`/`actifs` — **distinct** du wizard P1-02 qui persiste réellement des actifs)
- `BrownValueWizard.tsx` (`src/components/`) étendu : 4 nouvelles props optionnelles (`nomBien`, `adresse`, `codePostal`, `ville`) pour les dossiers sans `actif_id`, `sauvegarderCase()` les persiste dans `brown_value_cases`, `onClose` signature changée en `(completed: boolean) => void` pour piloter la boucle séquentielle CSV
- Écran **Historique** : liste des 50 derniers dossiers (avec ou sans `actif_id`), colorimétrie d'impact net réutilisée depuis `brownValueEngine.ts` (`getImpactNetStyle`)
  - **Voir** : détail dossier + décomposition par aléa (lecture seule)
  - **Modifier** : réouvre le wizard complet si `actif_id` présent ; formulaire dédié aux 4 champs libres sinon (pas de recalcul pour les dossiers sans actif)
  - **Import PDF justificatif** : upload vers le bucket Storage `documents-clients` (réutilisé depuis `GED.tsx`), chemin `brown-value/{caseId}/{timestamp}_{nom_sanitizé}`, lecture via `createSignedUrl`
- `Layout.tsx` : nouveau lien "Brown Value" dans `FinanceMenu` (icône Lucide `Home`, seule exception à l'usage de Tabler Icons dans ce fichier — décision actée) ; `FinanceMenu` et `ProspectionMenu` ouverts au rôle `consultant` (auparavant réservés à `admin_national`/`responsable_regional`) ; sous-item `Facturation` ouvert à `consultant` en plus de `admin_national` (reste fermé à `responsable_regional`, asymétrie actée mais non revalidée)
- `App.tsx` : route `metier/brown-value` → `BrownValueSimulation.tsx`
- Migration exécutée : `ALTER TABLE brown_value_cases ADD COLUMN IF NOT EXISTS pdf_justificatif_path TEXT;`

**Limites MVP assumées (non bloquantes, à documenter) :**
- Le mode CSV ne remonte pas les résultats (`impact_net`, `valeur_ajustée`) par ligne — récap final = simple compteur de simulations finalisées, pas de tableau de synthèse par adresse
- Les dossiers sans `actif_id` ne sont pas rouvrables dans le wizard complet (le chargement `chargerDernierCase()` ne fonctionne que par `actifId`) — seule l'édition des champs libres est possible

**Validé par le PO le 02/07/2026** — 5 points de test confirmés : 3 modes de saisie (actif existant / adresse libre / import CSV), écran Historique (Voir/Modifier/Import PDF), retrait effectif de l'onglet Brown Value dans `FicheBien.tsx`.

**Reste hors périmètre P3-14 (reporté) :**
- Export Excel (placeholder, cf. P3-12)
- Barème scientifique chiffré "type de travaux → % réduction de risque" — toujours bloqué (cf. notes techniques 30/06/2026, ni Bat-ADAPT OID v4 ni le modèle AHP quantique RGA ne le fournissent), `reductionRisque` reste en saisie manuelle libre

### Détail P3-15 — Suppression côté client (clos)

- **Décision :** soft delete via colonne `archivee` (boolean) + `archivee_at` (timestamp), alignée sur le pattern déjà existant dans `BiensCampagnes.tsx` — pas de nouvelle convention introduite (correction par rapport à une première proposition `archived_at` écartée après relecture du code existant).
- **Migration exécutée** : `demandes_marketplace.archivee` (`NOT NULL DEFAULT false`) + `archivee_at`, index sur `archivee`. Rien à migrer sur `campagnes` (colonnes déjà présentes, déjà utilisées par `BiensCampagnes.tsx`).
- **`MesCampagnes.tsx`** (`client/Campagnes.tsx`) : `supprimerCampagne()` (hard delete) remplacée par `archiverCampagne()` (update `archivee`/`archivee_at`). Bouton d'archivage désormais visible quel que soit le statut de la campagne (restriction `statut === "soumise"` levée à la demande du PO). Filtrage `archivee = false` ajouté au chargement.
- **`ClientDemandes.tsx`** : nouvelle fonction `archiverDemande()`, bouton conditionnel masqué si `statut ∈ {en_cours, terminee}` (dossier déjà pris en charge, non archivable par le client). Filtrage `archivee = false` ajouté au chargement.
- **Confirmation utilisateur** : `window.confirm()` natif, cohérent avec le pattern déjà en place dans `BiensCampagnes.tsx`.
- **Bug de régression corrigé pendant le test (BUG-12)** : `load()` de `MesCampagnes.tsx` avait perdu la déclaration `const { data: { user } } = await supabase.auth.getUser()` (perte antérieure aux patchs de cette session), causant `ReferenceError: user is not defined`. Restaurée.
- **Validé par le PO** le 01/07/2026 après application des patchs et correction du bug de régression.

### Détail P3-17 — Nettoyage des données de test (clos)

Investigation complète menée le 01/07/2026, conclusions à l'opposé de l'hypothèse initiale de duplication massive :

- **Client `93312474...`** (Commerce Pau, Bureau Lyon, Résidence Bayonne, Mairie de Dax, Immeuble Toulouse, Villa Biarritz, Maison Mont-de-Marsan, Entrepôt Nantes, Maison Albi, Appartement Bordeaux Centre — 4 occurrences chacun) : **pas des doublons**. Les 4 séries correspondent à **4 campagnes réellement distinctes** (`RGA_TEST_GIRONDE`, `CAMPAGNE SCORING CLIMATE JUIN 2026`, `ALEAS DU CLIMAT`, `NARBONE RGA`), chacune avec son propre jeu de 10 actifs. **Aucune suppression** — conservées telles quelles.
- **Client `d35a4a58...`** (ATLANDIS, LALMI, LEROY, MARTY, NINJA, SAVI) : **pas des doublons** non plus — chaque nom appartient à l'une de 2 campagnes distinctes (`TEST`, `CAMPAGNE CASTRES`), un exemplaire par campagne. Conservés intacts.
- **DURAND** sous `d35a4a58...` : seul cas de doublon réel confirmé — 2 paires strictement identiques (écart de création < 1s, incompatible avec un import manuel, signature d'un bug de double-soumission du wizard d'import). **2 lignes supprimées** (`0d49556e-79a8-41d1-b00b-8d7a32ccf15f`, `15d31760-09b4-4ea2-9e0f-c91cb3d28210`), une par campagne conservée.
- **`biens_finances.actif_id`** (banque@test.fr) : routage temporaire restauré vers l'actif réel `3b6b113e-c02d-4bda-a915-b26dbc64cae1`. Les `brown_value_cases` de test sur `2b9fe3b6-00f5-4a51-b122-5ceaeeaea413` sont **conservés** comme référence de test documentée, décorrélés de banque@test.fr.

**Point d'attention pour la prochaine session d'import test :** le doublon DURAND (double-soumission, écart sub-seconde) suggère un bug potentiel du wizard d'import CSV (P1-02) — confirmé comme cause probable également du risque identifié sur `AGEadaptMission.tsx` (cf. notes techniques 02/07/2026), corrigé sur ce dernier via `.insert().select().single()`.

### Détail — Module AGEadapt : passage v1.0 → v1.1 et corrections Niveau 1/2 (session 02/07/2026)

**Fiche module mise à jour.** `FICHE_MODULE_AGEadapt` passe de v1.0 à **v1.1**, enrichie de 4 nouveaux référentiels (guide DGE/ADEME adaptation entreprises, guide bonnes pratiques entreprises, PNACC3, tableau des 52 mesures), d'un questionnaire de qualification entreprise enrichi (3 catégories de risques × 3 horizons temporels), et d'un ancrage réglementaire PNACC3 sur les fiches actions. Aucun code n'existait encore pour ce module au moment de la révision — la mise à jour de fiche a précédé, comme il se doit, tout développement.

**Gouvernance socle actée (02/07/2026) :** un nouveau socle technique « Climate Change » (couleur Brown Value `#B25C2A`, forest AGEadapt `#2F7D5C`, Lucide exclusif) a été transmis. **Décision explicite du PO : ce socle s'applique uniquement aux nouveaux éléments strictement liés aux modules Brown Value et AGEadapt, sans rétroaction sur le code existant.** En particulier, Tabler Icons reste la convention de fait sur l'espace métier historique (règle 15 inchangée), et le vert `#0F6E56` reste la couleur primaire du design system `AGE Climate Platform` existant.

**Niveau 1 — corrections d'intégrité des données** (`AGEadaptMission.tsx`) :
- Perte de données de l'étape 4 (Cadrage mission) corrigée : `form.risques` (3 catégories), `horizon_2030/40/50`, `mesure_33/40/41`, `tracc_utilisee` étaient saisis mais jamais envoyés à l'insert — désormais transformés et transmis vers les colonnes JSONB/TEXT[] correspondantes (§7 fiche v1.1).
- Formule de montant par phase non conforme à la référence §4.1 corrigée : `Math.round(ph1j * TJM)` → `Math.round(ph1j * TJM / 100) * 100` (arrondi à la centaine, écart vérifié de 2 850 € vs 2 900 € sur un cas simple).
- Récupération fragile de l'ID mission après insert (requête de recherche séparée par `raison_sociale`+`siren`) remplacée par `.insert().select().single()` — élimine un risque de double-soumission de même nature que celui déjà identifié sur le doublon DURAND (P3-17).

**Chantier transversal (`region_code`, icônes)** — appliqué sur `AGEadaptMission.tsx`, `AGEadaptFiche.tsx`, `AGEadapt.tsx` :
- Nouveau fichier `src/lib/ageadaptRegions.ts` : référentiel des 13 régions administratives françaises avec codes INSEE, fonction `regionCodeFromNom()`. `region_code` était systématiquement `NULL` jusqu'ici alors que la policy RLS `responsable_regional` filtre exclusivement dessus — sans ce correctif, aucun responsable régional n'aurait jamais vu aucune mission AGEadapt. Le select région, limité à 5 options (dont "Autre"), est passé aux 13 régions complètes pour rendre le mapping fiable partout.
- Bascule complète Tabler → Lucide sur les 3 fichiers (module neuf, aucune dette héritée contrairement à Brown Value) : `Sparkles`, `Info`, `Calculator`, `BadgeCheck`, `Settings`, `Shield`, `TrendingDown`.
- Libellés d'aléas passés aux intitulés complets §4.7 (ex. « Vagues de chaleur / stress thermique / îlot de chaleur » au lieu de « Vagues de chaleur »), conformément à la règle socle « libellés repris mot pour mot ».
- `form.aleas` (couverture de mission, étape 2) et `form.aleas_identifies` (exposition déjà documentée, étape 4 collectivité) séparés en deux champs distincts, conformes à §4.5 Bloc B. **Migration exécutée** : `ALTER TABLE ageadapt_missions ADD COLUMN IF NOT EXISTS aleas_identifies TEXT[] DEFAULT '{}';`

**`rapport_ia` → table versionnée** (`AGEadaptFiche.tsx`) :
- Nouvelle table `ageadapt_rapports_ia` (mission_id, created_at, created_by, contenu) créée, sur le modèle de `risk_scores` (Brown Value) plutôt qu'une colonne unique écrasée à chaque génération — historique des générations conservé.
- **Incident de migration résolu :** le script initial (`CREATE TABLE` + `CREATE POLICY` ×2) a échoué sur un second passage (`42P07: relation already exists`), ce qui a interrompu l'exécution avant les policies. RLS était activé sans aucune policy — accès totalement bloqué (pas une faille de sécurité, l'inverse). Diagnostiqué via `information_schema.columns`, `pg_policies`, `pg_class.relrowsecurity`, puis policies recréées isolément et vérifiées. Table opérationnelle depuis.
- Couleur `#1A3A5F` (bouton Rapport IA, en-têtes des 2 exports PDF), non référencée dans aucune palette du socle ni de la fiche, remplacée par Sky `#0369A1`.

**Architecture — décision actée :** AGEadapt reste sur le pattern déjà en place partout ailleurs sur la plateforme (accès direct Supabase depuis React + RLS), sans introduire de couche `/api/ageadapt/...` malgré la prescription du socle §Architecture cible. Écart assumé, sur le même principe que l'exception déjà actée pour Tabler/Brown Value (règle 15).

**Niveau 2 — accessibilité RGAA** (3 fichiers) :
- Nouveau fichier utilitaire `src/lib/a11y.ts` : `clickableCardProps()` (role="button", tabIndex, onKeyDown Entrée/Espace) et `focusRing()` (contour 2 px couleur du module, Forest `#2F7D5C`), pour éviter la duplication sur les cards cliquables.
- Cards navigables au clavier : méthode, aléa (×2 listes), maturité, horizon (`AGEadaptMission.tsx`, 5 cards) ; liste des missions (`AGEadapt.tsx`, 1 card).
- Labels de formulaire associés via `htmlFor`/`id` : 6 champs étape 1 + 8 checkboxes (`AGEadaptMission.tsx`), 6 selects du mode édition (`AGEadaptFiche.tsx`).
- KPI « tCO₂e évitées » (`AGEadapt.tsx`) : valeur en dur (`'3 240'`) remplacée par une requête réelle `SUM(ageadapt_actions.gain_ges_tco2e)` — retournera 0 tant qu'aucune action n'est saisie (P3-19, aucun écran de saisie n'existe encore), décision assumée plutôt que de garder une valeur inventée.

**Reporté en roadmap (P3-23, P3-24), non traité dans cette session :**
- Rapport IA enrichi (JSON structuré + rendu visuel façon matrice/radar/recommandations) — gabarit visuel cible fourni (rapport « Pierre Fabre Médicament », 02/07/2026), rattaché à la v2.0 déjà prévue en fiche.
- Police PDF Unicode dans `AGEadaptFiche.tsx` — désaccentuation actuelle conservée avec `// TODO` explicite référençant la règle socle violée.

---

## RÉALISÉ — Fonctionnalités confirmées en production

| Environnement | Fonctionnalité | Date |
|--------------|----------------|------|
| B2B | GED versioning — v1/v2/v3, vue arborescence par actif, catégories étendues | 29/06/2026 |
| B2B | Versioning scores — `ScoreHistorique.tsx`, graphique Recharts interactif, alertes seuil | 29/06/2026 |
| B2B | Mandats CERFA RGA — workflow 3 étapes, génération PDF, cycle brouillon→envoyé→signé→annulé | 29/06/2026 |
| B2B | Agenda RDV — calendrier semaine/mois, drawer création/détail, compte rendu | 29/06/2026 |
| B2B | Sidebar réorganisée — Prospection (Campagnes · Dossiers RGA · Mandats · Agenda RDV · Publipostage · Modèles comm.) | 29/06/2026 |
| B2B | Qualification contacts — historique, badges alerte 48h | 29/06/2026 |
| B2B | Publipostage — modèles email/courrier, export CSV Brevo | 29/06/2026 |
| B2B + Particulier | Pré-diagnostic IA | 26/06/2026 |
| Particulier | DossiersRGA + FicheDossierRGA | 26/06/2026 |
| B2B | Fiche client structurée | 26/06/2026 |
| B2B | Import portefeuille CSV | 26/06/2026 |
| B2B / Tous | RLS multi-tenant | 26/06/2026 |
| B2B | Pipeline contacts campagne | 26/06/2026 |
| B2B | Brown Value — historisation des calculs (`contexte` initial/suivi/post_travaux, `finalise`), export PDF, repositionnement auto étape 5 | 30/06/2026 |
| B2B | Fiche client (`profils_client`) — page dédiée `/metier/clients/:id`, 6 onglets dont Financement | 30/06/2026 |
| B2B | **Module LGD réduite (P2-09) complet et testé** — formule validée, calcul Brown Value initial/post-travaux fonctionnel, bandeau comparatif Avant/Après dans le wizard, onglet Analytics ROI dans `FicheClient.tsx`, exclusion automatique des coûts d'adaptation déjà engagés pour le contexte post-travaux | 30/06/2026 |
| B2B / Finance | **Brown Value repositionné sous Finance** — nouvelle page `BrownValueSimulation.tsx` (3 points d'entrée), écran Historique (Voir/Modifier/Import PDF), sidebar Finance/Prospection ouverte au rôle consultant | 01/07/2026 |
| B2B / Données | **Nettoyage données de test (P3-17)** — investigation complète, 2 doublons réels supprimés (DURAND), routage `biens_finances` restauré, aucune campagne légitime supprimée par erreur | 01/07/2026 |
| B2B / Client | **Suppression campagnes/demandes côté client (P3-15)** — soft delete `archivee`/`archivee_at`, cohérent avec pattern existant, migration `demandes_marketplace`, patchs `MesCampagnes.tsx` et `ClientDemandes.tsx`, fix régression `ReferenceError` associé | 01/07/2026 |
| B2B / Finance | **Brown Value sous Finance — validé PO (P3-14 clos)** — 5 points de test fonctionnel confirmés (3 modes de saisie, Historique, retrait onglet FicheBien.tsx) | 02/07/2026 |
| AGEadapt | **Fiche module passée v1.0 → v1.1** — enrichissement PNACC3 + guides DGE/ADEME, questionnaire qualification entreprise enrichi, ancrage réglementaire fiches actions | 02/07/2026 |
| AGEadapt | **Corrections Niveau 1 (intégrité des données)** — perte de données étape 4 corrigée, formule montant par phase conforme §4.1, insert mission sécurisé (`.insert().select().single()`) | 02/07/2026 |
| AGEadapt | **`region_code` opérationnel** — mapping 13 régions/codes INSEE (`ageadaptRegions.ts`), écran RLS `responsable_regional` désormais fonctionnel | 02/07/2026 |
| AGEadapt | **Bascule Lucide complète** sur les 3 fichiers existants (module neuf, sans dette héritée) | 02/07/2026 |
| AGEadapt | **Rapport IA — table versionnée `ageadapt_rapports_ia`** créée, RLS activée et vérifiée (policies read/write) | 02/07/2026 |
| AGEadapt | **Corrections Niveau 2 (accessibilité RGAA)** — cards navigables au clavier (`a11y.ts`), labels associés, focus visible couleur module, KPI tCO₂e évitées connecté à une requête réelle | 02/07/2026 |

---

## NOTES TECHNIQUES — Session 30/06/2026

### ⚠️ Confirmation définitive — `mandats` ne concerne QUE les particuliers
- `mandats.bien_id` → FK vers `biens(id)` uniquement (`ON DELETE SET NULL`). **Aucune** colonne `actif_id` n'existe sur la table `mandats`.
- Les mandats CERFA 17596*01 RGA concernent exclusivement les clients particuliers éligibles aux aides RGA (propriétaire occupant), jamais les actifs B2B.
- Toute tentative de rattacher un mandat à un `actifs.id` échoue en violation de contrainte FK (23503 / 409 Conflict) — observé et corrigé en session (cf. BUG-09, BUG-11).
- **Conséquence design** : si un mécanisme de déclenchement "post-travaux" doit exister côté B2B (Brown Value/LGD), il doit être autonome et ne jamais dépendre de la table `mandats`. C'est désormais le cas : le contexte `post_travaux` du wizard Brown Value est sélectionnable librement par le consultant, sans condition.

### ⚠️ Piège méthode finale Brown Value — `MAX` peut masquer l'effet des travaux
- Avec `methodeFinale = "MAX"`, le moteur retient `Math.max(decoteDCFCapee, decoteMarche)`. Si `decoteMarche` (= `decoteMarcheCible% × V`, fixe et indépendante des aléas) est supérieure à la décote DCF réelle calculée à partir des aléas, c'est elle qui s'applique systématiquement — rendant tout ajustement des aléas (ex. travaux réalisés) invisible sur le résultat final.
- Pour tester ou démontrer l'effet de travaux d'adaptation, la méthode **DCF** doit être sélectionnée explicitement (pas MAX, pas Pondérée avec un poids DCF trop faible).
- Le bouton "Nouveau calcul" du wizard réinitialise **tous** les champs aux valeurs par défaut (`INPUTS_DEFAUT`), y compris la méthode (repasse à `MAX`) — à reconfigurer manuellement à chaque nouveau calcul. Source de confusion potentielle pour les consultants, non documenté dans l'aide contextuelle.

### ⚠️ Coûts d'adaptation et contexte post-travaux — correctif appliqué
- Avant correctif : cocher "Adaptation réalisée" sur un aléa ajoutait systématiquement `coutAdaptation` (coût one-off, ex. 8000€ par défaut sur RGA) à la décote totale, via `npvAdaptationsTotal`. Pour un calcul `post_travaux`, ce coût est un sunk cost déjà payé par le propriétaire — il ne doit pas alourdir la décote vue par un acheteur potentiel.
- Correctif : `calculerHazard()`/`calculerBrownValue()` acceptent désormais un paramètre `ignorerCoutsAdaptation`, automatiquement activé (`true`) quand `contexteFinalisation === "post_travaux"` dans `BrownValueWizard.tsx`. Le champ "Coût adaptation (€)" reste saisissable à l'étape 3 mais n'impacte plus le calcul en contexte post-travaux.

### Référentiels scientifiques consultés pour le barème travaux (P3-14)
- **OID Bat-ADAPT v4** (`OID__02_2026__Referentiel_scientifique_et_technique_Bat-ADAPT.pdf`) : catalogue de 44 recommandations d'actions adaptatives par aléa (12 actions pour Sécheresses et RGA), mais utilise une échelle qualitative de favorabilité ("+" à "+++++") basée sur un coefficient de réponse 0-5, **pas** un % de réduction de risque chiffré. Section IV.6.6 "Calcul de la vulnérabilité [RGA]" explicitement marquée "Indisponible. En cours de construction" dans le document source.
- **Modèle AHP quantique RGA interne** (`Ponderation_RGA_Quantique_completee_VF_02.xlsx`) : grille de pondération de 53 variables de **vulnérabilité** (diagnostic amont, échelle ordinale 0-3), pas un catalogue de travaux correctifs avec effet chiffré (en aval). La variable V49 "Coût des travaux de prévention" ne contient que des tranches de coût, sans effet de réduction associé.
- **Conclusion** : aucune source actuellement disponible dans le projet ne permet de construire un barème "type de travaux → % réduction" sans inventer des coefficients. Décision prise : saisie manuelle libre du consultant, barème automatique reporté en attente de données scientifiques fiables ou d'un barème interne AGE validé par les experts métier.

### Suppression de données côté client/admin (P3-15, P3-16)
- P3-15 clos le 01/07/2026 (voir détail ci-dessus).
- P3-16 reste ouvert — peut désormais s'appuyer sur les colonnes `archivee`/`archivee_at` introduites par P3-15, ce qui simplifie le cadrage (filtrage par ce statut plutôt qu'un nouveau mécanisme).

---

## NOTES TECHNIQUES — Session 01/07/2026

### Arborescence de fichiers confirmée pour Brown Value
- `BrownValueWizard.tsx` → `src/components/` (pas `src/pages/`) — utilise `../lib/supabase`
- `BrownValueSimulation.tsx` → `src/pages/metier/` — utilise donc `../../lib/supabase` et `../../components/BrownValueWizard`
- Bucket Storage documents : `documents-clients` (confirmé via `GED.tsx`), chemin GED existant `ged/{userId}/{actifId|"general"}/{timestamp}_{nomSanitize}`, lecture via `createSignedUrl` (bucket privé)

### Écart volontaire au socle — bibliothèque d'icônes
- Le socle workplace impose Lucide exclusivement, mais `Layout.tsx` et l'ensemble des pages de l'espace métier (`FicheBien.tsx`, `MesCampagnes.tsx`, `ClientDemandes.tsx`, `BiensCampagnes.tsx`...) utilisent Tabler Icons (`ti ti-*`) de façon homogène. Décision actée : le nouveau lien Brown Value dans `FinanceMenu` utilise Lucide (`Home`) malgré la rupture de cohérence visuelle avec le reste du fichier — à surveiller si d'autres liens Lucide s'ajoutent au même menu (cohérence à réévaluer alors). Pour tout nouveau composant de l'espace métier existant, conserver Tabler par cohérence avec le code déjà en place plutôt que d'imposer Lucide rétroactivement.

### Piège TypeScript — `key` sur un composant personnalisé
- Poser `key={x}` directement sur un composant fonctionnel typé (`<BrownValueWizard key={csvIndex} ... />`) a provoqué une erreur TS2322 (« la propriété 'key' n'existe pas sur le type Props ») dans l'environnement du PO, cause probable non confirmée (résolution `pnpm why`/diagnostics terminal impossible côté PO). **Contournement appliqué** : déplacer `key` sur un `<div>` englobant plutôt que sur le composant lui-même — évite la vérification de type stricte tout en conservant le même effet de remontage. À garder en tête pour tout futur composant nécessitant un `key` dynamique dans ce projet.

### Import CSV dédié Brown Value ≠ Import portefeuille P1-02
- `ImportPortefeuille.tsx` n'est pas réutilisable tel quel pour un besoin de simulation sans persistance : c'est une page autonome qui écrit réellement dans `biens`/`actifs` et gère déduplication + rattachement campagne. Le mode CSV de `BrownValueSimulation.tsx` réimplémente un parsing dédié (même lib `papaparse`, 5 colonnes) sans toucher à `biens`/`actifs`, cohérent avec la décision de dossiers `brown_value_cases` sans `actif_id`/`bien_id`. Ne pas chercher à unifier les deux sans revalider ce choix.

### Convention de soft delete confirmée — `archivee` / `archivee_at`
- Pattern déjà en place sur `campagnes` (via `BiensCampagnes.tsx`), étendu à `demandes_marketplace` lors de P3-15. **Ne pas** introduire une variante `archived_at`/`is_archived` sur une future table nécessitant ce mécanisme (ex. P3-16) — rester sur `archivee` (boolean, `NOT NULL DEFAULT false`) + `archivee_at` (timestamp nullable).

---

## NOTES TECHNIQUES — Session 02/07/2026

### Gouvernance socle « Climate Change » — portée limitée
- Un socle technique transverse (identité visuelle, architecture cible, conventions de code) a été transmis pour l'ensemble de la workplace « Climate Change » (Brown Value, AGEadapt, futurs modules Green Value/Portefeuille/GIEC/CSRD). **Décision PO actée le 02/07/2026 : ce socle s'applique uniquement aux nouveaux éléments strictement liés aux modules concernés, jamais rétroactivement au code existant.** Tabler Icons reste la convention de fait sur l'espace métier historique (règle 15), le vert `#0F6E56` reste la couleur primaire du design system `AGE Climate Platform` existant.
- Le socle prescrit également une couche API REST (`/api/{module}/...`) avec recalcul serveur d'audit. Ni Brown Value ni AGEadapt ne l'implémentent (accès direct Supabase + RLS partout) — écart assumé pour AGEadapt par décision explicite du 02/07/2026, sur le même principe que l'écart déjà acté sur les icônes.

### AGEadapt — `region` vs `region_code`, piège à deux colonnes
- Comme pour d'autres tables de la plateforme (cf. `actifs.client_id` vs `organisations.id`), `ageadapt_missions` a deux colonnes proches mais non interchangeables : `region` (libellé libre, ex. "Nouvelle-Aquitaine") et `region_code` (code INSEE, utilisé exclusivement par la policy RLS `responsable_regional`). Toujours renseigner les deux via `regionCodeFromNom()` (`src/lib/ageadaptRegions.ts`) lors de tout insert/update sur cette table.

### AGEadapt — incident de migration `ageadapt_rapports_ia`
- Un script combinant `CREATE TABLE` + 2×`CREATE POLICY` a échoué au second essai (`42P07: relation already exists`), ce qui a empêché l'exécution des `CREATE POLICY` du même script. Résultat : RLS activé, table vide de toute policy → accès totalement bloqué (aucune ligne lisible ni inscriptible, y compris pour les admins). Diagnostic en 3 étapes : `information_schema.columns` (structure), `pg_policies` (policies), `pg_class.relrowsecurity` (RLS actif ou non). **Réflexe à conserver** : après toute erreur `42P07` sur un script combiné CREATE TABLE + policies, toujours vérifier explicitement les policies avant de considérer la table opérationnelle.

### AGEadapt — icônes Lucide, écart assumé avec l'espace métier historique
- Contrairement à Brown Value (qui hérite de code déjà écrit majoritairement en Tabler, avec une seule exception Lucide actée dans `FinanceMenu`), AGEadapt est un module neuf sans dette héritée : bascule Lucide complète et sans exception sur les 3 fichiers existants. Ne pas confondre avec la tolérance Tabler actée pour l'espace métier historique (règle 15) — les deux modules suivent des règles différentes pour une raison de contexte, pas d'incohérence.

---

## INSTRUCTIONS POUR CLAUDE

1. Lire ce fichier en premier.
2. `[ ]` → `[x]` + date à la confirmation explicite du PO uniquement.
3. Toujours `TO authenticated` + `'admin'` ET `'admin_national'` dans les policies RLS.
4. Vérifier le schéma réel en base avant toute migration (ne pas supposer les noms de colonnes — cf. piège `nom_site` vs `nom`, `titre` vs `type_prestation`, `archived_at` vs `archivee`/`archivee_at`).
5. `contacts_campagne` n'a pas de colonnes prenom/nom/email.
6. `FicheBien.tsx` utilise la table `actifs`, pas `biens` — vigilance sur les noms de props.
7. `brown_value_cases` et `risk_scores` sont deux systèmes de score indépendants — ne jamais supposer de lien entre eux.
8. Le module client réel est `profils_client`, pas `organisations` — voir notes techniques 30/06/2026 avant tout travail touchant à l'identité client.
9. **`mandats` ne concerne JAMAIS les actifs B2B** — `bien_id` pointe uniquement vers `biens` (particuliers). Ne jamais réintroduire une dépendance entre un module B2B et la table `mandats`.
10. Avant tout nouveau calcul Brown Value destiné à comparer un effet (ex. avant/après travaux), toujours vérifier que la **méthode finale** est explicitement réglée sur **DCF** — le bouton "Nouveau calcul" réinitialise systématiquement à `MAX`.
11. Pour les tests sur données réelles, toujours vérifier l'UUID exact de l'actif manipulé (`SELECT id, nom FROM actifs WHERE nom ILIKE '%X%'`) avant de lancer une série de calculs — plusieurs actifs peuvent partager le même nom **sous des clients différents sans que ce soit un doublon** (cf. P3-17 — ne jamais supprimer un actif sans vérifier au préalable ses `campagnes_actifs` liées, un même nom peut légitimement appartenir à plusieurs campagnes distinctes).
12. `BrownValueWizard.tsx` est dans `src/components/`, `BrownValueSimulation.tsx` dans `src/pages/metier/` — vérifier les chemins relatifs (`../lib/...` vs `../../lib/...`) avant toute modification touchant l'un ou l'autre.
13. Éviter de poser `key` directement sur un composant personnalisé typé si une erreur TS2322 apparaît — préférer un wrapper `<div key={...}>`.
14. Soft delete = colonnes `archivee` (boolean) + `archivee_at` (timestamp), jamais `archived_at`/`is_archived` — cf. pattern `BiensCampagnes.tsx`/P3-15.
15. Tabler Icons (`ti ti-*`) reste la convention de fait sur l'ensemble de l'espace métier existant, malgré le socle workplace qui prescrit Lucide — ne pas migrer rétroactivement sans demande explicite du PO.
16. Le socle technique « Climate Change » (couleurs, Lucide, architecture API REST) transmis le 02/07/2026 s'applique **uniquement** aux nouveaux éléments strictement liés à Brown Value et AGEadapt — jamais rétroactivement au reste du code. Ne pas généraliser ce socle à d'autres modules sans demande explicite.
17. AGEadapt : `region` (libellé) et `region_code` (code INSEE) sont deux colonnes distinctes sur `ageadapt_missions` — la policy RLS `responsable_regional` filtre uniquement sur `region_code`. Toujours renseigner les deux via `regionCodeFromNom()` (`src/lib/ageadaptRegions.ts`) lors de tout insert/update.
18. AGEadapt utilise Lucide exclusivement (module neuf, sans dette héritée) — ne pas confondre avec la tolérance Tabler actée pour l'espace métier historique (règle 15). Les deux modules suivent des conventions d'icônes différentes, volontairement.
19. Après toute erreur `42P07` (relation already exists) sur un script combinant `CREATE TABLE` + `CREATE POLICY`, toujours vérifier explicitement `pg_policies` et `pg_class.relrowsecurity` avant de considérer la table opérationnelle — un script interrompu peut laisser RLS activé sans aucune policy (accès totalement bloqué, cf. `ageadapt_rapports_ia`).
20. AGEadapt : `form.aleas` (couverture de mission) et `form.aleas_identifies` (exposition déjà documentée par le client, collectivités) sont deux champs distincts sur `ageadapt_missions` — ne pas les fusionner.