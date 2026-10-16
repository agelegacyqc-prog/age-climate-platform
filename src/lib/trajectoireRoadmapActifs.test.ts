// src/lib/trajectoireRoadmapActifs.test.ts
//
// Point 6 : règle de couverture C pour les preuves (extractions) face à des exigences par actif.
//  - preuve rattachée à un actif : l'exigence de cet actif ;
//  - preuve sans actif : toutes les exigences du référentiel (qualification la plus forte,
//    exposition moyenne des actifs concernés).
// Hypothèse : runner Vitest (à adapter l'import si le projet utilise des globals).

import { describe, expect, it } from "vitest"
import type { ExigenceLigne, Qualification } from "./trajectoire"
import { agregerLiees, exigencesLiees } from "./trajectoireRoadmap"

interface ParamsExigence {
  id: string
  actif_id: string | null
  referentiel_id: string
  qualification: Qualification
  archivee?: boolean
  sanction_prevue?: boolean
}

/** Exigence minimale : seuls les champs lus par exigencesLiees et agregerLiees sont renseignés. */
function exig(p: ParamsExigence): ExigenceLigne {
  return {
    id: p.id,
    actif_id: p.actif_id,
    referentiel_id: p.referentiel_id,
    qualification: p.qualification,
    archivee: p.archivee ?? false,
    statut: "a_evaluer",
    prochaine_echeance: null,
    derniere_realisation: null,
    referentiel: {
      id: p.referentiel_id,
      domaine: "energie",
      libelle: "Référentiel de test",
      sanction_prevue: p.sanction_prevue ?? false,
      echeance_type: "aucune",
      echeance_date: null,
      recurrence_mois: null,
    },
  } as unknown as ExigenceLigne
}

const REF = "ref-1"
const AUTRE_REF = "ref-2"

const exigences: ExigenceLigne[] = [
  exig({ id: "e-a", actif_id: "A", referentiel_id: REF, qualification: "obligatoire" }),
  exig({ id: "e-b", actif_id: "B", referentiel_id: REF, qualification: "potentielle" }),
  exig({ id: "e-c", actif_id: "C", referentiel_id: REF, qualification: "volontaire", archivee: true }),
  exig({ id: "e-autre", actif_id: "A", referentiel_id: AUTRE_REF, qualification: "volontaire" }),
]

describe("exigencesLiees", () => {
  it("sans référentiel : aucune exigence", () => {
    expect(exigencesLiees(null, null, exigences)).toEqual([])
  })

  it("sans actif : toutes les exigences non archivées du référentiel", () => {
    expect(exigencesLiees(REF, null, exigences).map(e => e.id)).toEqual(["e-a", "e-b"])
  })

  it("avec actif : seulement l'exigence de cet actif", () => {
    expect(exigencesLiees(REF, "B", exigences).map(e => e.id)).toEqual(["e-b"])
  })

  it("avec un actif sans exigence initialisée : aucune exigence (pas de repli sur un autre actif)", () => {
    expect(exigencesLiees(REF, "Z", exigences)).toEqual([])
  })

  it("ignore les exigences archivées", () => {
    expect(exigencesLiees(REF, "C", exigences)).toEqual([])
  })
})

describe("agregerLiees", () => {
  const scores = { A: 80, B: 40 }

  it("aucune exigence liée : null", () => {
    expect(agregerLiees([], scores)).toBeNull()
  })

  it("retient la qualification la plus forte", () => {
    const r = agregerLiees([exigences[1], exigences[0]], scores)
    expect(r?.qualification).toBe("obligatoire")
  })

  it("exposition : moyenne des scores des actifs concernés (non arrondie)", () => {
    const r = agregerLiees([exigences[0], exigences[1]], scores)
    expect(r?.score_expo).toBe(60)
  })

  it("un seul actif : son propre score", () => {
    const r = agregerLiees([exigences[1]], scores)
    expect(r?.score_expo).toBe(40)
  })

  it("ignore les actifs sans score dans la moyenne", () => {
    const r = agregerLiees([exigences[0], exig({ id: "e-d", actif_id: "D", referentiel_id: REF, qualification: "potentielle" })], scores)
    expect(r?.score_expo).toBe(80)
  })

  it("aucun actif scoré : exposition null (c_expo = 0 côté calcul)", () => {
    const r = agregerLiees([exigences[0]], {})
    expect(r?.score_expo).toBeNull()
  })

  it("sanction prévue si une exigence liée la porte", () => {
    const r = agregerLiees([exigences[0], exig({ id: "e-s", actif_id: "S", referentiel_id: REF, qualification: "potentielle", sanction_prevue: true })], scores)
    expect(r?.sanction_prevue).toBe(true)
  })

  it("sans échéance sur les exigences : date cible null", () => {
    expect(agregerLiees([exigences[0]], scores)?.date_cible).toBeNull()
  })
})