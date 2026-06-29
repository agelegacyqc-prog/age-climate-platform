# BACKLOG — AGE Climate Platform
> Source de vérité du suivi de développement · Mis à jour à chaque session Claude
> Format statut : `[ ]` À faire · `[~]` En cours · `[x]` Terminé

**Dernière mise à jour :** 29/06/2026  
**Rapport de référence :** Session 29/06/2026 — P2-03 ✅ P2-04 ✅ · Sidebar réorganisée · Prospection consolidée

---

## BUGS BLOQUANTS

| ID | Environnement | Description | Fichier(s) concerné(s) | Statut |
|----|--------------|-------------|------------------------|--------|
| BUG-01 | Espace particulier | `.single()` → `.maybeSingle()` sur `profils` | `Onboarding.tsx` | `[x]` 25/06/2026 |
| BUG-02 | Supabase / BDD | CHECK constraint `actifs.type_client` | Migration SQL | `[x]` 25/06/2026 |
| BUG-03 | Espace particulier | Fallback `georisques_data` manquant | `FicheActifParticulier.tsx` | `[x]` 25/06/2026 |
| BUG-04 | B2B / Campagnes | Erreurs 406 sur `profils` dans `loadDemandesClient` | `Campagnes.tsx` | `[x]` 26/06/2026 |

---

## PRIORITÉ 1 — Bloquant pour commercialisation Essential

| ID | Environnement | Module | Description | Statut |
|----|--------------|--------|-------------|--------|
| P1-01 | B2B / Tous | RLS multi-tenant | `client_id` + policies 5 tables | `[x]` 26/06/2026 |
| P1-02 | B2B | M04 — Import portefeuille | Wizard 4 étapes CSV/Excel | `[x]` 26/06/2026 |
| P1-03 | B2B | M07 — Pipeline contacts campagne | Table `contacts_campagne` + kanban | `[x]` 26/06/2026 |
| P1-04 | B2B | M02 — Fiche client structurée | `organisations` enrichie + `FicheClient.tsx` | `[x]` 26/06/2026 |
| P1-05 | AGEadapt | Factures.tsx — champs manquants | IBAN/BIC confirmés présents | `[x]` 25/06/2026 |

---

## PRIORITÉ 2 — Nécessaire pour formule Pro

| ID | Environnement | Module | Description | Fichier(s) | Statut |
|----|--------------|--------|-------------|------------|--------|
| P2-01 | Particulier | FicheDossierRGA | Liste + fiche + pipeline + documents + IA | `DossiersRGA.tsx` · `FicheDossierRGA.tsx` | `[x]` 26/06/2026 |
| P2-02 | B2B + Particulier | M06 — Pré-diagnostic IA | `PreDiagDrawer` + Edge Function | `PreDiagDrawer.tsx` · `generate-rapport` | `[x]` 26/06/2026 |
| P2-03 | B2B | M08 — Publipostage | Modèles email/courrier + variables fusion + export CSV Brevo + PDF · tables `modeles_comm` + `publipostage_exports` | `Publipostage.tsx` · `ModelesComm.tsx` · `Layout.tsx` · Migration SQL | `[x]` 29/06/2026 |
| P2-04 | B2B | M09 — Qualification contacts | `QualificationDrawer` · table `qualifications` · badges alerte 48h kanban · sidebar Prospection réorganisée | `QualificationDrawer.tsx` · `CampagnePipeline.tsx` · `Layout.tsx` · Migration SQL | `[x]` 29/06/2026 |
| P2-05 | B2B | M10 — RDV consultant | Agenda consultant + création RDV + statuts + compte rendu | `RDVConsultant.tsx` · table `rendez_vous` | `[ ]` |
| P2-06 | B2B | M12 — Mandat | Génération mandat + lien Yousign + cycle de vie statuts | `Mandats.tsx` · table `mandats` | `[ ]` |
| P2-07 | B2B | M05 — Versioning scores | Table `risk_scores` historique par actif | Migration SQL · `FicheBien.tsx` | `[ ]` |
| P2-08 | B2B | M11 — GED généraliste | Interface GED générique + versioning | `GED.tsx` · table `documents` | `[ ]` |
| P2-09 | B2B | M13 — Analytics ROI | LGD réduite + sinistres évités € | `Analytics.tsx` | `[ ]` |

---

## PRIORITÉ 3 — Roadmap Enterprise / LOT 2

