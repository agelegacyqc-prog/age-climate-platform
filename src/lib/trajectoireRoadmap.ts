// src/lib/trajectoireRoadmap.ts
//
// Module Trajectoire : roadmap priorisée. Calculs purs (sans accès réseau).
// Exécution : côté client pour l'affichage (< 150 ms) ; la référence d'audit reste la base.
// Référence : FICHE_MODULE_Trajectoire_v0.1.md, §4.2 (score de priorité S) et §4.3 (horizon).
// Décisions du PO (16/10/2026) :
//  - sources des actions : exigences applicables non conformes, en cours ou à évaluer, et recommandations
//    extraites validées au moins par le client ;
//  - action sans exigence liée : c_leg = 0 et c_sanc = 0 ;
//  - c_expo lu dans le score AGE (risk_scores), jamais dans actifs.score_climatique ;
//  - gains en euros seulement en v1 ; échéances : fonctions existantes de ./trajectoire.

import { ajouterMois, echeanceEffective, statutAffiche, type DomaineTrajectoire, type ExigenceLigne, type Qualification } from "./trajectoire"
import type { StatutExtraction, TypeExtraction } from "./trajectoireExtractions"

export type CritereId = "leg" | "ech" | "sanc" | "gain" | "cout" | "expo"
export type HorizonId = "0_3m" | "3_12m" | "12_36m" | "36m_plus"

export const HORIZONS: ReadonlyArray<{ id: HorizonId; label: string }> = [
  { id: "0_3m", label: "0–3 mois" },
  { id: "3_12m", label: "3–12 mois" },
  { id: "12_36m", label: "12–36 mois" },
  { id: "36m_plus", label: "Plus de 36 mois" },
]

const CRITERES: ReadonlyArray<CritereId> = ["leg", "ech", "sanc", "gain", "cout", "expo"]

/** Poids w_k (Σ = 1) et seuil d'échéance (jours). Valeurs par défaut de trajectoire_parametres. */
export interface ParametresPriorite {
  w_leg: number
  w_ech: number
  w_sanc: number
  w_gain: number
  w_cout: number
  w_expo: number
  seuil_ech_jours: number
}

export const PARAMETRES_PAR_DEFAUT: ParametresPriorite = {
  w_leg: 0.30, w_ech: 0.25, w_sanc: 0.15, w_gain: 0.15, w_cout: 0.10, w_expo: 0.05, seuil_ech_jours: 730,
}

/** Action avant calcul du score. */
export interface CandidatAction {
  /** Clé stable : "exigence:<id>" ou "extraction:<id>". */
  cle: string
  origine: "exigence" | "extraction"
  titre: string
  domaine: DomaineTrajectoire | null
  /** null : aucune exigence liée. */
  qualification: Qualification | null
  sanction_prevue: boolean
  /** AAAA-MM-JJ. */
  date_cible: string | null
  cout_estime: number | null
  /** Euros uniquement (v1). */
  gain_estime: number | null
  /** Score climatique AGE, 0 à 100 ; null si absent. */
  score_expo: number | null
  /** Validée par le client, en attente de confirmation AGE. */
  en_attente_age: boolean
  /** Actif de l'exigence ou de la preuve ; absent ou null au niveau organisation. */
  actif_id?: string | null
  /** Vrai si date_cible vient de l'action enregistrée (la source n'a pas d'échéance). */
  date_planifiee?: boolean
}

export interface DetailScore {
  /** c_k dans [0 ; 1]. */
  criteres: Record<CritereId, number>
  /** Part de chaque critère dans S : 100 × w_k × c_k. */
  contributions: Record<CritereId, number>
}

export interface ActionRoadmap extends CandidatAction {
  /** S, de 0 à 100, non arrondi. */
  score: number
  detail: DetailScore
  /** null : aucune date cible. */
  horizon: HorizonId | null
  en_retard: boolean
}

/** Champs d'une extraction utiles à la roadmap (ExtractionLigne est compatible). */
export interface ExtractionSource {
  id: string
  type_extraction: TypeExtraction
  contenu: string
  domaine: DomaineTrajectoire | null
  referentiel_id: string | null
  echeance: string | null
  cout_estime: number | null
  gain_estime: number | null
  gain_unite: "eur" | "kwh" | "tco2e" | null
    statut: StatutExtraction
  /** Actif du document source (null : niveau organisation). Renseigné au lot 2, avec le sélecteur de dépôt. */
  actif_id?: string | null
}

const borner = (x: number): number => Math.min(1, Math.max(0, x))

function moyenne(valeurs: ReadonlyArray<number>): number | null {
  return valeurs.length === 0 ? null : valeurs.reduce((a, b) => a + b, 0) / valeurs.length
}

