/**
 * brownValueEngine.ts
 * Moteur de calcul Brown Value — côté client (recalcul temps réel < 150 ms)
 * Source de vérité : modele_decote_climatique.xlsx v1.0
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MethodeFinale = "DCF" | "Marché" | "MAX" | "Pondérée"

export interface HazardInput {
  aleas: string
  probAnnuelle: number
  dommageMoyen: number
  partNonAssuree: number
  facteurVulnerabilite: number
  coutAdaptation: number
  reductionRisque: number
  adaptationRealisee: boolean
}

export interface BrownValueInputs {
  valeurMarche: number
  surface: number
  typeBien: string
  etage: number
  anneeConstruction: number
  rdcVulnerable: boolean
  fondations: string
  tensionMarcheLocal: string
  delaiVenteLocal: number
  horizonAnnees: number
  tauxActualisation: number
  croissanceRisque: number
  primeAssuranceActuelle: number
  surprimeAnnuelle: number
  coutPortage: number
  surcroitDelai: number
  capDecote: number
  poidsDCF: number
  methodeFinale: MethodeFinale
  decoteMarcheCible: number
  primeAversion: number
  greenPremium: number
  hazards: HazardInput[]
}

export interface HazardResult {
  aleas: string
  probAjustee: number
  eal: number
  npvPertes: number
  npvAdaptation: number
  coutTotalAlea: number
}

export interface BrownValueResult {
  facteurPV: number
  hazardResults: HazardResult[]
  npvPertesTotal: number
  npvAdaptationsTotal: number
  npvTotalAleas: number
  npvSurprime: number
  penaliteLiquidite: number
  decoteAversion: number
  decoteDCF: number
  capDecoteEuros: number
  decoteDCFCapee: number
  decoteMarche: number
  decoteFinale: number
  bonusGreenPremium: number
  valeurAjustee: number
  impactNet: number
  methodeFinale: MethodeFinale
}

// ─── Moteur ───────────────────────────────────────────────────────────────────

export function calculerFacteurPV(r: number, g: number, n: number): number {
  if (Math.abs(r - g) < 1e-7) {
    return n / (1 + r)
  }
  return (1 - Math.pow((1 + g) / (1 + r), n)) / (r - g)
}

export function calculerProbAjustee(
  probAnnuelle: number,
  reductionRisque: number,
  adaptationRealisee: boolean
): number {
  if (adaptationRealisee) {
    return probAnnuelle * (1 - reductionRisque / 100)
  }
  return probAnnuelle
}

export function calculerEAL(
  probAjustee: number,
  dommageMoyen: number,
  partNonAssuree: number,
  facteurVulnerabilite: number
): number {
  return (probAjustee / 100) * dommageMoyen * (partNonAssuree / 100) * facteurVulnerabilite
}

export function calculerHazard(hazard: HazardInput, facteurPV: number): HazardResult {
  const probAjustee = calculerProbAjustee(
    hazard.probAnnuelle,
    hazard.reductionRisque,
    hazard.adaptationRealisee
  )
  const eal = calculerEAL(
    probAjustee,
    hazard.dommageMoyen,
    hazard.partNonAssuree,
    hazard.facteurVulnerabilite
  )
  const npvPertes = eal * facteurPV
  const npvAdaptation = hazard.adaptationRealisee ? hazard.coutAdaptation : 0
  return {
    aleas: hazard.aleas,
    probAjustee,
    eal,
    npvPertes,
    npvAdaptation,
    coutTotalAlea: npvPertes + npvAdaptation,
  }
}

export function calculerBrownValue(inputs: BrownValueInputs): BrownValueResult {
  const {
    valeurMarche: V,
    horizonAnnees: n,
    tauxActualisation: r,
    croissanceRisque: g,
    surprimeAnnuelle,
    coutPortage,
    surcroitDelai,
    capDecote,
    poidsDCF: w,
    methodeFinale,
    decoteMarcheCible,
    primeAversion,
    greenPremium,
    hazards,
  } = inputs

  const facteurPV = calculerFacteurPV(r, g, n)

  const hazardResults: HazardResult[] = hazards.map((h) => calculerHazard(h, facteurPV))

  const npvPertesTotal = hazardResults.reduce((acc, h) => acc + h.npvPertes, 0)
  const npvAdaptationsTotal = hazardResults.reduce((acc, h) => acc + h.npvAdaptation, 0)
  const npvTotalAleas = npvPertesTotal + npvAdaptationsTotal

  const npvSurprime = surprimeAnnuelle * facteurPV
  const penaliteLiquidite = coutPortage * (surcroitDelai / 30)
  const decoteAversion = (primeAversion / 100) * V

  const decoteDCF = npvTotalAleas + npvSurprime + penaliteLiquidite + decoteAversion

  const capDecoteEuros = (capDecote / 100) * V
  const decoteDCFCapee = Math.min(decoteDCF, capDecoteEuros)

  const decoteMarche = (decoteMarcheCible / 100) * V

  let decoteFinale: number
  switch (methodeFinale) {
    case "DCF":
      decoteFinale = decoteDCFCapee
      break
    case "Marché":
      decoteFinale = decoteMarche
      break
    case "MAX":
      decoteFinale = Math.max(decoteDCFCapee, decoteMarche)
      break
    case "Pondérée":
      decoteFinale = w * decoteDCFCapee + (1 - w) * decoteMarche
      break
    default:
      decoteFinale = Math.max(decoteDCFCapee, decoteMarche)
  }

  const bonusGreenPremium = (greenPremium / 100) * V
  const valeurAjustee = V - decoteFinale + bonusGreenPremium
  const impactNet = (valeurAjustee - V) / V

  return {
    facteurPV,
    hazardResults,
    npvPertesTotal,
    npvAdaptationsTotal,
    npvTotalAleas,
    npvSurprime,
    penaliteLiquidite,
    decoteAversion,
    decoteDCF,
    capDecoteEuros,
    decoteDCFCapee,
    decoteMarche,
    decoteFinale,
    bonusGreenPremium,
    valeurAjustee,
    impactNet,
    methodeFinale,
  }
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

export function getImpactNetStyle(impactNet: number): {
  color: string
  background: string
  icon: string
  label: string
} {
  if (impactNet >= -0.03) {
    return { color: "#2F7D5C", background: "#dcfce7", icon: "check-circle", label: "Impact faible" }
  }
  if (impactNet > -0.10) {
    return { color: "#D97706", background: "#fef3c7", icon: "alert-triangle", label: "Impact modéré" }
  }
  return { color: "#B91C1C", background: "#fee2e2", icon: "octagon-x", label: "Impact fort" }
}

export function formatEuros(value: number, decimals = 0): string {
  return (
    value
      .toFixed(decimals)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") +
    "\u00A0€"
  )
}

export function formatPct(value: number, decimals = 2): string {
  return (value * 100).toFixed(decimals).replace(".", ",") + "\u00A0%"
}

// ─── Valeurs par défaut ───────────────────────────────────────────────────────

export const HAZARDS_DEFAUT: HazardInput[] = [
  {
    aleas: "Inondation (PPRI / débordement)",
    probAnnuelle: 1,
    dommageMoyen: 25000,
    partNonAssuree: 15,
    facteurVulnerabilite: 1,
    coutAdaptation: 12000,
    reductionRisque: 40,
    adaptationRealisee: false,
  },
  {
    aleas: "Submersion marine / recul du trait de côte",
    probAnnuelle: 0.2,
    dommageMoyen: 50000,
    partNonAssuree: 20,
    facteurVulnerabilite: 1,
    coutAdaptation: 20000,
    reductionRisque: 50,
    adaptationRealisee: false,
  },
  {
    aleas: "Retrait-gonflement des argiles (RGA)",
    probAnnuelle: 1.5,
    dommageMoyen: 18000,
    partNonAssuree: 25,
    facteurVulnerabilite: 1.1,
    coutAdaptation: 8000,
    reductionRisque: 30,
    adaptationRealisee: false,
  },
  {
    aleas: "Feux de forêt",
    probAnnuelle: 0.3,
    dommageMoyen: 35000,
    partNonAssuree: 10,
    facteurVulnerabilite: 1,
    coutAdaptation: 7000,
    reductionRisque: 35,
    adaptationRealisee: false,
  },
  {
    aleas: "Tempête / grêle / vents extrêmes",
    probAnnuelle: 1,
    dommageMoyen: 8000,
    partNonAssuree: 5,
    facteurVulnerabilite: 1,
    coutAdaptation: 3000,
    reductionRisque: 15,
    adaptationRealisee: false,
  },
  {
    aleas: "Îlot de chaleur / surchauffe (perte d'usage)",
    probAnnuelle: 2,
    dommageMoyen: 3000,
    partNonAssuree: 100,
    facteurVulnerabilite: 0.9,
    coutAdaptation: 5000,
    reductionRisque: 50,
    adaptationRealisee: false,
  },
]

export const INPUTS_DEFAUT: BrownValueInputs = {
  valeurMarche: 270000,
  surface: 100,
  typeBien: "Maison",
  etage: 0,
  anneeConstruction: 1995,
  rdcVulnerable: true,
  fondations: "Superficielles",
  tensionMarcheLocal: "Moyenne",
  delaiVenteLocal: 90,
  horizonAnnees: 20,
  tauxActualisation: 0.04,
  croissanceRisque: 0.015,
  primeAssuranceActuelle: 900,
  surprimeAnnuelle: 250,
  coutPortage: 1200,
  surcroitDelai: 45,
  capDecote: 25,
  poidsDCF: 0.6,
  methodeFinale: "MAX",
  decoteMarcheCible: 8,
  primeAversion: 0,
  greenPremium: 0,
  hazards: HAZARDS_DEFAUT,
}