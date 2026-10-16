import { describe, it, expect } from "vitest"
import {
  TAILLE_MAX_OCTETS, cheminStockage, erreurFichier, estDoublonDeDepot, extensionDe, fmtTaille, libelleTypeDocument, nomSur, typeFichierGed, typeMimeAutorise,
} from "./trajectoireDocuments"

describe("extensionDe", () => {
  it("renvoie l'extension en minuscules", () => expect(extensionDe("Audit.PDF")).toBe("pdf"))
  it("renvoie une chaîne vide sans extension", () => {
    expect(extensionDe("audit")).toBe("")
    expect(extensionDe(".pdf")).toBe("")
    expect(extensionDe("audit.")).toBe("")
  })
})

describe("typeMimeAutorise", () => {
  it("garde le type du navigateur s'il est autorisé", () => {
    expect(typeMimeAutorise({ name: "a.pdf", type: "application/pdf" })).toBe("application/pdf")
  })
  it("déduit le type de l'extension quand le navigateur n'en donne pas", () => {
    expect(typeMimeAutorise({ name: "a.xlsx", type: "" })).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    expect(typeMimeAutorise({ name: "a.DOC", type: "" })).toBe("application/msword")
  })
  it("refuse les autres formats", () => {
    expect(typeMimeAutorise({ name: "a.png", type: "image/png" })).toBeNull()
    expect(typeMimeAutorise({ name: "a.exe", type: "" })).toBeNull()
  })
})

describe("erreurFichier", () => {
  it("accepte un PDF de taille normale", () => expect(erreurFichier({ name: "a.pdf", size: 1000, type: "application/pdf" })).toBeNull())
  it("refuse un fichier vide", () => expect(erreurFichier({ name: "a.pdf", size: 0, type: "application/pdf" })).toBe("Le fichier est vide."))
  it("accepte exactement 50 Mo et refuse au-delà", () => {
    expect(erreurFichier({ name: "a.pdf", size: TAILLE_MAX_OCTETS, type: "application/pdf" })).toBeNull()
    expect(erreurFichier({ name: "a.pdf", size: TAILLE_MAX_OCTETS + 1, type: "application/pdf" })).toBe("Le fichier dépasse 50 Mo.")
  })
  it("refuse un format non accepté", () => {
    expect(erreurFichier({ name: "a.png", size: 10, type: "image/png" })).toContain("Format non accepté")
  })
})

describe("nomSur / cheminStockage", () => {
  it("retire les accents et les caractères spéciaux", () => {
    expect(nomSur("Audit énergétique – Siège (v2).pdf")).toBe("Audit-energetique-Siege-v2.pdf")
  })
  it("conserve l'extension en minuscules", () => expect(nomSur("RAPPORT.XLSX")).toBe("RAPPORT.xlsx"))
  it("donne un nom par défaut quand rien ne reste", () => expect(nomSur("???.pdf")).toBe("document.pdf"))
  it("limite la longueur", () => expect(nomSur(`${"a".repeat(300)}.pdf`).length).toBeLessThanOrEqual(120))
  it("construit {organisation_id}/{uuid}-{nom}", () => {
    expect(cheminStockage("org-1", "u-1", "Bilan GES 2025.pdf")).toBe("org-1/u-1-Bilan-GES-2025.pdf")
  })
})

describe("fmtTaille", () => {
  it("octets", () => expect(fmtTaille(850)).toBe("850\u00A0o"))
  it("kilo-octets", () => expect(fmtTaille(12595)).toBe("12,3\u00A0Ko"))
  it("méga-octets", () => expect(fmtTaille(4718592)).toBe("4,5\u00A0Mo"))
  it("valeur absente", () => expect(fmtTaille(null)).toBe("—"))
})

describe("libelleTypeDocument", () => {
  it("renvoie le libellé", () => expect(libelleTypeDocument("bilan_ges")).toBe("Bilan GES"))
})
describe("typeFichierGed", () => {
  it("pdf et xlsx gardent leur type", () => {
    expect(typeFichierGed("a.PDF")).toBe("pdf")
    expect(typeFichierGed("a.xlsx")).toBe("xlsx")
  })
  it("Word et ancien Excel sont classés en autre", () => {
    expect(typeFichierGed("a.docx")).toBe("autre")
    expect(typeFichierGed("a.doc")).toBe("autre")
    expect(typeFichierGed("a.xls")).toBe("autre")
  })
})

describe("estDoublonDeDepot", () => {
  const existants = [{ nom_fichier: "Audit.pdf", taille_octets: 1000 }, { nom_fichier: null, taille_octets: null }]
  it("détecte le même nom et la même taille, sans tenir compte de la casse", () => {
    expect(estDoublonDeDepot({ name: "audit.PDF", size: 1000 }, existants)).toBe(true)
  })
  it("ne signale pas un fichier de même nom mais de taille différente", () => {
    expect(estDoublonDeDepot({ name: "Audit.pdf", size: 1200 }, existants)).toBe(false)
  })
  it("ne signale pas un fichier de nom différent", () => {
    expect(estDoublonDeDepot({ name: "Autre.pdf", size: 1000 }, existants)).toBe(false)
  })
  it("ne signale rien quand il n'y a aucun document", () => {
    expect(estDoublonDeDepot({ name: "Audit.pdf", size: 1000 }, [])).toBe(false)
  })
})