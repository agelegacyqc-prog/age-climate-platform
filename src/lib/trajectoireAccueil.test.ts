// src/lib/trajectoireAccueil.test.ts (Vitest, hypothèse de runner)
import { describe, expect, it } from "vitest"
import type { DomaineTrajectoire, StatutExigence } from "./trajectoire"
import { compterAnneau } from "./trajectoireAccueil"

interface L {
  statut: StatutExigence
  valide_client_le: string | null
  valide_age_le: string | null
  actif_id: string | null
  archivee: boolean
  referentiel: { domaine: DomaineTrajectoire }
}
const l = (statut: StatutExigence, actif: string | null, domaine: DomaineTrajectoire, client = false, age = false, archivee = false): L => ({
  statut, actif_id: actif, archivee, referentiel: { domaine },
  valide_client_le: client ? "2026-10-01" : null, valide_age_le: age ? "2026-10-02" : null,
})

const jeu: L[] = [
  l("conforme", "A", "energie", true, true),
  l("conforme", "B", "energie", true, true),
  l("a_evaluer", "A", "it"),
  l("en_cours", "B", "it"),
  l("non_conforme", "A", "environnement"),
  l("a_evaluer", "B", "environnement", true, false), // déclarée client -> attente AGE
  l("non_applicable", "A", "it"),
  l("a_evaluer", "A", "it", false, false, true), // archivée
  l("a_evaluer", null, "it"), // niveau organisation : ignorée
]

describe("compterAnneau", () => {
  it("tous actifs, tous domaines : somme, non applicables/archivées/organisation exclues", () => {
    const c = compterAnneau(jeu, null, null)
    expect(c).toMatchObject({ conformes: 2, attente_age: 1, en_cours: 1, non_conformes: 1, a_evaluer: 1, applicables: 6 })
    expect(c.pct).toBeCloseTo(100 * 2 / 6, 10)
  })
  it("un actif", () => {
    const c = compterAnneau(jeu, null, "A")
    expect(c).toMatchObject({ conformes: 1, a_evaluer: 1, non_conformes: 1, applicables: 3 })
  })
  it("un domaine", () => {
    expect(compterAnneau(jeu, "it", null)).toMatchObject({ en_cours: 1, a_evaluer: 1, applicables: 2, conformes: 0 })
  })
  it("conforme sans double validation : confirmation AGE attendue", () => {
    const c = compterAnneau([l("conforme", "A", "it", true, false)], null, null)
    expect(c).toMatchObject({ conformes: 0, attente_age: 1, applicables: 1, pct: 0 })
  })
  it("aucune exigence : 0 %", () => {
    expect(compterAnneau([], null, null).pct).toBe(0)
  })
})