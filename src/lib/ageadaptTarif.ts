// src/lib/ageadaptTarif.ts
//
// Module : AGEadapt — Simulateur tarifaire.
// Source de vérité : Fiche module AGEadapt v1.1, §4.1 (formules jours/durée/honoraires/phases)
// et §4.2 (recalage si bilan existant importé).
//
// Fonction PURE, sans effet de bord, sans dépendance. Exécutable des deux côtés :
//   - client  : recalcul temps réel (< 50 ms, cible §9) ;
//   - serveur : référence d'audit (socle « recalcul serveur »).
//
// Règle socle respectée : le moteur N'ARRONDIT PAS pour l'affichage. Les seuls
// arrondis présents ici sont ceux EXPLICITEMENT prescrits par la formule §4.1
// (round(j), arrondi au 100 € des honoraires).

/** Méthodes de mission AGEadapt (cf. CHECK `ageadapt_missions.methode`). */
export type MethodeAgeadapt = 'abc' | 'act' | 'vuln' | 'full';

/** Entrées du simulateur — bornes alignées sur les CHECK de `ageadapt_missions`. */
export interface EntreesTarif {
  /** methode */
  methode: MethodeAgeadapt;
  /** effectif_tranche ∈ [1..6] : 1–10 / 11–49 / 50–249 / 250–499 / 500–999 / 1 000+ */
  effectifTranche: number;
  /** nb_sites_tranche ∈ [1..4] : 1 site / 2–3 / 4–9 / 10+ */
  nbSitesTranche: number;
  /** bilan_existant — déclenche le recalage §4.2 (reduc_existant = 0,65) */
  bilanExistant: boolean;
  /** maturite_donnees ∈ [1..3] : 1 = faible / 2 = moyen / 3 = élevé */
  maturiteDonnees: number;
  /** tjm_reference — défaut 950 €/j (§4.1). Optionnel, pour audit/paramétrage. */
  tjm?: number;
}

/** Une phase de la décomposition (§4.1, répartition par phase). */
export interface PhaseTarif {
  /** Libellé repris MOT POUR MOT de §4.1 (règle socle « libellés »). */
  libelle: string;
  /** phaseX_pct — pourcentage entier de §4.1 */
  pct: number;
  /** phaseX_jours */
  jours: number;
  /** phaseX_montant (€ HT), base = milieu de fourchette */
  montant: number;
}

