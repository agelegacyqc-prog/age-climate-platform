# BACKLOG — AGE Climate Platform
> Source de vérité du suivi de développement · Mis à jour à chaque session Claude
> Format statut : `[ ]` À faire · `[~]` En cours · `[x]` Terminé

**Dernière mise à jour :** 29/06/2026  
**Rapport de référence :** Session 29/06/2026 — P2-03 terminé · Publipostage + Modèles comm. + bloc Prospection sidebar

---

## BUGS BLOQUANTS — À corriger en priorité absolue

| ID | Environnement | Description | Fichier(s) concerné(s) | Statut |
|----|--------------|-------------|------------------------|--------|
| BUG-01 | Espace particulier | `.single()` → `.maybeSingle()` sur `profils` pour utilisateurs particuliers — erreur 406 bloque l'accès | `Onboarding.tsx` — condition `typeClient !== "proprietaire"` ajoutée | `[x]` 25/06/2026 |
| BUG-02 | Supabase / BDD | CHECK constraint `actifs.type_client` : `'particulier'` rejeté — migrer la contrainte pour inclure `'particulier'` | Migration SQL `ALTER TABLE actifs` | `[x]` 25/06/2026 |
| BUG-03 | Espace particulier | Fallback manquant pour actifs sans `georisques_data` — affichage vide sans message d'erreur | `FicheActifParticulier.tsx` — bandeau orange + gestion try/catch + accolade `charger()` corrigée | `[x]` 25/06/2026 |
| BUG-04 | B2B / Campagnes | Erreurs 406 sur `profils` dans `loadDemandesClient` — `.single()` sans garde sur `client_id` null | `Campagnes.tsx` — remplacer `.single()` par `.maybeSingle()` + guard `client_id` null | `[x]` 26/06/2026 |

---

## PRIORITÉ 1 — Bloquant pour commercialisation Essential

| ID | Environnement | Module | Description | Fichier(s) à créer / modifier | Statut |
|----|--------------|--------|-------------|-------------------------------|--------|
| P1-01 | B2B / Tous | RLS multi-tenant | `client_id` ajouté dans `biens` et `dossiers` · policies réécrites sur 5 tables (`biens`, `campagnes`, `dossiers`, `actifs`, `documents`) · isolation stricte par tenant | Migrations SQL exécutées · policies vérifiées en base | `[x]` 26/06/2026 |
| P1-02 | B2B | M04 — Import portefeuille | Wizard 4 étapes · choix cible biens/actifs · mode libre/campagne · upload CSV/Excel · auto-mapping · prévisualisation 20 lignes · déduplication adresse+CP · toggle ignorer/MAJ · bilan résultat · bouton "Importer CSV" dans Portefeuille.tsx · redirection correcte selon cible | `ImportPortefeuille.tsx` · `Portefeuille.tsx` · `App.tsx` | `[x]` 26/06/2026 |
| P1-03 | B2B | M07 — Pipeline contacts campagne | Table `contacts_campagne` (11 statuts) créée + RLS + index · Page kanban `CampagnePipeline.tsx` + route `/metier/campagnes/:id/pipeline` · Boutons Pipeline dans tableau et drawer `Campagnes.tsx` · Validé visuellement | Migration SQL · `CampagnePipeline.tsx` · `Campagnes.tsx` · `App.tsx` | `[x]` 26/06/2026 |
| P1-04 | B2B | M02 — Fiche client structurée | Table `organisations` enrichie (code_naf, effectifs, nb_sites, ca_tranche, notes_consultant) · siren/siret corrigés en TEXT · index sur biens/campagnes/dossiers.client_id · `FicheClient.tsx` avec vue consolidée (nb biens, campagnes, dossiers, score moyen) + 3 onglets (Identité / Contact / Notes) + édition inline | `src/pages/metier/FicheClient.tsx` · Migration SQL organisations · `App.tsx` | `[x]` 26/06/2026 |
| P1-05 | AGEadapt | Factures.tsx — champs manquants | Ajouter `numero_client`, `iban`, `bic`, `nom_banque` dans le formulaire (colonnes BDD déjà créées) | Déjà présents dans le formulaire — section "Coordonnées bancaires" confirmée | `[x]` 25/06/2026 |

---

## PRIORITÉ 2 — Nécessaire pour formule Pro

