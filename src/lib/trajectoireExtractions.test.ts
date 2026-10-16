import { describe, it, expect } from "vitest"
import {
  actionsPossibles, analyserNombre, estMasquee, filtrerExtractions, fmtMontant, fmtNombreFR, libelleTypeExtraction,
  type StatutExtraction,
} from "./trajectoireExtractions"

const cibles = (statut: Parameters<typeof actionsPossibles>[0], vue: Parameters<typeof actionsPossibles>[1]) =>
  actionsPossibles(statut, vue).map(a => a.cible)

describe("actionsPossibles : admin_client", () => {
  it("peut valider ou rejeter une extraction proposée", () => expect(cibles("propose", "admin_client")).toEqual(["valide_client", "rejete"]))
  it("peut encore rejeter après sa validation", () => expect(cibles("valide_client", "admin_client")).toEqual(["rejete"]))
  it("ne peut rien faire sur une extraction confirmée ou rejetée", () => {
    expect(cibles("valide_age", "admin_client")).toEqual([])
    expect(cibles("rejete", "admin_client")).toEqual([])
  })
  it("le rejet demande un motif, la validation non", () => {
    const a = actionsPossibles("propose", "admin_client")
    expect(a.find(x => x.cible === "valide_client")?.rejet).toBe(false)
    expect(a.find(x => x.cible === "rejete")?.rejet).toBe(true)
  })
})

describe("actionsPossibles : personnel AGE", () => {
  it("ne peut pas confirmer une extraction non validée par le client", () => expect(cibles("propose", "personnel")).toEqual(["rejete"]))
  it("peut confirmer ou rejeter une extraction validée par le client", () => expect(cibles("valide_client", "personnel")).toEqual(["valide_age", "rejete"]))
  it("peut remettre une extraction rejetée à l'état proposé", () => expect(cibles("rejete", "personnel")).toEqual(["propose"]))
  it("ne peut plus agir sur une extraction confirmée", () => expect(cibles("valide_age", "personnel")).toEqual([]))
})

describe("actionsPossibles : lecture seule", () => {
  it("aucune action quel que soit le statut", () => {
    for (const s of ["propose", "valide_client", "valide_age", "rejete"] as const) expect(cibles(s, "lecture")).toEqual([])
  })
})

describe("analyserNombre", () => {
  it("accepte la virgule et le point", () => {
    expect(analyserNombre("12,5")).toEqual({ valeur: 12.5, valide: true })
    expect(analyserNombre("12.5")).toEqual({ valeur: 12.5, valide: true })
  })
  it("ignore les espaces, y compris insécables", () => {
    expect(analyserNombre("1 234 567")).toEqual({ valeur: 1234567, valide: true })
    expect(analyserNombre("1\u00A0234,50")).toEqual({ valeur: 1234.5, valide: true })
  })
  it("un champ vide est valide sans valeur", () => expect(analyserNombre("  ")).toEqual({ valeur: null, valide: true }))
  it("refuse le texte et les négatifs", () => {
    expect(analyserNombre("abc")).toEqual({ valeur: null, valide: false })
    expect(analyserNombre("-5")).toEqual({ valeur: null, valide: false })
    expect(analyserNombre("1,2,3")).toEqual({ valeur: null, valide: false })
  })
  it("ne tronque pas", () => expect(analyserNombre("0,333333").valeur).toBe(0.333333))
})

describe("formats", () => {
  it("nombre avec espace insécable", () => expect(fmtNombreFR(1234567)).toBe("1\u00A0234\u00A0567"))
  it("montant en euros", () => expect(fmtMontant(1234567, "eur")).toBe("1\u00A0234\u00A0567\u00A0€"))
  it("montant en kWh et tCO₂e", () => {
    expect(fmtMontant(12500, "kwh")).toBe("12\u00A0500\u00A0kWh")
    expect(fmtMontant(8, "tco2e")).toBe("8\u00A0tCO₂e")
  })
  it("valeur absente", () => expect(fmtMontant(null, "eur")).toBe("—"))
  it("sans unité", () => expect(fmtMontant(5, null)).toBe("5"))
  it("libellé du type", () => expect(libelleTypeExtraction("ecart")).toBe("Écart"))
})

describe("estMasquee", () => {
  it("masque une proposition d'un document archivé", () => expect(estMasquee("propose", true)).toBe(true))
  it("garde une proposition d'un document actif", () => expect(estMasquee("propose", false)).toBe(false))
  it("garde les extractions déjà traitées d'un document archivé", () => {
    for (const s of ["valide_client", "valide_age", "rejete"] as const) expect(estMasquee(s, true)).toBe(false)
  })
})
describe("filtrerExtractions", () => {
  interface L { id: number; statut: StatutExtraction; domaine: string | null }
  const lignes: L[] = [
    { id: 1, statut: "propose", domaine: "energie" },
    { id: 2, statut: "valide_client", domaine: "energie" },
    { id: 3, statut: "propose", domaine: "it" },
    { id: 4, statut: "propose", domaine: null },
    { id: 5, statut: "rejete", domaine: "environnement" },
  ]
  const ids = (r: L[]) => r.map(x => x.id)

  it("sans filtre : toutes les extractions", () => expect(ids(filtrerExtractions(lignes, "tous", "tous"))).toEqual([1, 2, 3, 4, 5]))
  it("filtre par statut seul", () => expect(ids(filtrerExtractions(lignes, "propose", "tous"))).toEqual([1, 3, 4]))
  it("filtre par domaine seul", () => expect(ids(filtrerExtractions(lignes, "tous", "energie"))).toEqual([1, 2]))
  it("combine statut et domaine", () => expect(ids(filtrerExtractions(lignes, "propose", "energie"))).toEqual([1]))
  it("« non précisé » retient les extractions sans domaine", () => {
    expect(ids(filtrerExtractions(lignes, "tous", "non_precise"))).toEqual([4])
    expect(ids(filtrerExtractions(lignes, "propose", "non_precise"))).toEqual([4])
  })
  it("une combinaison sans résultat renvoie une liste vide", () => {
    expect(filtrerExtractions(lignes, "rejete", "non_precise")).toEqual([])
    expect(filtrerExtractions(lignes, "valide_age", "it")).toEqual([])
  })
  it("les domaines et « non précisé » se partagent exactement le total", () => {
    const somme = (["energie", "environnement", "it", "non_precise"] as const)
      .reduce((n, d) => n + filtrerExtractions(lignes, "tous", d).length, 0)
    expect(somme).toBe(lignes.length)
  })
  it("ne modifie pas la liste d'origine", () => {
    filtrerExtractions(lignes, "rejete", "environnement")
    expect(lignes).toHaveLength(5)
  })
})