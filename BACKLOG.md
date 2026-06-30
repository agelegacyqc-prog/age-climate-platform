# BACKLOG — AGE Climate Platform
> Source de vérité du suivi de développement · Mis à jour à chaque session Claude
> Format statut : `[ ]` À faire · `[~]` En cours · `[x]` Terminé

**Dernière mise à jour :** 30/06/2026 (session après-midi/soir)
**Rapport de référence :** Session 30/06/2026 — P2-09 finalisé et testé de bout en bout · Correctifs Brown Value/Mandats/Analytics · Découverte de plusieurs problèmes structurels de données de test

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
| P3-11 | B2B | Module Sinistres évités € (assureur) — pendant du module LGD pour profil assureur, formule à définir | `[ ]` |
| P3-12 | B2B | Export Excel Brown Value (placeholder actuel) | `[ ]` |
| P3-13 | B2B | Retirer le bouton "Créer un mandat" ajouté par erreur sur `FicheBien.tsx` (espace B2B) — les mandats CERFA RGA ne concernent que les clients particuliers éligibles aux aides, jamais les actifs B2B. Le bouton n'a pas été retiré faute de temps en fin de session | `[ ]` |
| P3-14 | B2B / Finance | **Repositionnement Brown Value sous Finance** — nouvelle page dédiée `BrownValueSimulation.tsx`, retrait de l'onglet `FicheBien.tsx`, point d'entrée par sélection d'actif / saisie libre d'adresse / **upload CSV multi-adresses**. Migration déjà faite : colonnes `nom_bien`, `adresse`, `code_postal`, `ville` ajoutées à `brown_value_cases` (nullable, utilisées uniquement pour les cas sans `actif_id`/`bien_id`). **Bloqué** : pas de barème scientifique chiffré "type de travaux → % réduction de risque" disponible (vérifié : ni Bat-ADAPT OID v4 — section RGA "en cours de construction" —, ni le modèle AHP quantique RGA interne ne fournissent ce barème). Décision : rester en saisie manuelle libre du consultant pour `reductionRisque`, pas de barème automatique pour l'instant. Chantier complet non démarré en code. | `[ ]` |
| P3-15 | B2B / Client | **Suppression de campagnes/demandes côté client** — chaque client doit pouvoir supprimer ses propres campagnes et demandes (`client/Campagnes.tsx`, `ClientDemandes.tsx`), dans le respect du RLS existant sur `client_id`. À spécifier : DELETE définitif ou soft delete, confirmation utilisateur obligatoire. | `[ ]` |
| P3-16 | B2B / Admin | **Outil de purge en masse côté Administration** — permettre à l'admin de supprimer en bloc les campagnes, demandes (`demandes_marketplace`) et messages (`messages`) provenant des profils clients, avec effet global sur les vues responsable régional et consultant (données partagées, RLS différente selon rôle, donc une suppression admin doit se répercuter partout). À spécifier précisément avant code : scope exact des tables, DELETE vs soft delete, double confirmation (action destructive), restriction au rôle `admin`/`admin_national` uniquement. | `[ ]` |
| P3-17 | B2B / Données | **Nettoyage des données de test à grande échelle** — état des lieux réalisé le 30/06 (cf. notes techniques ci-dessous), action reportée : décision à prendre sur les séries de 5 actifs dupliqués par nom (Martin, ATLANDIS, DURAND, LALMI, MARTY, LEROY, NINJA, SAVI — réparties sur 4 mêmes `client_id` à travers les catégories `import_csv`/`biens_finances`/`patrimoine_propre`) et sur les séries de 4 imports CSV identiques sous le client `93312474...` (Commerce Pau, Bureau Lyon, Résidence Bayonne, Mairie de Dax, etc., probables doublons accidentels). | `[ ]` |

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

---

## NOTES TECHNIQUES — Session 30/06/2026 (suite)

