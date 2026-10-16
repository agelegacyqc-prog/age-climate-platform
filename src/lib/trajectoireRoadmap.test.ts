// src/lib/trajectoireRoadmap.test.ts
import { describe, expect, it } from "vitest"
import type { ExigenceLigne } from "./trajectoire"
import type { TypeExtraction } from "./trajectoireExtractions"
import {
  PARAMETRES_PAR_DEFAUT,
  calculerRoadmap,
  calculerScore,
  candidatsDepuisExigences,
  candidatsDepuisExtractions,
  critereEcheance,
  critereLegal,
  horizonDe,
  joursEntre,
  scoreExposition,
  type CandidatAction,
  type ExtractionSource,
  type LigneAction,
  appliquerDatesPlanifiees,
  cleDeLigne,
  indexerLignes,
  peutPlanifier,
  sourceDeCle,
  versNouvelleAction,
} from "./trajectoireRoadmap"

const AUJ = "2026-10-16"
const P = PARAMETRES_PAR_DEFAUT

function cand(o: Partial<CandidatAction> = {}): CandidatAction {
  return {
    cle: "exigence:x", origine: "exigence", titre: "Action", domaine: null, qualification: null,
    sanction_prevue: false, date_cible: null, cout_estime: null, gain_estime: null,
    score_expo: null, en_attente_age: false, ...o,
  }
}

describe("paramètres par défaut", () => {
  it("les poids totalisent 1", () => {
    const somme = P.w_leg + P.w_ech + P.w_sanc + P.w_gain + P.w_cout + P.w_expo
    expect(somme).toBeCloseTo(1, 12)
  })
})

describe("joursEntre", () => {
  it("compte les jours calendaires", () => {
    expect(joursEntre("2026-10-16", "2026-10-26")).toBe(10)
    expect(joursEntre("2026-10-16", "2027-10-16")).toBe(365)
    expect(joursEntre("2026-10-16", "2026-10-15")).toBe(-1)
  })
})

describe("critereLegal", () => {
  it("1 / 0,5 / 0 selon la qualification", () => {
    expect(critereLegal("obligatoire")).toBe(1)
    expect(critereLegal("potentielle")).toBe(0.5)
    expect(critereLegal("volontaire")).toBe(0)
    expect(critereLegal(null)).toBe(0)
  })
})

describe("critereEcheance", () => {
  it("0 sans échéance", () => {
    expect(critereEcheance(null, AUJ, 730)).toBe(0)
  })
  it("1 si échéance dépassée ou du jour", () => {
    expect(critereEcheance("2026-10-15", AUJ, 730)).toBe(1)
    expect(critereEcheance("2026-10-16", AUJ, 730)).toBe(1)
  })
  it("décroît linéairement jusqu'au seuil", () => {
    expect(critereEcheance("2027-10-16", AUJ, 730)).toBeCloseTo(0.5, 12) // j = 365
    expect(critereEcheance("2028-10-16", AUJ, 1000)).toBeCloseTo(1 - 731 / 1000, 12)
  })
  it("0 au-delà du seuil", () => {
    expect(critereEcheance("2029-10-16", AUJ, 730)).toBe(0)
  })
})

describe("horizonDe", () => {
  it("null sans date cible", () => {
    expect(horizonDe(null, AUJ)).toBeNull()
  })
  it("échéance dépassée : 0–3 mois", () => {
    expect(horizonDe("2026-01-01", AUJ)).toBe("0_3m")
  })
  it("bornes incluses à +3, +12 et +36 mois", () => {
    expect(horizonDe("2027-01-16", AUJ)).toBe("0_3m")
    expect(horizonDe("2027-01-17", AUJ)).toBe("3_12m")
    expect(horizonDe("2027-10-16", AUJ)).toBe("3_12m")
    expect(horizonDe("2027-10-17", AUJ)).toBe("12_36m")
    expect(horizonDe("2029-10-16", AUJ)).toBe("12_36m")
    expect(horizonDe("2029-10-17", AUJ)).toBe("36m_plus")
  })
})