/** Résultat complet du simulateur. Mapping direct vers `ageadapt_simulations`. */
export interface ResultatTarif {
  /** jours_consultant (j) */
  joursConsultant: number;
  /** duree_mois */
  dureeMois: number;
  /** tarif_bas_ht (tL) */
  tarifBasHt: number;
  /** tarif_haut_ht (tH) */
  tarifHautHt: number;
  /** Milieu de fourchette (tL + tH) / 2 — base de répartition des montants par phase. */
  milieuHt: number;
  /** tjm_reference retenu */
  tjm: number;
  /** phase1..3 (Collecte & cadrage / Calcul & analyse / Plan transition & livrables) */
  phases: [PhaseTarif, PhaseTarif, PhaseTarif];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de référence — §4.1 (à reproduire à l'identique)
// ─────────────────────────────────────────────────────────────────────────────

/** TJM de référence (§4.1). */
export const TJM_DEFAUT = 950;

/** Tableau base_j[mission][effectif] — jours·consultant avant ajustements (§4.1). */
const BASE_J: Record<MethodeAgeadapt, readonly [number, number, number, number, number, number]> = {
  abc: [3, 5, 7, 10, 14, 18],
  act: [4, 6, 9, 13, 17, 22],
  vuln: [5, 8, 12, 17, 22, 28],
  full: [10, 15, 22, 30, 40, 50],
};

/** mult_sites = [1.0, 1.15, 1.35, 1.6] — 1 site / 2–3 / 4–9 / 10+ (§4.1). */
const MULT_SITES = [1.0, 1.15, 1.35, 1.6] as const;

/** reduc_maturite = [1.0, 0.9, 0.8] — faible / moyen / élevé (§4.1). */
const REDUC_MATURITE = [1.0, 0.9, 0.8] as const;

/** reduc_existant si bilan_existant = true (§4.2). Sinon 1.0. */
const REDUC_EXISTANT_OUI = 0.65;

/** Définition d'une phase : [libellé mot pour mot, pct entier]. */
type PhaseDef = readonly [string, number];

/** Répartition par phase (%) par mission — §4.1. Libellés mot pour mot. */
const PHASES: Record<MethodeAgeadapt, readonly [PhaseDef, PhaseDef, PhaseDef]> = {
  abc: [['Collecte & cadrage', 35], ['Calcul & analyse', 35], ['Plan transition & livrables', 30]],
  act: [['Collecte & cadrage', 30], ['Calcul & analyse', 40], ['Plan transition & livrables', 30]],
  vuln: [['Collecte & cadrage', 40], ['Calcul & analyse', 35], ['Plan transition & livrables', 25]],
  full: [['Collecte & cadrage', 30], ['Calcul & analyse', 40], ['Plan transition & livrables', 30]],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Arrondi entier équivalent à Excel ROUND(x, 0) — demi supérieur (half away from zero),
 * robuste au bruit binaire IEEE-754.
 *
 * Motivation : `Math.round(10 * 1.15)` renvoie 11 car `10 * 1.15 === 11.499999999999998`.
 * §4.1 attend 12. On nettoie donc le produit à 1e-6 (bien au-delà de la précision
 * réelle des multiplicateurs : max 5 décimales) avant l'arrondi demi supérieur.
 */
export function round0(x: number): number {
  const nettoye = Math.round(x * 1e6) / 1e6;
  return Math.sign(nettoye) * Math.floor(Math.abs(nettoye) + 0.5);
}

/** Durée mission en mois selon j (§4.1). Bornes supérieures inclusives. */
export function calculerDureeMois(j: number): number {
  if (j <= 6) return 1;
  if (j <= 12) return 2;
  if (j <= 20) return 3;
  if (j <= 30) return 4;
  return 6;
}

/**
 * Décomposition par phase.
 * jours   : round(j × pct) sur les 2 premières phases, résidu sur la 3ᵉ → Σ = j.
 * montant : round(milieu × pct) sur les 2 premières phases, résidu sur la 3ᵉ → Σ = milieu.
 *
 * ⚠️ Hors §4.1 stricte : la fiche ne donne que les pct. La dérivation jours/montant
 * (base milieu de fourchette + résidu sur dernière phase) est une décision PO du
 * 03/07/2026 (« milieu ») et non une formule du modèle source.
 */
function decomposerPhases(
  methode: MethodeAgeadapt,
  j: number,
  milieuHt: number,
): [PhaseTarif, PhaseTarif, PhaseTarif] {
  const defs = PHASES[methode];

  const jours0 = round0((j * defs[0][1]) / 100);
  const jours1 = round0((j * defs[1][1]) / 100);
  const jours2 = j - jours0 - jours1; // résidu → Σ = j

  const montant0 = round0((milieuHt * defs[0][1]) / 100);
  const montant1 = round0((milieuHt * defs[1][1]) / 100);
  const montant2 = milieuHt - montant0 - montant1; // résidu → Σ = milieu

  return [
    { libelle: defs[0][0], pct: defs[0][1], jours: jours0, montant: montant0 },
    { libelle: defs[1][0], pct: defs[1][1], jours: jours1, montant: montant1 },
    { libelle: defs[2][0], pct: defs[2][1], jours: jours2, montant: montant2 },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonction principale
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulateur tarifaire AGEadapt (§4.1 + §4.2).
 * S'exécute côté client (recalcul temps réel) et côté serveur (audit).
 *
 * @throws si une tranche est hors des bornes des CHECK `ageadapt_missions`.
 */
export function simulerTarif(entrees: EntreesTarif): ResultatTarif {
  const { methode, effectifTranche, nbSitesTranche, bilanExistant, maturiteDonnees } = entrees;
  const tjm = entrees.tjm ?? TJM_DEFAUT;

  // Garde-fous — bornes = CHECK constraints de ageadapt_missions
  if (!(methode in BASE_J)) throw new Error(`methode invalide: ${String(methode)}`);
  if (!Number.isInteger(effectifTranche) || effectifTranche < 1 || effectifTranche > 6)
    throw new Error(`effectifTranche hors bornes [1..6]: ${effectifTranche}`);
  if (!Number.isInteger(nbSitesTranche) || nbSitesTranche < 1 || nbSitesTranche > 4)
    throw new Error(`nbSitesTranche hors bornes [1..4]: ${nbSitesTranche}`);
  if (!Number.isInteger(maturiteDonnees) || maturiteDonnees < 1 || maturiteDonnees > 3)
    throw new Error(`maturiteDonnees hors bornes [1..3]: ${maturiteDonnees}`);

  const base = BASE_J[methode][effectifTranche - 1];
  const multSites = MULT_SITES[nbSitesTranche - 1];
  const reducExistant = bilanExistant ? REDUC_EXISTANT_OUI : 1.0; // §4.2
  const reducMaturite = REDUC_MATURITE[maturiteDonnees - 1];

  // j = round(base_j × mult_sites × reduc_existant × reduc_maturite)  (§4.1)
  const j = round0(base * multSites * reducExistant * reducMaturite);

  const dureeMois = calculerDureeMois(j);

  // tL = round(j × TJM × 0.90 / 100) × 100 ; tH = round(j × TJM × 1.15 / 100) × 100  (§4.1)
  const tarifBasHt = round0((j * tjm * 0.9) / 100) * 100;
  const tarifHautHt = round0((j * tjm * 1.15) / 100) * 100;

  const milieuHt = (tarifBasHt + tarifHautHt) / 2;

  const phases = decomposerPhases(methode, j, milieuHt);

  return { joursConsultant: j, dureeMois, tarifBasHt, tarifHautHt, milieuHt, tjm, phases };
}