/** Jours entre deux dates ISO (AAAA-MM-JJ) : fin − début. */
export function joursEntre(debut: string, fin: string): number {
  const [a1, m1, j1] = debut.slice(0, 10).split("-").map(Number)
  const [a2, m2, j2] = fin.slice(0, 10).split("-").map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, j2) - Date.UTC(a1, m1 - 1, j1)) / 86400000)
}

/** c_leg : 1 si obligatoire, 0,5 si potentielle, 0 si volontaire ou sans exigence liée. */
export function critereLegal(q: Qualification | null): number {
  if (q === "obligatoire") return 1
  if (q === "potentielle") return 0.5
  return 0
}

/** c_ech : 1 si échéance dépassée ; sinon max(0 ; 1 − j/seuil) ; 0 si aucune échéance. */
export function critereEcheance(dateCible: string | null, aujourdhui: string, seuilJours: number): number {
  if (dateCible === null) return 0
  const j = joursEntre(aujourdhui, dateCible)
  if (j < 0) return 1
  return Math.max(0, 1 - j / seuilJours)
}

/** Horizon : tranche de (date cible − aujourd'hui). Une échéance dépassée relève de « 0–3 mois ». */
export function horizonDe(dateCible: string | null, aujourdhui: string): HorizonId | null {
  if (dateCible === null) return null
  const d = dateCible.slice(0, 10)
  if (d <= ajouterMois(aujourdhui, 3)) return "0_3m"
  if (d <= ajouterMois(aujourdhui, 12)) return "3_12m"
  if (d <= ajouterMois(aujourdhui, 36)) return "12_36m"
  return "36m_plus"
}

/** Score S d'une action. gainMax et coutMax : maxima de l'organisation (sur ses actions). */
export function calculerScore(
  c: CandidatAction,
  ctx: { gainMax: number; coutMax: number; aujourdhui: string; params: ParametresPriorite },
): { score: number; detail: DetailScore } {
  const { gainMax, coutMax, aujourdhui, params } = ctx
  const criteres: Record<CritereId, number> = {
    leg: critereLegal(c.qualification),
    ech: critereEcheance(c.date_cible, aujourdhui, params.seuil_ech_jours),
    sanc: c.sanction_prevue ? 1 : 0,
    gain: c.gain_estime !== null && gainMax > 0 ? borner(c.gain_estime / gainMax) : 0,
    cout: c.cout_estime !== null && coutMax > 0 ? borner(1 - c.cout_estime / coutMax) : 0,
    expo: c.score_expo !== null ? borner(c.score_expo / 100) : 0,
  }
  const poids: Record<CritereId, number> = {
    leg: params.w_leg, ech: params.w_ech, sanc: params.w_sanc, gain: params.w_gain, cout: params.w_cout, expo: params.w_expo,
  }
  const contributions = { leg: 0, ech: 0, sanc: 0, gain: 0, cout: 0, expo: 0 } as Record<CritereId, number>
  let score = 0
  for (const k of CRITERES) {
    contributions[k] = 100 * poids[k] * criteres[k]
    score += contributions[k]
  }
  return { score, detail: { criteres, contributions } }
}

/** Roadmap : horizon, puis S décroissant, puis titre. Les actions sans date cible viennent en dernier. */
export function calculerRoadmap(
  candidats: ReadonlyArray<CandidatAction>,
  params: ParametresPriorite,
  aujourdhui: string,
): ActionRoadmap[] {
  const gainMax = Math.max(0, ...candidats.map(c => c.gain_estime ?? 0))
  const coutMax = Math.max(0, ...candidats.map(c => c.cout_estime ?? 0))
  const ordre = (h: HorizonId | null): number => (h === null ? HORIZONS.length : HORIZONS.findIndex(x => x.id === h))
  return candidats
    .map((c): ActionRoadmap => {
      const { score, detail } = calculerScore(c, { gainMax, coutMax, aujourdhui, params })
      return {
        ...c, score, detail,
        horizon: horizonDe(c.date_cible, aujourdhui),
        en_retard: c.date_cible !== null && c.date_cible.slice(0, 10) < aujourdhui.slice(0, 10),
      }
    })
    .sort((a, b) => ordre(a.horizon) - ordre(b.horizon) || b.score - a.score || a.titre.localeCompare(b.titre, "fr"))
}

/**
 * Exposition d'une exigence : score de l'actif concerné ; moyenne des actifs scorés si l'exigence est
 * au niveau de l'organisation ; null si absent (c_expo = 0).
 */
export function scoreExposition(actifId: string | null, scoresParActif: Readonly<Record<string, number>>): number | null {
  if (actifId !== null) return scoresParActif[actifId] ?? null
  return moyenne(Object.values(scoresParActif))
}