| ID | Environnement | Module | Description | Fichier(s) à créer / modifier | Statut |
|----|--------------|--------|-------------|-------------------------------|--------|
| P2-01 | Particulier | FicheDossierRGA | Vue consultant côté espace métier — liste `DossiersRGA.tsx` + fiche `FicheDossierRGA.tsx` · pipeline 4 statuts · dates clés · financement/travaux · upload documents bucket `documents-rga` · bouton Pré-diagnostic IA · sidebar Environnement | `src/pages/metier/DossiersRGA.tsx` · `FicheDossierRGA.tsx` · `Layout.tsx` · `App.tsx` | `[x]` 26/06/2026 |
| P2-02 | B2B + Particulier | M06 — Pré-diagnostic IA | Edge Function `generate-rapport` enrichie (case `prediag`) · `PreDiagDrawer.tsx` réutilisable · intégration `FicheDossierRGA` + `FicheBien` · export PDF HTML → nouvelle fenêtre · fix upload `documents-rga` (nom fichier sanitizé, type_fichier CHECK, signed URL) | `PreDiagDrawer.tsx` · `generate-rapport/index.ts` · `FicheDossierRGA.tsx` · `FicheBien.tsx` | `[x]` 26/06/2026 |
| P2-03 | B2B | M08 — Publipostage | Éditeur modèles email/courrier + variables de fusion + export CSV Brevo · tables `modeles_comm` + `publipostage_exports` · RLS corrigé (`admin` + `authenticated`) · bloc Prospection sidebar · `consultant_id` injecté à la création | `Publipostage.tsx` · `ModelesComm.tsx` · `Layout.tsx` · `App.tsx` · Migration SQL | `[x]` 29/06/2026 |
| P2-04 | B2B | M09 — Qualification contacts | Formulaire qualification (Chaud/Tiède/Froid) + alertes relance 48h + historique | `src/pages/metier/Qualification.tsx` · table `qualifications` | `[ ]` |
| P2-05 | B2B | M10 — RDV consultant | Agenda consultant + création RDV + statuts + compte rendu + notification email | `src/pages/metier/RDVConsultant.tsx` · table `rendez_vous` | `[ ]` |
| P2-06 | B2B | M12 — Mandat | Génération mandat depuis modèle Word + lien Yousign externe + cycle de vie statuts | `src/pages/metier/Mandats.tsx` · table `mandats` | `[ ]` |
| P2-07 | B2B | M05 — Versioning scores | Table `risk_scores` avec historique par actif (chaque recalcul = nouveau enregistrement) | Migration SQL `risk_scores` · `FicheBien.tsx` | `[ ]` |
| P2-08 | B2B | M11 — GED généraliste | Interface GED générique (hors contexte RGA) avec versioning v1/v2 par document | `src/pages/metier/GED.tsx` · extension table `documents` | `[ ]` |
| P2-09 | B2B | M13 — Analytics ROI | Calculs LGD réduite + sinistres évités € dans le dashboard analytique | `src/pages/metier/Analytics.tsx` · formules DCF/LGD | `[ ]` |

---

## PRIORITÉ 3 — Roadmap Enterprise / LOT 2

| ID | Environnement | Module | Description | Statut |
|----|--------------|--------|-------------|--------|
| P3-01 | AGEadapt | ACT Adaptation scoring | Moteur notation 0→1 par indicateur, matrice maturité 5 niveaux (v1.2) | `[ ]` |
| P3-02 | AGEadapt | Cartographie aléas GPS | Climadiag Entreprise, DRIAS, TRACC par site (v1.3) | `[ ]` |
| P3-03 | B2B | Analyse portefeuille agrégée | Multi-clients + cartographie SIG (Brown Value v1.3) | `[ ]` |
| P3-04 | B2B | Stress tests GIEC | Scénarios RCP 4.5/8.5 + Monte-Carlo (Brown Value v2.0) | `[ ]` |
| P3-05 | B2B | Reporting CSRD/IFRS S2 | Export auditable CSRD / Taxonomie européenne (LOT 2 M23) | `[ ]` |
| P3-06 | B2B | APIs climatiques avancées | BRGM + Géorisques + Météo-France auto-enrichissement (LOT 2 M14) | `[ ]` |
| P3-07 | B2B | Module subventions | Fonds Barnier, Fonds Vert, ADEME + marketplace experts (LOT 2 M17/M18) | `[ ]` |
| P3-08 | Tous | SSO entreprise + audit RGPD | SSO multi-tenant + journal `audit_log` complet + responsive mobile | `[ ]` |
| P3-09 | B2B | Green Value | Moteur green premium / valeur ajustée adaptation (Workplace v1.1) | `[ ]` |

---

## RÉALISÉ — Fonctionnalités confirmées en production

