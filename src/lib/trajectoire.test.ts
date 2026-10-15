import { describe, it, expect } from "vitest"
import {
  ajouterMois, aujourdhuiISO, echeanceEffective, estEnRetard, fmtDateFR, fmtPct, maturite, statutAffiche,
  type ReferentielEntree,
} from "./trajectoire"

const ref = (p: Partial<ReferentielEntree> = {}): ReferentielEntree => ({
  id: "r", code: "x", libelle: "X", domaine: "energie", nature: "reglementaire", cadre: "france",
  description: null, echeance_type: "aucune", echeance_date: null, recurrence_mois: null,
  sanction_prevue: false, source_url: null, actif: true, ...p,
})

describe("maturite", () => {
  it("compte seulement les conformes validées client et AGE, sur les applicables", () => {
    const m = maturite([
      { statut: "conforme", valide_client_le: "2026-10-01", valide_age_le: "2026-10-02" },
      { statut: "en_cours", valide_client_le: null, valide_age_le: null },
      { statut: "a_evaluer", valide_client_le: null, valide_age_le: null },
      { statut: "non_applicable", valide_client_le: null, valide_age_le: null },
    ])
    expect(m.applicables).toBe(3)
    expect(m.conformes).toBe(1)
    expect(m.pct).toBeCloseTo(33.3333333, 6)
  })
  it("renvoie 0 sans exigence applicable", () => {
    expect(maturite([]).pct).toBe(0)
    expect(maturite([{ statut: "non_applicable", valide_client_le: null, valide_age_le: null }]).pct).toBe(0)
  })
  it("n'arrondit pas", () => {
    const m = maturite([
      { statut: "conforme", valide_client_le: "a", valide_age_le: "b" },
      { statut: "en_cours", valide_client_le: null, valide_age_le: null },
      { statut: "en_cours", valide_client_le: null, valide_age_le: null },
    ])
    expect(m.pct).toBe(100 / 3)
  })
})

describe("statutAffiche", () => {
  it("attente_age quand le client a déclaré sans confirmation AGE", () => {
    expect(statutAffiche({ statut: "en_cours", valide_client_le: "2026-10-01", valide_age_le: null })).toBe("attente_age")
  })
  it("garde conforme et non_applicable", () => {
    expect(statutAffiche({ statut: "conforme", valide_client_le: "a", valide_age_le: "b" })).toBe("conforme")
    expect(statutAffiche({ statut: "non_applicable", valide_client_le: "a", valide_age_le: null })).toBe("non_applicable")
  })
  it("garde le statut sans déclaration", () => {
    expect(statutAffiche({ statut: "a_evaluer", valide_client_le: null, valide_age_le: null })).toBe("a_evaluer")
  })
})

describe("ajouterMois", () => {
  it("ajoute 48 mois", () => expect(ajouterMois("2024-06-18", 48)).toBe("2028-06-18"))
  it("ramène au dernier jour du mois", () => expect(ajouterMois("2024-02-29", 12)).toBe("2025-02-28"))
  it("passe l'année", () => expect(ajouterMois("2026-11-15", 3)).toBe("2027-02-15"))
})

describe("echeanceEffective / estEnRetard", () => {
  it("préfère prochaine_echeance", () => {
    expect(echeanceEffective({ prochaine_echeance: "2027-01-01", derniere_realisation: null, referentiel: ref({ echeance_date: "2030-01-01" }) })).toBe("2027-01-01")
  })
  it("pluriannuelle : dernière réalisation + récurrence", () => {
    const e = { prochaine_echeance: null, derniere_realisation: "2024-06-18", referentiel: ref({ echeance_type: "pluriannuelle", recurrence_mois: 48 }) }
    expect(echeanceEffective(e)).toBe("2028-06-18")
  })
  it("pluriannuelle sans réalisation : pas d'échéance", () => {
    expect(echeanceEffective({ prochaine_echeance: null, derniere_realisation: null, referentiel: ref({ echeance_type: "pluriannuelle", recurrence_mois: 48 }) })).toBeNull()
  })
  it("fallback sur la date du référentiel", () => {
    expect(echeanceEffective({ prochaine_echeance: null, derniere_realisation: null, referentiel: ref({ echeance_type: "annuelle", echeance_date: "2026-09-30" }) })).toBe("2026-09-30")
  })
  it("en retard si échéance dépassée et non traitée", () => {
    const base = { prochaine_echeance: null, derniere_realisation: null, referentiel: ref({ echeance_type: "annuelle", echeance_date: "2026-09-30" }) }
    expect(estEnRetard({ ...base, statut: "en_cours" }, "2026-10-15")).toBe(true)
    expect(estEnRetard({ ...base, statut: "conforme" }, "2026-10-15")).toBe(false)
    expect(estEnRetard({ ...base, statut: "non_applicable" }, "2026-10-15")).toBe(false)
    expect(estEnRetard({ ...base, statut: "en_cours" }, "2026-09-30")).toBe(false)
  })
})

describe("formats FR", () => {
  it("date", () => { expect(fmtDateFR("2026-10-15")).toBe("15/10/2026"); expect(fmtDateFR("2026-10-15T08:00:00+00:00")).toBe("15/10/2026"); expect(fmtDateFR(null)).toBe("—") })
  it("pourcentage avec espace insécable", () => { expect(fmtPct(12.5)).toBe("12,50 %"); expect(fmtPct(0)).toBe("0,00 %") })
  it("aujourdhuiISO", () => expect(aujourdhuiISO(new Date(2026, 9, 5))).toBe("2026-10-05"))
})