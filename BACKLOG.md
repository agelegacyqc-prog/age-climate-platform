# BACKLOG — AGE Climate Platform
> Source de vérité du suivi de développement · Mis à jour à chaque session Claude
> Format statut : `[ ]` À faire · `[~]` En cours · `[x]` Terminé

**Dernière mise à jour :** 29/06/2026  
**Rapport de référence :** Session 29/06/2026 — P2-03 à P2-08 ✅ · Sidebar Prospection finalisée

---

## BUGS BLOQUANTS

| ID | Environnement | Description | Statut |
|----|--------------|-------------|--------|
| BUG-01 | Espace particulier | `.single()` → `.maybeSingle()` sur `profils` | `[x]` 25/06/2026 |
| BUG-02 | Supabase / BDD | CHECK constraint `actifs.type_client` | `[x]` 25/06/2026 |
| BUG-03 | Espace particulier | Fallback `georisques_data` manquant | `[x]` 25/06/2026 |
| BUG-04 | B2B / Campagnes | Erreurs 406 sur `profils` dans `loadDemandesClient` | `[x]` 26/06/2026 |

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
| P2-09 | M13 — Analytics ROI | LGD réduite + sinistres évités € | `Analytics.tsx` | `[ ]` |

---

## PRIORITÉ 3 — Roadmap Enterprise / LOT 2

| ID | Module | Description | Statut |
|----|--------|-------------|--------|
| P3-01 | AGEadapt | ACT Adaptation scoring — matrice maturité (v1.2) | `[ ]` |
| P3-02 | AGEadapt | Cartographie aléas GPS — Climadiag + TRACC (v1.3) | `[ ]` |
| P3-03 | B2B | Analyse portefeuille agrégée + SIG (Brown Value v1.3) | `[ ]` |
| P3-04 | B2B | Stress tests GIEC — RCP 4.5/8.5 + Monte-Carlo (v2.0) | `[ ]` |
| P3-05 | B2B | Reporting CSRD/IFRS S2 | `[ ]` |
| P3-06 | B2B | APIs climatiques avancées | `[ ]` |
| P3-07 | B2B | Module subventions | `[ ]` |
| P3-08 | Tous | SSO entreprise + audit RGPD + responsive mobile | `[ ]` |
| P3-09 | B2B | Green Value | `[ ]` |
| P3-10 | B2B | Saisie manuelle de score (hors Brown Value/Géorisques) dans `FicheBien.tsx` | `[ ]` |

---

## RÉALISÉ — Fonctionnalités confirmées en production

| Environnement | Fonctionnalité | Date |
|--------------|----------------|------|
| B2B | GED versioning — v1/v2/v3, vue arborescence par actif, catégories étendues (facture, photo, diagnostic, plan d'action, correspondance) | 29/06/2026 |
| B2B | Versioning scores — `ScoreHistorique.tsx`, graphique Recharts interactif, alertes changement classe / variation ≥10pts | 29/06/2026 |
| B2B | Mandats CERFA RGA — workflow 3 étapes, génération PDF, cycle brouillon→envoyé→signé→annulé, lien Yousign | 29/06/2026 |
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

---

## NOTES TECHNIQUES — Session 29/06/2026

### Pattern RLS validé (à appliquer systématiquement)
```sql
TO authenticated  -- jamais public
EXISTS (SELECT 1 FROM profils p WHERE p.id = auth.uid()
  AND p.role IN ('admin', 'admin_national', ...))  -- toujours les deux
```

### ScoreHistorique — piège résolu
`FicheBien.tsx` utilise la table `actifs` (pas `biens`) malgré son nom. Le composant `ScoreHistorique` doit recevoir `actifId={actif.id}`, jamais `bienId`. Erreur 409 sinon (violation FK `risk_scores_bien_id_fkey`).

### GED — versioning
- `document_parent_id` pointe vers la version précédente (chaîne)
- `est_version_courante` : un seul `true` par chaîne de versions
- Suppression d'une version courante → restaure automatiquement la précédente comme courante
- Bucket `documents-clients` réutilisé (pas de nouveau bucket)

### Mandats — CERFA 17596*01
- Génération PDF via HTML → `window.print()` (pas de lib PDF dédiée)
- Données mandataire propres à chaque région (pas de valeur par défaut globale)
- 1 propriétaire = 1 mandat actif max — ancien mandat auto-annulé à l'envoi d'un nouveau sur le même `bien_id`
- Bucket `documents-mandats` créé (private, 10 Mo, PDF uniquement)

### Architecture sidebar finale
```
Prospection : Campagnes · Dossiers RGA · Mandats · Agenda RDV · Publipostage · Modèles comm.
Environnement : AGEadapt · AGEcarbon
Finance : Reporting · Facturation
```

### Tables créées cette session
`modeles_comm` · `publipostage_exports` · `qualifications` · `rendez_vous` · `mandats` · `risk_scores` · `alertes_scores`
Colonnes ajoutées : `documents.version/document_parent_id/est_version_courante/region_code/bien_id/note`

### Prochaine priorité
**P2-09** — Analytics ROI (M13) — dernier ticket P2 restant

---

## INSTRUCTIONS POUR CLAUDE

1. Lire ce fichier en premier.
2. `[ ]` → `[x]` + date à la confirmation explicite du PO uniquement.
3. Toujours `TO authenticated` + `'admin'` ET `'admin_national'` dans les policies RLS.
4. Vérifier le schéma réel en base avant toute migration.
5. `contacts_campagne` n'a pas de colonnes prenom/nom/email.
6. `FicheBien.tsx` utilise la table `actifs`, pas `biens` — vigilance sur les noms de props.