describe("calculerScore", () => {
  it("cas complet calculé à la main : S = 75,5", () => {
    // c_leg 1 ; c_ech 1 − 365/730 = 0,5 ; c_sanc 1 ; c_gain 5000/10000 = 0,5 ;
    // c_cout 1 − 2000/8000 = 0,75 ; c_expo 60/100 = 0,6
    // S = 100 × (0,30 + 0,125 + 0,15 + 0,075 + 0,075 + 0,03) = 75,5
    const c = cand({
      qualification: "obligatoire", date_cible: "2027-10-16", sanction_prevue: true,
      gain_estime: 5000, cout_estime: 2000, score_expo: 60,
    })
    const { score, detail } = calculerScore(c, { gainMax: 10000, coutMax: 8000, aujourdhui: AUJ, params: P })
    expect(score).toBeCloseTo(75.5, 9)
    expect(detail.criteres.leg).toBe(1)
    expect(detail.criteres.ech).toBeCloseTo(0.5, 12)
    expect(detail.criteres.sanc).toBe(1)
    expect(detail.criteres.gain).toBeCloseTo(0.5, 12)
    expect(detail.criteres.cout).toBeCloseTo(0.75, 12)
    expect(detail.criteres.expo).toBeCloseTo(0.6, 12)
    expect(detail.contributions.leg).toBeCloseTo(30, 9)
    expect(detail.contributions.ech).toBeCloseTo(12.5, 9)
    expect(detail.contributions.sanc).toBeCloseTo(15, 9)
    expect(detail.contributions.gain).toBeCloseTo(7.5, 9)
    expect(detail.contributions.cout).toBeCloseTo(7.5, 9)
    expect(detail.contributions.expo).toBeCloseTo(3, 9)
  })

  it("la somme des contributions égale S", () => {
    const c = cand({ qualification: "potentielle", date_cible: "2027-03-01", gain_estime: 100, cout_estime: 50, score_expo: 33 })
    const { score, detail } = calculerScore(c, { gainMax: 400, coutMax: 200, aujourdhui: AUJ, params: P })
    const somme = Object.values(detail.contributions).reduce((a, b) => a + b, 0)
    expect(score).toBeCloseTo(somme, 12)
  })

  it("action sans aucune donnée : S = 0", () => {
    const { score } = calculerScore(cand(), { gainMax: 0, coutMax: 0, aujourdhui: AUJ, params: P })
    expect(score).toBe(0)
  })

  it("gain ou coût inconnu : critère à 0 (jamais favorable par défaut)", () => {
    const { detail } = calculerScore(cand(), { gainMax: 10000, coutMax: 8000, aujourdhui: AUJ, params: P })
    expect(detail.criteres.gain).toBe(0)
    expect(detail.criteres.cout).toBe(0)
  })

  it("coût maximal de l'organisation : c_cout = 0 ; coût nul : c_cout = 1", () => {
    const max = calculerScore(cand({ cout_estime: 8000 }), { gainMax: 0, coutMax: 8000, aujourdhui: AUJ, params: P })
    const nul = calculerScore(cand({ cout_estime: 0 }), { gainMax: 0, coutMax: 8000, aujourdhui: AUJ, params: P })
    expect(max.detail.criteres.cout).toBe(0)
    expect(nul.detail.criteres.cout).toBe(1)
  })

  it("exposition bornée à [0 ; 1]", () => {
    const { detail } = calculerScore(cand({ score_expo: 140 }), { gainMax: 0, coutMax: 0, aujourdhui: AUJ, params: P })
    expect(detail.criteres.expo).toBe(1)
  })

  it("applique les poids fournis", () => {
    const params = { ...P, w_leg: 0.5 }
    const { score } = calculerScore(cand({ qualification: "obligatoire" }), { gainMax: 0, coutMax: 0, aujourdhui: AUJ, params })
    expect(score).toBeCloseTo(50, 9)
  })
})