const STATUTS_A_TRAITER: ReadonlySet<string> = new Set(["non_conforme", "en_cours", "a_evaluer"])

/** Une action par exigence applicable non conforme, en cours ou à évaluer. */
export function candidatsDepuisExigences(
  exigences: ReadonlyArray<ExigenceLigne>,
  scoresParActif: Readonly<Record<string, number>>,
): CandidatAction[] {
  return exigences
    .filter(e => !e.archivee && STATUTS_A_TRAITER.has(e.statut))
    .map((e): CandidatAction => ({
      cle: `exigence:${e.id}`,
      origine: "exigence",
      titre: e.referentiel.libelle,
            domaine: e.referentiel.domaine,
      actif_id: e.actif_id,
      qualification: e.qualification,
      sanction_prevue: e.referentiel.sanction_prevue,
      date_cible: echeanceEffective(e),
      cout_estime: null,
      gain_estime: null,
      score_expo: scoreExposition(e.actif_id, scoresParActif),
      en_attente_age: statutAffiche(e) === "attente_age",
    }))
}

const RANG_QUALIFICATION: Readonly<Record<Qualification, number>> = { obligatoire: 2, potentielle: 1, volontaire: 0 }

/**
 * Exigences liées à une preuve (même référentiel), option C du 16/10/2026 :
 * avec actif, l'exigence de cet actif seulement ; sans actif, toutes celles du référentiel.
 */
export function exigencesLiees(
  referentielId: string | null,
  actifId: string | null,
  exigences: ReadonlyArray<ExigenceLigne>,
): ExigenceLigne[] {
  if (referentielId === null) return []
  return exigences.filter(e => !e.archivee && e.referentiel_id === referentielId && (actifId === null || e.actif_id === actifId))
}

export interface ExigenceAgregee {
  qualification: Qualification
  sanction_prevue: boolean
  domaine: DomaineTrajectoire
  date_cible: string | null
  score_expo: number | null
}

/**
 * Agrège des exigences liées : qualification la plus forte, échéance la plus proche,
 * exposition = moyenne (non arrondie) des scores des actifs concernés ; null si aucune exigence.
 */
export function agregerLiees(
  liees: ReadonlyArray<ExigenceLigne>,
  scoresParActif: Readonly<Record<string, number>>,
): ExigenceAgregee | null {
  if (liees.length === 0) return null
  let qualification = liees[0].qualification
  for (const e of liees) {
    if (RANG_QUALIFICATION[e.qualification] > RANG_QUALIFICATION[qualification]) qualification = e.qualification
  }
  const dates = liees.map(e => echeanceEffective(e)).filter((d): d is string => d !== null)
  const dateCible = dates.length === 0 ? null : dates.reduce((a, b) => (b.slice(0, 10) < a.slice(0, 10) ? b : a))
  const scores = liees.map(e => scoreExposition(e.actif_id, scoresParActif)).filter((s): s is number => s !== null)
  return {
    qualification,
    sanction_prevue: liees.some(e => e.referentiel.sanction_prevue),
    domaine: liees[0].referentiel.domaine,
    date_cible: dateCible,
    score_expo: moyenne(scores),
  }
}

/** Une action par recommandation extraite et validée au moins par le client. */
export function candidatsDepuisExtractions(
  extractions: ReadonlyArray<ExtractionSource>,
  exigences: ReadonlyArray<ExigenceLigne>,
  scoresParActif: Readonly<Record<string, number>>,
): CandidatAction[] {
  return extractions
    .filter(x => x.type_extraction === "recommandation" && (x.statut === "valide_client" || x.statut === "valide_age"))
    .map((x): CandidatAction => {
      const actifId = x.actif_id ?? null
      const lie = agregerLiees(exigencesLiees(x.referentiel_id, actifId, exigences), scoresParActif)
      return {
        cle: `extraction:${x.id}`,
        origine: "extraction",
        titre: x.contenu,
        domaine: x.domaine ?? lie?.domaine ?? null,
        actif_id: actifId,
        qualification: lie?.qualification ?? null,
        sanction_prevue: lie?.sanction_prevue ?? false,
        date_cible: x.echeance ?? lie?.date_cible ?? null,
        cout_estime: x.cout_estime,
        gain_estime: x.gain_unite === "eur" ? x.gain_estime : null,
        score_expo: lie !== null ? lie.score_expo : scoreExposition(actifId, scoresParActif),
        en_attente_age: x.statut === "valide_client",
      }
    })
}
// ---------------------------------------------------------------------------
// Lot C : actions enregistrées (table trajectoire_actions).
// Décisions du PO (16/10/2026) : adoption action par action ; score enregistré = instantané calculé côté
// client ; le statut d'une action n'agit pas sur l'exigence liée.
// Date cible (fiche §4.3) : l'échéance de la source prime ; la date saisie sur l'action ne sert que sans échéance.

