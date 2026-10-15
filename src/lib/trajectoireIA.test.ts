import { describe, it, expect } from "vitest"
import { TEXTE_CONSENTEMENT, TEXTE_CONSENTEMENT_VERSION, peutRelancer } from "./trajectoireIA"

describe("peutRelancer", () => {
  it("réservée au personnel AGE", () => {
    expect(peutRelancer("echec", true, true)).toBe(true)
    expect(peutRelancer("echec", false, true)).toBe(false)
  })
  it("exige le consentement de l'organisation", () => expect(peutRelancer("echec", true, false)).toBe(false))
  it("possible pour un document déposé, en échec ou partiel", () => {
    for (const s of ["depose", "echec", "partiel"] as const) expect(peutRelancer(s, true, true)).toBe(true)
  })
  it("impossible pour un document en cours d'analyse, classé ou extrait", () => {
    for (const s of ["en_analyse", "classe", "extrait"] as const) expect(peutRelancer(s, true, true)).toBe(false)
  })
})

describe("texte de consentement", () => {
  it("porte une version", () => expect(TEXTE_CONSENTEMENT_VERSION).not.toBe(""))
  it("contient les quatre paragraphes validés", () => {
    expect(TEXTE_CONSENTEMENT.paragraphes.map(p => p.titre)).toEqual([
      "Ce qui est transmis.", "Ce qui est produit.", "Vos données.", "Votre choix.",
    ])
  })
})