describe("calculerRoadmap", () => {
  const B = cand({ cle: "b", titre: "B en retard", qualification: "volontaire", date_cible: "2026-10-01" }) // S = 25
  const A = cand({ cle: "a", titre: "A", qualification: "obligatoire", date_cible: "2027-10-16" }) // S = 42,5
  const D = cand({ cle: "d", titre: "D", qualification: "potentielle", date_cible: "2027-10-16" }) // S = 27,5
  const C = cand({ cle: "c", titre: "C sans date", qualification: "obligatoire" }) // S = 30

  it("ordonne par horizon, puis S décroissant ; sans date en dernier", () => {
    const r = calculerRoadmap([C, D, A, B], P, AUJ)
    expect(r.map(x => x.cle)).toEqual(["b", "a", "d", "c"])
    expect(r[0].score).toBeCloseTo(25, 9)
    expect(r[1].score).toBeCloseTo(42.5, 9)
    expect(r[2].score).toBeCloseTo(27.5, 9)
    expect(r[3].score).toBeCloseTo(30, 9)
  })

  it("renseigne horizon et retard", () => {
    const r = calculerRoadmap([A, B, C], P, AUJ)
    const parCle = Object.fromEntries(r.map(x => [x.cle, x]))
    expect(parCle.b.horizon).toBe("0_3m")
    expect(parCle.b.en_retard).toBe(true)
    expect(parCle.a.horizon).toBe("3_12m")
    expect(parCle.a.en_retard).toBe(false)
    expect(parCle.c.horizon).toBeNull()
    expect(parCle.c.en_retard).toBe(false)
  })

  it("normalise gain et coût par les maxima de l'organisation", () => {
    const g1 = cand({ cle: "g1", gain_estime: 1000, cout_estime: 100 })
    const g2 = cand({ cle: "g2", gain_estime: 4000, cout_estime: 400 })
    const r = calculerRoadmap([g1, g2], P, AUJ)
    const parCle = Object.fromEntries(r.map(x => [x.cle, x]))
    expect(parCle.g1.detail.criteres.gain).toBeCloseTo(0.25, 12)
    expect(parCle.g2.detail.criteres.gain).toBe(1)
    expect(parCle.g1.detail.criteres.cout).toBeCloseTo(0.75, 12)
    expect(parCle.g2.detail.criteres.cout).toBe(0)
  })

  it("liste vide", () => {
    expect(calculerRoadmap([], P, AUJ)).toEqual([])
  })
})

describe("scoreExposition", () => {
  const scores = { a: 40, b: 80 }
  it("score de l'actif concerné", () => {
    expect(scoreExposition("a", scores)).toBe(40)
  })
  it("actif sans score : null", () => {
    expect(scoreExposition("z", scores)).toBeNull()
  })
  it("niveau organisation : moyenne des actifs scorés", () => {
    expect(scoreExposition(null, scores)).toBe(60)
  })
  it("niveau organisation sans aucun score : null", () => {
    expect(scoreExposition(null, {})).toBeNull()
  })
})

/** Exigence minimale ; ExigenceLigne complet n'est pas nécessaire aux calculs. */
function exig(o: Record<string, unknown> = {}): ExigenceLigne {
  return {
    id: "e1", archivee: false, statut: "non_conforme", qualification: "obligatoire", actif_id: null,
    referentiel_id: "R1", prochaine_echeance: "2027-10-16", derniere_realisation: null,
    valide_client_le: null, valide_age_le: null,
    referentiel: {
      libelle: "Exigence 1", domaine: "adaptation", sanction_prevue: true,
      echeance_type: null, echeance_date: null, recurrence_mois: null,
    },
    ...o,
  } as unknown as ExigenceLigne
}

describe("candidatsDepuisExigences", () => {
  it("retient non conforme, en cours et à évaluer ; écarte conforme, non applicable et archivées", () => {
    const liste = [
      exig({ id: "1", statut: "non_conforme" }),
      exig({ id: "2", statut: "en_cours" }),
      exig({ id: "3", statut: "a_evaluer" }),
      exig({ id: "4", statut: "conforme" }),
      exig({ id: "5", statut: "non_applicable" }),
      exig({ id: "6", statut: "non_conforme", archivee: true }),
    ]
    const r = candidatsDepuisExigences(liste, {})
    expect(r.map(x => x.cle)).toEqual(["exigence:1", "exigence:2", "exigence:3"])
  })

  it("reprend libellé, qualification, sanction, échéance effective et exposition", () => {
    const r = candidatsDepuisExigences([exig({ actif_id: "a" })], { a: 70 })
    expect(r).toHaveLength(1)
    expect(r[0].origine).toBe("exigence")
    expect(r[0].titre).toBe("Exigence 1")
    expect(r[0].qualification).toBe("obligatoire")
    expect(r[0].sanction_prevue).toBe(true)
    expect(r[0].date_cible).toBe("2027-10-16")
    expect(r[0].score_expo).toBe(70)
    expect(r[0].cout_estime).toBeNull()
    expect(r[0].gain_estime).toBeNull()
  })
})

function extr(o: Partial<ExtractionSource> = {}): ExtractionSource {
  return {
    id: "x1", type_extraction: "recommandation", contenu: "Installer une protection", domaine: null,
    referentiel_id: null, echeance: null, cout_estime: null, gain_estime: null, gain_unite: null,
    statut: "valide_client", ...o,
  }
}