| ID | Module | Description | Statut |
|----|--------|-------------|--------|
| P3-01 | AGEadapt | ACT Adaptation scoring — matrice maturité 5 niveaux (v1.2) | `[ ]` |
| P3-02 | AGEadapt | Cartographie aléas GPS — Climadiag + DRIAS + TRACC (v1.3) | `[ ]` |
| P3-03 | B2B | Analyse portefeuille agrégée + SIG (Brown Value v1.3) | `[ ]` |
| P3-04 | B2B | Stress tests GIEC — RCP 4.5/8.5 + Monte-Carlo (v2.0) | `[ ]` |
| P3-05 | B2B | Reporting CSRD/IFRS S2 — export auditable | `[ ]` |
| P3-06 | B2B | APIs climatiques avancées — BRGM + Géorisques + Météo-France | `[ ]` |
| P3-07 | B2B | Module subventions — Fonds Barnier + Fonds Vert + ADEME | `[ ]` |
| P3-08 | Tous | SSO entreprise + audit RGPD + responsive mobile | `[ ]` |
| P3-09 | B2B | Green Value — moteur green premium | `[ ]` |

---

## RÉALISÉ — Fonctionnalités confirmées en production

| Environnement | Fonctionnalité | Date |
|--------------|----------------|------|
| B2B | Sidebar réorganisée — Prospection (Campagnes · Dossiers RGA · Publipostage · Modèles comm.) · Environnement (AGEadapt · AGEcarbon) · Finance (Reporting · Facturation) | 29/06/2026 |
| B2B | Qualification contacts — `QualificationDrawer` · table `qualifications` · badges alerte 48h · historique par contact | 29/06/2026 |
| B2B | Publipostage — `Publipostage.tsx` + `ModelesComm.tsx` + tables `modeles_comm` / `publipostage_exports` | 29/06/2026 |
| B2B + Particulier | Pré-diagnostic IA — `PreDiagDrawer` + Edge Function `generate-rapport` | 26/06/2026 |
| Particulier | DossiersRGA liste + FicheDossierRGA — pipeline, documents, upload bucket | 26/06/2026 |
| B2B | Fiche client structurée — `organisations` enrichie + `FicheClient.tsx` | 26/06/2026 |
| B2B | Import portefeuille CSV — wizard 4 étapes, déduplication | 26/06/2026 |
| B2B / Tous | RLS multi-tenant — `client_id` dans `biens` + `dossiers` · 5 tables | 26/06/2026 |
| B2B | Pipeline contacts campagne — `contacts_campagne` + kanban `CampagnePipeline.tsx` | 26/06/2026 |

---

## NOTES TECHNIQUES — Session 29/06/2026

### Pattern RLS validé
```sql
-- Toujours TO authenticated (jamais public)
-- Toujours inclure 'admin' ET 'admin_national'
EXISTS (SELECT 1 FROM profils p WHERE p.id = auth.uid()
  AND p.role IN ('admin', 'admin_national', ...))
```

### contacts_campagne — colonnes réelles
```
id · campagne_id · bien_id · client_id · statut · statut_updated_at
consultant_id · note · created_at · updated_at
```
Pas de prenom/nom/email/telephone — ces données sont dans `biens` ou `organisations`.

### Qualification — points clés
- Table `qualifications` : une ligne par événement (historique complet)
- Statut courant = dernier enregistrement par `contact_id`
- `relance_due_at` = `created_at + 48h` si statut = `chaud`
- Badge ⚠ sur carte kanban si `relance_due_at < now()` et `relance_traitee = false`
- `setLoading(false)` manquant dans `charger()` de `CampagnePipeline` → ajouté après `setContacts(enriched)`
- `Circle` utilisé à la place de `CircleDash` (absent de lucide-react version installée)

### Sidebar — architecture finale
```
Plateforme : Accueil · Sensibilisation · Marketplace
Métier :
  File d'attente (admin)
  Missions
  Mon équipe
  Portefeuille
  Clients (admin)
  Messagerie
  Finance : Reporting · Facturation
  Environnement : AGEadapt · AGEcarbon
  Prospection : Campagnes · Dossiers RGA · Publipostage · Modèles comm.
  Documents
  Utilisateurs (admin)
  Administration (admin)
```

### Prochaine priorité
**P2-05** — RDV consultant (M10)

---

## INSTRUCTIONS POUR CLAUDE

1. Lire ce fichier en premier pour connaître l'état exact du backlog.
2. Pour marquer terminé : `[ ]` → `[x]` + date.
3. Ne jamais supposer qu'un ticket est terminé sans confirmation explicite.
4. Les bugs BUG-xx sont prioritaires sur tout ticket P1.
5. Toujours vérifier le schéma réel en base avant de produire des migrations.
6. Toujours inclure `'admin'` ET `'admin_national'` dans les policies RLS.
7. Ne jamais cibler `public` dans les policies RLS — toujours `authenticated`.
8. `contacts_campagne` n'a pas de colonnes prenom/nom/email — ne pas les supposer.