| Environnement | Fonctionnalité | Date |
|--------------|----------------|------|
| B2B | Publipostage — `Publipostage.tsx` + `ModelesComm.tsx` + tables `modeles_comm` / `publipostage_exports` + bloc Prospection sidebar | 29/06/2026 |
| B2B + Particulier | Pré-diagnostic IA — `PreDiagDrawer` + Edge Function `generate-rapport` case prediag | 26/06/2026 |
| Particulier | DossiersRGA liste + FicheDossierRGA — pipeline, documents, upload bucket | 26/06/2026 |
| B2B | Portefeuille visible dans sidebar métier (admin + responsable_régional) | 26/06/2026 |
| Client | Onglet Climatique verrouillé côté client — CTA mission AGE | 26/06/2026 |
| B2B | Fiche client structurée — `organisations` enrichie + `FicheClient.tsx` + vue consolidée | 26/06/2026 |
| B2B | Import portefeuille CSV — wizard 4 étapes, déduplication, bilan résultat | 26/06/2026 |
| B2B / Tous | RLS multi-tenant — `client_id` dans `biens` + `dossiers` · 5 tables sécurisées | 26/06/2026 |
| B2B | Pipeline contacts campagne — table `contacts_campagne` + kanban `CampagnePipeline.tsx` | 26/06/2026 |
| AGEadapt | Workflow qualification mission 5 étapes (entreprise + collectivité) | Avant 25/06/2026 |
| AGEadapt | Simulateur tarifaire (6 critères, export PDF) | Avant 25/06/2026 |
| AGEadapt | Rapport IA via Edge Function + Anthropic API | Avant 25/06/2026 |
| AGEadapt | Dashboard KPIs missions | Avant 25/06/2026 |
| AGEadapt | Factures v2 (SQL + RLS + TVA + export PDF jsPDF) | Avant 25/06/2026 |
| Particulier | Pipeline RGA complet (Accueil / DossierRGA / Documents / FicheActif / NouvelActif) | Avant 25/06/2026 |

---

## NOTES TECHNIQUES — Session 29/06/2026

### Publipostage — points clés
- Tables `modeles_comm` + `publipostage_exports` créées avec RLS
- RLS policies : cibler `authenticated` (pas `public`) — pattern validé
- Policy INSERT : ne pas exiger `consultant_id` dans WITH CHECK — l'injecter côté front via `supabase.auth.getUser()`
- Rôle `admin` (rétrocompatibilité) doit être inclus dans toutes les policies aux côtés de `admin_national`
- Export CSV Brevo : UTF-8 BOM (`\uFEFF`) pour compatibilité Excel/Brevo
- Export PDF courrier : génération HTML multi-pages → `window.open` → `window.print()`
- Variables de fusion : `.split(token).join(value)` (pas `.replaceAll` — lib cible TS trop ancienne)

### Architecture BDD réelle (vérifiée en base)
- Tables prod : `biens`, `campagnes`, `dossiers`, `actifs`, `documents`, `campagnes_actifs`, `campagnes_suivi_biens`, `contacts_campagne`, `organisations`, `modeles_comm`, `publipostage_exports`
- `organisations.siren` et `siret` : corrigés de `character` → `text`
- Liaison clients : `biens.client_id` + `campagnes.client_id` + `dossiers.client_id` + `contacts_campagne.client_id` → `organisations.id`
- Pas de FK formelle (intentionnel — évite les contraintes sur inserts sans client_id)
- Import supabase dans les pages métier : `../../lib/supabase` (sans "Client")
- Bucket `documents-rga` : private · policies RLS authenticated · noms de fichiers sanitizés · `type_fichier` CHECK : pdf/csv/xlsx/autre · URLs signées

### Pattern RLS validé
```sql
-- Toujours cibler TO authenticated (pas public)
-- Toujours inclure 'admin' ET 'admin_national' pour rétrocompatibilité
EXISTS (SELECT 1 FROM profils p WHERE p.id = auth.uid()
  AND p.role IN ('admin', 'admin_national', ...))
```

### Prochaine priorité
**P2-04** — Qualification contacts (M09)

---

## INSTRUCTIONS POUR CLAUDE

> À lire au début de chaque session de développement.

1. **Lire ce fichier en premier** pour connaître l'état exact du backlog.
2. Pour marquer un ticket terminé : passer `[ ]` → `[x]` et ajouter la date en note.
3. Pour marquer en cours : passer `[ ]` → `[~]`.
4. Après chaque session, générer la version mise à jour de ce fichier.
5. Ne jamais supposer qu'un ticket est terminé sans confirmation explicite du Product Owner.
6. Les bugs BUG-xx sont prioritaires sur tout ticket P1.
7. Ne pas démarrer P2 avant que toutes les P1 soient terminées.
8. Toujours vérifier le schéma réel en base (`information_schema`) avant de produire des migrations.
9. Toujours inclure `'admin'` ET `'admin_national'` dans les policies RLS (rétrocompatibilité).
10. Ne jamais cibler `public` dans les policies RLS — toujours `authenticated`.