describe("candidatsDepuisExtractions", () => {
  it("retient les recommandations validées au moins par le client", () => {
    const r = candidatsDepuisExtractions(
      [
        extr({ id: "1", statut: "valide_client" }),
        extr({ id: "2", statut: "valide_age" }),
        extr({ id: "3", statut: "propose" }),
        extr({ id: "4", type_extraction: "autre" as unknown as TypeExtraction }),
      ],
      [],
      {},
    )
    expect(r.map(x => x.cle)).toEqual(["extraction:1", "extraction:2"])
  })

  it("en attente de confirmation AGE tant que seul le client a validé", () => {
    const r = candidatsDepuisExtractions([extr({ id: "1", statut: "valide_client" }), extr({ id: "2", statut: "valide_age" })], [], {})
    expect(r[0].en_attente_age).toBe(true)
    expect(r[1].en_attente_age).toBe(false)
  })

  it("sans exigence liée : c_leg = 0 et c_sanc = 0", () => {
    const [a] = candidatsDepuisExtractions([extr()], [], {})
    expect(a.qualification).toBeNull()
    expect(a.sanction_prevue).toBe(false)
    expect(critereLegal(a.qualification)).toBe(0)
  })

  it("avec exigence liée : hérite qualification, sanction, domaine et échéance", () => {
    const [a] = candidatsDepuisExtractions([extr({ referentiel_id: "R1" })], [exig()], {})
    expect(a.qualification).toBe("obligatoire")
    expect(a.sanction_prevue).toBe(true)
    expect(a.domaine).toBe("adaptation")
    expect(a.date_cible).toBe("2027-10-16")
  })

  it("l'échéance de l'extraction prime sur celle de l'exigence", () => {
    const [a] = candidatsDepuisExtractions([extr({ referentiel_id: "R1", echeance: "2027-02-01" })], [exig()], {})
    expect(a.date_cible).toBe("2027-02-01")
  })

  it("gain retenu seulement s'il est en euros (v1)", () => {
    const [eur, kwh] = candidatsDepuisExtractions(
      [extr({ id: "1", gain_estime: 900, gain_unite: "eur" }), extr({ id: "2", gain_estime: 900, gain_unite: "kwh" })],
      [],
      {},
    )
    expect(eur.gain_estime).toBe(900)
    expect(kwh.gain_estime).toBeNull()
  })

  it("exigence liée à l'organisation préférée à celle d'un actif", () => {
    const parActif = exig({ id: "e-actif", actif_id: "a", qualification: "volontaire" })
    const org = exig({ id: "e-org", actif_id: null, qualification: "obligatoire" })
    const [a] = candidatsDepuisExtractions([extr({ referentiel_id: "R1" })], [parActif, org], { a: 90 })
    expect(a.qualification).toBe("obligatoire")
  })
})
function lig(o: Partial<LigneAction> = {}): LigneAction {
  return { id: "l1", exigence_id: "e1", extraction_id: null, statut: "a_lancer", responsable: null, date_cible: null, archivee: false, ...o }
}

describe("cleDeLigne / indexerLignes / sourceDeCle", () => {
  it("clé de lien selon la source", () => {
    expect(cleDeLigne(lig())).toBe("exigence:e1")
    expect(cleDeLigne(lig({ exigence_id: null, extraction_id: "x1" }))).toBe("extraction:x1")
    expect(cleDeLigne(lig({ exigence_id: null, extraction_id: null }))).toBeNull()
  })

  it("l'index ignore les lignes archivées", () => {
    const index = indexerLignes([lig({ id: "a" }), lig({ id: "b", exigence_id: "e2", archivee: true }), lig({ id: "c", exigence_id: null, extraction_id: "x1" })])
    expect([...index.keys()].sort()).toEqual(["exigence:e1", "extraction:x1"])
    expect(index.get("exigence:e1")?.id).toBe("a")
  })

  it("sourceDeCle décode la clé et refuse les clés invalides", () => {
    expect(sourceDeCle("exigence:abc")).toEqual({ origine: "exigence", id: "abc" })
    expect(sourceDeCle("extraction:a:b")).toEqual({ origine: "extraction", id: "a:b" })
    expect(sourceDeCle("inconnu:1")).toBeNull()
    expect(sourceDeCle("exigence:")).toBeNull()
    expect(sourceDeCle("sans-separateur")).toBeNull()
  })
})

