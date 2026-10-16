// src/lib/trajectoireExtractions.ts
//
// Module Trajectoire, onglet À valider : types, libellés et règles de transition (sans accès réseau).
// Les règles de transition reprennent celles des triggers de la base (trajectoire_controler_extraction),
// qui restent la référence :
//  - admin_client : proposée -> validée par le client ; proposée ou validée par le client -> rejetée.
//  - personnel AGE : validée par le client -> confirmée ; proposée ou validée par le client -> rejetée ;
//    rejetée -> proposée. Une extraction confirmée n'est plus modifiable.
//  - utilisateur_client : lecture seule.

export type TypeExtraction = "constat" | "ecart" | "recommandation" | "echeance" | "certification"
export type StatutExtraction = "propose" | "valide_client" | "valide_age" | "rejete"
export type GainUnite = "eur" | "kwh" | "tco2e"
export type VueExtraction = "admin_client" | "personnel" | "lecture"

export const TYPES_EXTRACTION: ReadonlyArray<{ id: TypeExtraction; label: string }> = [
  { id: "constat", label: "Constat" },
  { id: "ecart", label: "Écart" },
  { id: "recommandation", label: "Recommandation" },
  { id: "echeance", label: "Échéance" },
  { id: "certification", label: "Certification" },
]

export const UNITES_GAIN: ReadonlyArray<{ id: GainUnite; label: string }> = [
  { id: "eur", label: "€" },
  { id: "kwh", label: "kWh" },
  { id: "tco2e", label: "tCO₂e" },
]

/** Statuts d'une extraction : couleur toujours doublée d'une icône (accessibilité daltonisme). */
export const STATUTS_EXTRACTION_META: Record<StatutExtraction, { label: string; icone: string; couleur: string; fond: string; texte: string }> = {
  propose:       { label: "Proposée", icone: "ti-info-circle", couleur: "#0369A1", fond: "#E0F2FE", texte: "#075985" },
  valide_client: { label: "Validée par le client, en attente de confirmation AGE", icone: "ti-alert-triangle", couleur: "#D97706", fond: "#FEF3C7", texte: "#92400E" },
  valide_age:    { label: "Confirmée par AGE", icone: "ti-circle-check", couleur: "#2F7D5C", fond: "#DCFCE7", texte: "#166534" },
  rejete:        { label: "Rejetée", icone: "ti-alert-octagon", couleur: "#B91C1C", fond: "#FEE2E2", texte: "#991B1B" },
}

export interface ActionPossible {
  cible: StatutExtraction
  libelle: string
  /** Un rejet demande un motif facultatif avant confirmation. */
  rejet: boolean
}

/** Actions proposées à l'utilisateur selon son rôle et le statut courant de l'extraction. */
export function actionsPossibles(statut: StatutExtraction, vue: VueExtraction): ActionPossible[] {
  if (vue === "admin_client") {
    if (statut === "propose") {
      return [
        { cible: "valide_client", libelle: "Valider", rejet: false },
        { cible: "rejete", libelle: "Rejeter", rejet: true },
      ]
    }
    if (statut === "valide_client") return [{ cible: "rejete", libelle: "Rejeter", rejet: true }]
    return []
  }
  if (vue === "personnel") {
    if (statut === "propose") return [{ cible: "rejete", libelle: "Rejeter", rejet: true }]
    if (statut === "valide_client") {
      return [
        { cible: "valide_age", libelle: "Confirmer", rejet: false },
        { cible: "rejete", libelle: "Rejeter", rejet: true },
      ]
    }
    if (statut === "rejete") return [{ cible: "propose", libelle: "Remettre à l'état proposé", rejet: false }]
    return []
  }
  return []
}

export interface NombreAnalyse {
  /** null si le champ est vide ou invalide. */
  valeur: number | null
  valide: boolean
}

/** Saisie décimale : accepte la virgule et le point, ignore les espaces (y compris insécables). Champ vide = valide, sans valeur. Négatif refusé. */
export function analyserNombre(saisie: string): NombreAnalyse {
  const brut = saisie.replace(/[\s\u00A0\u202F]/g, "").replace(",", ".")
  if (brut === "") return { valeur: null, valide: true }
  if (!/^\d+(\.\d+)?$/.test(brut)) return { valeur: null, valide: false }
  return { valeur: Number(brut), valide: true }
}

/** Nombre français sans décimale, séparateur de milliers : espace insécable. L'affichage arrondit, le calcul jamais. */
export function fmtNombreFR(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n).replace(/\u202F/g, "\u00A0")
}

/** Valeur suivie de son unité : "1 234 567 €", "12 500 kWh", "8 tCO₂e". */
export function fmtMontant(n: number | null, unite: GainUnite | null): string {
  if (n === null) return "—"
  const u = UNITES_GAIN.find(x => x.id === unite)?.label ?? ""
  return u ? `${fmtNombreFR(n)}\u00A0${u}` : fmtNombreFR(n)
}
/** Libellé du type d'extraction. */
export function libelleTypeExtraction(t: TypeExtraction): string {
  return TYPES_EXTRACTION.find(x => x.id === t)?.label ?? t
}

/**
 * Une proposition non traitée d'un document archivé n'a plus rien à valider : elle est masquée de l'onglet À valider.
 * Les extractions déjà validées ou rejetées restent visibles (historique).
 */
export function estMasquee(statut: StatutExtraction, documentArchive: boolean): boolean {
  return documentArchive && statut === "propose"
}
// ---------------------------------------------------------------------------
// Onglet À valider : filtres combinés par statut et par domaine.

export type FiltreStatut = "tous" | StatutExtraction
/** « non_precise » : extractions dont le domaine n'est pas renseigné. */
export type FiltreDomaine = "tous" | "non_precise" | "energie" | "environnement" | "it"

export function filtrerExtractions<T extends { statut: StatutExtraction; domaine: string | null }>(
  lignes: ReadonlyArray<T>,
  statut: FiltreStatut,
  domaine: FiltreDomaine,
): T[] {
  return lignes.filter(l =>
    (statut === "tous" || l.statut === statut) &&
    (domaine === "tous" || (domaine === "non_precise" ? l.domaine === null : l.domaine === domaine)))
}