### ⚠️ Confirmation définitive — `mandats` ne concerne QUE les particuliers
- `mandats.bien_id` → FK vers `biens(id)` uniquement (`ON DELETE SET NULL`). **Aucune** colonne `actif_id` n'existe sur la table `mandats`.
- Les mandats CERFA 17596*01 RGA concernent exclusivement les clients particuliers éligibles aux aides RGA (propriétaire occupant), jamais les actifs B2B.
- Toute tentative de rattacher un mandat à un `actifs.id` échoue en violation de contrainte FK (23503 / 409 Conflict) — observé et corrigé en session (cf. BUG-09, BUG-11).
- **Conséquence design** : si un mécanisme de déclenchement "post-travaux" doit exister côté B2B (Brown Value/LGD), il doit être autonome et ne jamais dépendre de la table `mandats`. C'est désormais le cas : le contexte `post_travaux` du wizard Brown Value est sélectionnable librement par le consultant, sans condition.

### ⚠️ Piège méthode finale Brown Value — `MAX` peut masquer l'effet des travaux
- Avec `methodeFinale = "MAX"`, le moteur retient `Math.max(decoteDCFCapee, decoteMarche)`. Si `decoteMarche` (= `decoteMarcheCible% × V`, fixe et indépendante des aléas) est supérieure à la décote DCF réelle calculée à partir des aléas, c'est elle qui s'applique systématiquement — rendant tout ajustement des aléas (ex. travaux réalisés) invisible sur le résultat final.
- Pour tester ou démontrer l'effet de travaux d'adaptation, la méthode **DCF** doit être sélectionnée explicitement (pas MAX, pas Pondérée avec un poids DCF trop faible).
- Le bouton "Nouveau calcul" du wizard réinitialise **tous** les champs aux valeurs par défaut (`INPUTS_DEFAUT`), y compris la méthode (repasse à `MAX`) — à reconfigurer manuellement à chaque nouveau calcul. Source de confusion potentielle pour les consultants, à documenter (cf. P3-14 zone d'amélioration UX).

### ⚠️ Coûts d'adaptation et contexte post-travaux — correctif appliqué
- Avant correctif : cocher "Adaptation réalisée" sur un aléa ajoutait systématiquement `coutAdaptation` (coût one-off, ex. 8000€ par défaut sur RGA) à la décote totale, via `npvAdaptationsTotal`. Pour un calcul `post_travaux`, ce coût est un sunk cost déjà payé par le propriétaire — il ne doit pas alourdir la décote vue par un acheteur potentiel.
- Correctif : `calculerHazard()`/`calculerBrownValue()` acceptent désormais un paramètre `ignorerCoutsAdaptation`, automatiquement activé (`true`) quand `contexteFinalisation === "post_travaux"` dans `BrownValueWizard.tsx`. Le champ "Coût adaptation (€)" reste saisissable à l'étape 3 mais n'impacte plus le calcul en contexte post-travaux.

### Référentiels scientifiques consultés pour le barème travaux (P3-14)
- **OID Bat-ADAPT v4** (`OID__02_2026__Referentiel_scientifique_et_technique_Bat-ADAPT.pdf`) : catalogue de 44 recommandations d'actions adaptatives par aléa (12 actions pour Sécheresses et RGA), mais utilise une échelle qualitative de favorabilité ("+" à "+++++") basée sur un coefficient de réponse 0-5, **pas** un % de réduction de risque chiffré. Section IV.6.6 "Calcul de la vulnérabilité [RGA]" explicitement marquée "Indisponible. En cours de construction" dans le document source.
- **Modèle AHP quantique RGA interne** (`Ponderation_RGA_Quantique_completee_VF_02.xlsx`) : grille de pondération de 53 variables de **vulnérabilité** (diagnostic amont, échelle ordinale 0-3), pas un catalogue de travaux correctifs avec effet chiffré (en aval). La variable V49 "Coût des travaux de prévention" ne contient que des tranches de coût, sans effet de réduction associé.
- **Conclusion** : aucune source actuellement disponible dans le projet ne permet de construire un barème "type de travaux → % réduction" sans inventer des coefficients. Décision prise : saisie manuelle libre du consultant, barème automatique reporté en attente de données scientifiques fiables ou d'un barème interne AGE validé par les experts métier.

### État des lieux données de test (P3-17) — à traiter en prochaine session
- Séries de 5 actifs identiques par nom (Martin, ATLANDIS, DURAND, LALMI, MARTY, LEROY, NINJA, SAVI, etc.), répartis sur 4 mêmes `client_id` (`d35a4a58...`, `64156070...`, `743c14c4...`, `2e590c7c...`), à travers les catégories `import_csv` / `biens_finances` (x2) / `patrimoine_propre` (x2). Origine et statut (test volontaire vs accidentel) non tranchés en fin de session.
- Séries de 4 actifs strictement identiques (même nom, même ville, catégorie `import_csv` uniquement) sous le client `93312474-8787-4c07-99af-5c0653a318a9` (Commerce Pau, Bureau Lyon, Résidence Bayonne, Mairie de Dax, Immeuble Toulouse, Villa Biarritz, Maison Mont-de-Marsan, Entrepôt Nantes, Maison Albi, Appartement Bordeaux Centre) — probable duplication accidentelle du même import CSV, à investiguer (dates de création) avant suppression.
- `biens_finances` pour le client banque@test.fr a été corrigé en session : l'actif Martin réellement rattaché (`3b6b113e-c02d-4bda-a915-b26dbc64cae1`) a été **réassigné artificiellement** vers l'actif de test déjà utilisé pour les calculs Brown Value (`2b9fe3b6-00f5-4a51-b122-5ceaeeaea413`), pour terminer le test P2-09 rapidement. **Ce routage est temporaire et doit être revu** lors du nettoyage global (P3-17) — décider si on restaure le bon `actif_id` une fois les données de test consolidées, ou si on conserve cet actif comme référence de test officielle.
- De nombreux dossiers `brown_value_cases` de test (brouillons `suivi` non finalisés + finalisés multiples) ont été créés sur l'actif `2b9fe3b6...` pendant les itérations de debug de cette session — purge complète proposée mais non exécutée en fin de session (en attente d'arbitrage sur ce qu'il faut conserver comme référence).

### Nouveau chantier identifié — suppression de données côté client/admin (P3-15, P3-16)
- Besoin exprimé : les clients doivent pouvoir supprimer leurs propres campagnes et demandes ; l'admin doit pouvoir purger en masse les campagnes/demandes/messages provenant de l'ensemble des profils clients, avec effet visible sur les vues responsable régional et consultant.
- Reporté à la prochaine session pour cadrage approfondi avant code (fonctionnalité destructive, nécessite confirmation explicite et décision DELETE vs soft delete).

---

## INSTRUCTIONS POUR CLAUDE

1. Lire ce fichier en premier.
2. `[ ]` → `[x]` + date à la confirmation explicite du PO uniquement.
3. Toujours `TO authenticated` + `'admin'` ET `'admin_national'` dans les policies RLS.
4. Vérifier le schéma réel en base avant toute migration (ne pas supposer les noms de colonnes — cf. piège `nom_site` vs `nom`, `titre` vs `type_prestation` cette session).
5. `contacts_campagne` n'a pas de colonnes prenom/nom/email.
6. `FicheBien.tsx` utilise la table `actifs`, pas `biens` — vigilance sur les noms de props.
7. `brown_value_cases` et `risk_scores` sont deux systèmes de score indépendants — ne jamais supposer de lien entre eux.
8. Le module client réel est `profils_client`, pas `organisations` — voir notes techniques 30/06/2026 avant tout travail touchant à l'identité client.
9. **`mandats` ne concerne JAMAIS les actifs B2B** — `bien_id` pointe uniquement vers `biens` (particuliers). Ne jamais réintroduire une dépendance entre un module B2B et la table `mandats`.
10. Avant tout nouveau calcul Brown Value destiné à comparer un effet (ex. avant/après travaux), toujours vérifier que la **méthode finale** est explicitement réglée sur **DCF** — le bouton "Nouveau calcul" réinitialise systématiquement à `MAX`.
11. Pour les tests sur données réelles, toujours vérifier l'UUID exact de l'actif manipulé (`SELECT id, nom FROM actifs WHERE nom ILIKE '%X%'`) avant de lancer une série de calculs — plusieurs actifs peuvent partager le même nom.