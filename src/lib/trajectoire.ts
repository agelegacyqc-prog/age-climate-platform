// src/lib/trajectoire.ts
//
// Module Trajectoire : types et calculs purs (sans accès réseau).
// Exécution : côté client pour l'affichage ; la référence d'audit reste la base (triggers).
// Référence : FICHE_MODULE_Trajectoire_v0.1.md, section 4 (maturité M_d = conformes validées / applicables).

export type DomaineTrajectoire = "energie" | "environnement" | "it"
export type NatureExigence = "reglementaire" | "volontaire"
export type Qualification = "obligatoire" | "potentielle" | "volontaire"
export type StatutExigence = "a_evaluer" | "non_conforme" | "en_cours" | "conforme" | "non_applicable"
/** Statut affiché : "attente_age" = déclarée par le client, confirmation AGE attendue. */
export type StatutAffiche = StatutExigence | "attente_age"
export type EcheanceType = "aucune" | "fixe" | "annuelle" | "pluriannuelle"

export interface ReferentielEntree {
  id: string
  code: string
  libelle: string
  domaine: DomaineTrajectoire
  nature: NatureExigence
  cadre: "france" | "europe" | "international"
  description: string | null
  echeance_type: EcheanceType
  echeance_date: string | null
  recurrence_mois: number | null
  sanction_prevue: boolean
  source_url: string | null
  actif: boolean
}

export interface ExigenceLigne {
  id: string
  organisation_id: string
  actif_id: string | null
  referentiel_id: string
  qualification: Qualification
  statut: StatutExigence
  source: "manuel" | "ia" | "import"
  valide_client_par: string | null
  valide_client_le: string | null
  valide_age_par: string | null
  valide_age_le: string | null
  derniere_realisation: string | null
  prochaine_echeance: string | null
  commentaire: string | null
  archivee: boolean
  referentiel: ReferentielEntree
}

export interface MaturiteResultat {
  applicables: number
  conformes: number
  /** Pourcentage 0 à 100, non arrondi. */
  pct: number
}

export const DOMAINES: ReadonlyArray<{ id: DomaineTrajectoire; label: string; icone: string }> = [
  { id: "energie", label: "Énergie", icone: "ti-bolt" },
  { id: "environnement", label: "Environnement", icone: "ti-leaf" },
  { id: "it", label: "IT", icone: "ti-cpu" },
]

export const STATUTS_META: Record<StatutAffiche, { label: string; icone: string; couleur: string; fond: string; texte: string }> = {
  conforme:       { label: "Conforme, confirmé AGE", icone: "ti-circle-check", couleur: "#2F7D5C", fond: "#DCFCE7", texte: "#166534" },
  attente_age:    { label: "Déclarée par le client, en attente de confirmation AGE", icone: "ti-alert-triangle", couleur: "#D97706", fond: "#FEF3C7", texte: "#92400E" },
  en_cours:       { label: "En cours", icone: "ti-alert-triangle", couleur: "#D97706", fond: "#FEF3C7", texte: "#92400E" },
  non_conforme:   { label: "Non conforme", icone: "ti-alert-octagon", couleur: "#B91C1C", fond: "#FEE2E2", texte: "#991B1B" },
  a_evaluer:      { label: "À évaluer", icone: "ti-info-circle", couleur: "#0369A1", fond: "#E0F2FE", texte: "#075985" },
  non_applicable: { label: "Non applicable", icone: "ti-circle-minus", couleur: "#78716C", fond: "#F1F5F9", texte: "#475569" },
}

export const QUALIFICATIONS_LABEL: Record<Qualification, string> = {
  obligatoire: "Éligible — Obligatoire",
  potentielle: "Potentiellement éligible",
  volontaire: "Volontaire",
}

/** Statut à afficher : une exigence déclarée par le client mais non confirmée par AGE passe en "attente_age". */
export function statutAffiche(e: Pick<ExigenceLigne, "statut" | "valide_client_le" | "valide_age_le">): StatutAffiche {
  if (e.statut === "conforme" || e.statut === "non_applicable") return e.statut
  if (e.valide_client_le && !e.valide_age_le) return "attente_age"
  return e.statut
}

/** Ajoute n mois à une date ISO (AAAA-MM-JJ), au dernier jour du mois si le jour n'existe pas. */
export function ajouterMois(iso: string, n: number): string {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number)
  const total = (m - 1) + n
  const annee = a + Math.floor(total / 12)
  const mois = ((total % 12) + 12) % 12
  const dernierJour = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate()
  const jour = Math.min(j, dernierJour)
  return `${String(annee).padStart(4, "0")}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`
}

/**
 * Échéance retenue : prochaine_echeance saisie, sinon dernière réalisation + récurrence
 * (pluriannuelle), sinon date du référentiel. Pas de recalcul de l'occurrence annuelle :
 * une échéance dépassée reste affichée "en retard" tant que l'exigence n'est pas traitée.
 */
export function echeanceEffective(e: Pick<ExigenceLigne, "prochaine_echeance" | "derniere_realisation" | "referentiel">): string | null {
  if (e.prochaine_echeance) return e.prochaine_echeance
  const r = e.referentiel
  if (r.echeance_type === "pluriannuelle" && r.recurrence_mois && e.derniere_realisation) {
    return ajouterMois(e.derniere_realisation, r.recurrence_mois)
  }
  return r.echeance_date
}

/** En retard : échéance strictement antérieure à aujourd'hui (AAAA-MM-JJ) et exigence non conforme ni non applicable. */
export function estEnRetard(
  e: Pick<ExigenceLigne, "statut" | "prochaine_echeance" | "derniere_realisation" | "referentiel">,
  aujourdhui: string,
): boolean {
  if (e.statut === "conforme" || e.statut === "non_applicable") return false
  const ech = echeanceEffective(e)
  return ech !== null && ech.slice(0, 10) < aujourdhui.slice(0, 10)
}

/** Maturité = exigences conformes (validées client puis AGE) / exigences applicables. */
export function maturite(
  lignes: ReadonlyArray<Pick<ExigenceLigne, "statut" | "valide_client_le" | "valide_age_le">>,
): MaturiteResultat {
  const applicables = lignes.filter(l => l.statut !== "non_applicable").length
  const conformes = lignes.filter(l => l.statut === "conforme" && l.valide_client_le !== null && l.valide_age_le !== null).length
  return { applicables, conformes, pct: applicables === 0 ? 0 : (100 * conformes) / applicables }
}

/** AAAA-MM-JJ du jour (heure locale). */
export function aujourdhuiISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Date FR JJ/MM/AAAA depuis une date ou un horodatage ISO. */
export function fmtDateFR(iso: string | null): string {
  if (!iso) return "—"
  const [a, m, j] = iso.slice(0, 10).split("-")
  return `${j}/${m}/${a}`
}

/** Pourcentage FR "12,50 %" (virgule décimale, espace insécable avant %). L'affichage arrondit, le calcul jamais. */
export function fmtPct(n: number): string {
  return `${n.toFixed(2).replace(".", ",")}\u00A0%`
}