export type StatutAction = "a_lancer" | "en_cours" | "realise" | "abandonne"

export const STATUTS_ACTION: ReadonlyArray<{ id: StatutAction; label: string }> = [
  { id: "a_lancer", label: "À lancer" },
  { id: "en_cours", label: "En cours" },
  { id: "realise", label: "Réalisée" },
  { id: "abandonne", label: "Abandonnée" },
]

/** Champs de trajectoire_actions utiles à l'affichage et au suivi. */
export interface LigneAction {
  id: string
  exigence_id: string | null
  extraction_id: string | null
  statut: StatutAction
  responsable: string | null
  date_cible: string | null
  archivee: boolean
}

/** Clé de lien avec une action calculée ; null si la ligne n'a aucune source (cas exclu par la base). */
export function cleDeLigne(l: Pick<LigneAction, "exigence_id" | "extraction_id">): string | null {
  if (l.exigence_id !== null) return `exigence:${l.exigence_id}`
  if (l.extraction_id !== null) return `extraction:${l.extraction_id}`
  return null
}

/** Lignes non archivées, indexées par clé de lien. */
export function indexerLignes(lignes: ReadonlyArray<LigneAction>): Map<string, LigneAction> {
  const m = new Map<string, LigneAction>()
  for (const l of lignes) {
    if (l.archivee) continue
    const cle = cleDeLigne(l)
    if (cle !== null) m.set(cle, l)
  }
  return m
}

export function sourceDeCle(cle: string): { origine: "exigence" | "extraction"; id: string } | null {
  const i = cle.indexOf(":")
  if (i < 0) return null
  const origine = cle.slice(0, i)
  const id = cle.slice(i + 1)
  if ((origine !== "exigence" && origine !== "extraction") || id === "") return null
  return { origine, id }
}

/** Sans échéance de source, la date cible saisie sur l'action enregistrée est utilisée (score et horizon compris). */
export function appliquerDatesPlanifiees(
  candidats: ReadonlyArray<CandidatAction>,
  lignes: ReadonlyArray<LigneAction>,
): CandidatAction[] {
  const index = indexerLignes(lignes)
  return candidats.map(c => {
    if (c.date_cible !== null) return c
    const planifiee = index.get(c.cle)?.date_cible ?? null
       return planifiee === null ? c : { ...c, date_cible: planifiee, date_planifiee: true }
  })
}

/** Le domaine est obligatoire en base : une action sans domaine ne peut pas être planifiée. */
export function peutPlanifier(a: Pick<ActionRoadmap, "cle" | "domaine">): boolean {
  return a.domaine !== null && sourceDeCle(a.cle) !== null
}

/** Instantané du score à l'adoption (colonne jsonb score_detail). */
export interface InstantaneScore {
  criteres: Record<CritereId, number>
  contributions: Record<CritereId, number>
  poids: ParametresPriorite
  calcule_le: string
  calcule_par: "client"
}

/** Ligne à insérer dans trajectoire_actions. Le statut, l'archivage et les liens missions sont fixés par la base. */
export interface NouvelleAction {
  organisation_id: string
  exigence_id: string | null
  extraction_id: string | null
  titre: string
  domaine: DomaineTrajectoire
  horizon: HorizonId | null
  date_cible: string | null
  score_priorite: number
  score_detail: InstantaneScore
  cout_estime: number | null
  gain_estime: number | null
    gain_unite: "eur" | null
  /** Actif de l'exigence ou de la preuve ; absent au niveau organisation. */
  actif_id?: string | null
}

/** null si l'action ne peut pas être planifiée (voir peutPlanifier). */
export function versNouvelleAction(
  a: ActionRoadmap,
  organisationId: string,
  params: ParametresPriorite,
  aujourdhui: string,
): NouvelleAction | null {
  const source = sourceDeCle(a.cle)
  if (source === null || a.domaine === null) return null
  return {
    organisation_id: organisationId,
    exigence_id: source.origine === "exigence" ? source.id : null,
    extraction_id: source.origine === "extraction" ? source.id : null,
    titre: a.titre,
    domaine: a.domaine,
    horizon: a.horizon,
    date_cible: a.date_cible,
    score_priorite: a.score,
    score_detail: {
      criteres: a.detail.criteres,
      contributions: a.detail.contributions,
      poids: params,
      calcule_le: aujourdhui,
      calcule_par: "client",
    },
    cout_estime: a.cout_estime,
    gain_estime: a.gain_estime,
       gain_unite: a.gain_estime !== null ? "eur" : null,
    ...(a.actif_id ? { actif_id: a.actif_id } : {}),
  }
}