describe("appliquerDatesPlanifiees", () => {
  it("utilise la date de l'action enregistrée quand la source n'a pas d'échéance", () => {
    const r = appliquerDatesPlanifiees([cand({ cle: "exigence:e1" })], [lig({ date_cible: "2027-05-01" })])
        expect(r[0].date_cible).toBe("2027-05-01")
    expect(r[0].date_planifiee).toBe(true)
  })

  it("l'échéance de la source prime", () => {
    const r = appliquerDatesPlanifiees([cand({ cle: "exigence:e1", date_cible: "2027-02-01" })], [lig({ date_cible: "2027-05-01" })])
       expect(r[0].date_cible).toBe("2027-02-01")
    expect(r[0].date_planifiee).toBeUndefined()
  })

  it("ignore les actions archivées et les candidats sans action enregistrée", () => {
    const sans = cand({ cle: "exigence:e9" })
    const r = appliquerDatesPlanifiees([cand({ cle: "exigence:e1" }), sans], [lig({ date_cible: "2027-05-01", archivee: true })])
    expect(r[0].date_cible).toBeNull()
    expect(r[1]).toBe(sans)
  })

  it("la date planifiée alimente l'horizon et le score", () => {
    const [c] = appliquerDatesPlanifiees([cand({ cle: "exigence:e1", qualification: "obligatoire" })], [lig({ date_cible: "2027-10-16" })])
    const [a] = calculerRoadmap([c], P, AUJ)
    expect(a.horizon).toBe("3_12m")
    expect(a.score).toBeCloseTo(42.5, 9) // 30 (légal) + 12,5 (échéance à 365 j)
  })
})

describe("peutPlanifier", () => {
  it("exige un domaine et une clé valide", () => {
    expect(peutPlanifier({ cle: "exigence:e1", domaine: "energie" })).toBe(true)
    expect(peutPlanifier({ cle: "exigence:e1", domaine: null })).toBe(false)
    expect(peutPlanifier({ cle: "invalide", domaine: "energie" })).toBe(false)
  })
})

describe("versNouvelleAction", () => {
  const base = cand({
    cle: "exigence:e1", titre: "Audit énergétique", domaine: "energie", qualification: "obligatoire",
    date_cible: "2027-10-16", sanction_prevue: true,
  })

  it("construit la ligne à insérer avec l'instantané du score", () => {
    const [a] = calculerRoadmap([base], P, AUJ)
    const n = versNouvelleAction(a, "org1", P, AUJ)
    expect(n).not.toBeNull()
    if (n === null) return
    expect(n.organisation_id).toBe("org1")
    expect(n.exigence_id).toBe("e1")
    expect(n.extraction_id).toBeNull()
    expect(n.titre).toBe("Audit énergétique")
    expect(n.domaine).toBe("energie")
    expect(n.horizon).toBe("3_12m")
    expect(n.date_cible).toBe("2027-10-16")
    expect(n.score_priorite).toBeCloseTo(57.5, 9) // 30 + 12,5 + 15
    expect(n.score_detail.poids).toEqual(P)
    expect(n.score_detail.calcule_le).toBe(AUJ)
    expect(n.score_detail.calcule_par).toBe("client")
    expect(n.score_detail.contributions.sanc).toBeCloseTo(15, 9)
    expect(n.gain_estime).toBeNull()
    expect(n.gain_unite).toBeNull()
  })

  it("source extraction et gain en euros", () => {
    const [a] = calculerRoadmap([{ ...base, cle: "extraction:x1", origine: "extraction", gain_estime: 100, cout_estime: 40 }], P, AUJ)
    const n = versNouvelleAction(a, "org1", P, AUJ)
    expect(n?.exigence_id).toBeNull()
    expect(n?.extraction_id).toBe("x1")
    expect(n?.gain_estime).toBe(100)
    expect(n?.gain_unite).toBe("eur")
    expect(n?.cout_estime).toBe(40)
  })

  it("refuse une action sans domaine ou sans clé valide", () => {
    const [sansDomaine] = calculerRoadmap([{ ...base, domaine: null }], P, AUJ)
    const [cleInvalide] = calculerRoadmap([{ ...base, cle: "invalide" }], P, AUJ)
    expect(versNouvelleAction(sansDomaine, "org1", P, AUJ)).toBeNull()
    expect(versNouvelleAction(cleInvalide, "org1", P, AUJ)).toBeNull()
  })
})