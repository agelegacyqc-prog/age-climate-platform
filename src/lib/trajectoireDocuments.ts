// src/lib/trajectoireDocuments.ts
//
// Module Trajectoire, onglet Documents : types, libellés et fonctions pures (sans accès réseau).
// Bucket privé "documents-trajectoire" : 50 Mo, PDF / Word / Excel (cf. 20261014_trajectoire_v1.sql).
// Convention de chemin : {organisation_id}/{uuid}-{nom}.

export type TypeDocument = "audit" | "diagnostic" | "dpe" | "bilan_ges" | "rapport_iso" | "norme" | "autre"
export type StatutAnalyse = "depose" | "classe" | "en_analyse" | "extrait" | "partiel" | "echec"

export const BUCKET_TRAJECTOIRE = "documents-trajectoire"
export const TAILLE_MAX_OCTETS = 52428800

export const TYPES_DOCUMENT: ReadonlyArray<{ id: TypeDocument; label: string }> = [
  { id: "audit", label: "Audit" },
  { id: "diagnostic", label: "Diagnostic" },
  { id: "dpe", label: "DPE" },
  { id: "bilan_ges", label: "Bilan GES" },
  { id: "rapport_iso", label: "Rapport ISO" },
  { id: "norme", label: "Norme" },
  { id: "autre", label: "Autre" },
]

/** Statuts d'analyse : couleur toujours doublée d'une icône (accessibilité daltonisme). */
export const STATUTS_ANALYSE_META: Record<StatutAnalyse, { label: string; icone: string; couleur: string; fond: string; texte: string }> = {
  depose:     { label: "Déposé", icone: "ti-info-circle", couleur: "#0369A1", fond: "#E0F2FE", texte: "#075985" },
  classe:     { label: "Classé", icone: "ti-info-circle", couleur: "#0369A1", fond: "#E0F2FE", texte: "#075985" },
  en_analyse: { label: "En analyse", icone: "ti-alert-triangle", couleur: "#D97706", fond: "#FEF3C7", texte: "#92400E" },
  extrait:    { label: "Extrait", icone: "ti-circle-check", couleur: "#2F7D5C", fond: "#DCFCE7", texte: "#166534" },
  partiel:    { label: "Extraction partielle", icone: "ti-alert-triangle", couleur: "#D97706", fond: "#FEF3C7", texte: "#92400E" },
  echec:      { label: "Échec", icone: "ti-alert-octagon", couleur: "#B91C1C", fond: "#FEE2E2", texte: "#991B1B" },
}

const TYPES_MIME_PAR_EXTENSION: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

const TYPES_MIME_AUTORISES: ReadonlySet<string> = new Set(Object.values(TYPES_MIME_PAR_EXTENSION))

export interface FichierDecrit {
  name: string
  size: number
  type: string
}

/** Extension en minuscules sans le point, ou chaîne vide. */
export function extensionDe(nom: string): string {
  const i = nom.lastIndexOf(".")
  return i > 0 && i < nom.length - 1 ? nom.slice(i + 1).toLowerCase() : ""
}

/** Type MIME retenu : celui du navigateur s'il est autorisé, sinon déduit de l'extension, sinon null. */
export function typeMimeAutorise(f: Pick<FichierDecrit, "name" | "type">): string | null {
  if (TYPES_MIME_AUTORISES.has(f.type)) return f.type
  return TYPES_MIME_PAR_EXTENSION[extensionDe(f.name)] ?? null
}

/** Valeur de `documents.type_fichier` (contrainte de la table : pdf, csv, xlsx ou autre). */
export function typeFichierGed(nom: string): "pdf" | "xlsx" | "autre" {
  const e = extensionDe(nom)
  if (e === "pdf") return "pdf"
  if (e === "xlsx") return "xlsx"
  return "autre"
}

/** Message d'erreur à afficher, ou null si le fichier peut être déposé. */
export function erreurFichier(f: FichierDecrit): string | null {
  if (f.size <= 0) return "Le fichier est vide."
  if (f.size > TAILLE_MAX_OCTETS) return "Le fichier dépasse 50 Mo."
  if (typeMimeAutorise(f) === null) return "Format non accepté. Formats acceptés : PDF, Word (.doc, .docx) et Excel (.xls, .xlsx)."
  return null
}

/** Nom sûr pour une clé de stockage : sans accents ni caractères spéciaux, extension conservée, 120 caractères maximum. */
export function nomSur(nom: string): string {
  const ext = extensionDe(nom)
  const base = ext ? nom.slice(0, nom.length - ext.length - 1) : nom
  const nettoye = (s: string) => s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
  const b = nettoye(base).slice(0, 110) || "document"
  const e = nettoye(ext).slice(0, 8)
  return e ? `${b}.${e}` : b
}

/** Chemin de stockage : {organisation_id}/{uuid}-{nom sûr}. */
export function cheminStockage(organisationId: string, uuid: string, nomOriginal: string): string {
  return `${organisationId}/${uuid}-${nomSur(nomOriginal)}`
}

/** Taille lisible en français : "850 o", "12,3 Ko", "4,5 Mo" (espace insécable avant l'unité). */
export function fmtTaille(octets: number | null): string {
  if (octets === null || octets < 0) return "—"
  if (octets < 1024) return `${octets}\u00A0o`
  const virgule = (n: number) => n.toFixed(1).replace(".", ",")
  if (octets < 1024 * 1024) return `${virgule(octets / 1024)}\u00A0Ko`
  return `${virgule(octets / (1024 * 1024))}\u00A0Mo`
}

/** Libellé du type de document. */
export function libelleTypeDocument(t: TypeDocument): string {
  return TYPES_DOCUMENT.find(x => x.id === t)?.label ?? t
}

/**
 * Le fichier ressemble-t-il à un document déjà déposé ? Même nom (sans tenir compte de la casse) et même taille.
 * `existants` : les documents actifs de l'organisation (les documents archivés n'en font pas partie).
 */
export function estDoublonDeDepot(
  fichier: Pick<FichierDecrit, "name" | "size">,
  existants: ReadonlyArray<{ nom_fichier: string | null; taille_octets: number | null }>,
): boolean {
  const nom = fichier.name.trim().toLowerCase()
  return existants.some(e => (e.nom_fichier ?? "").trim().toLowerCase() === nom && e.taille_octets === fichier.size)
}