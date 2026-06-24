import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Actif {
  nom: string
  adresse: string
  ville: string
  code_postal: string
  exposition_rga: string | null
  annee_construction: number | null
  surface: number | null
  photo_batiment: string | null
}

interface DocumentResume {
  id: string
  nom_fichier: string
  categorie: string
  created_at: string
  statut_doc: string
}

interface DossierRGADetail {
  id: string
  type_mission: 'amo' | 'moe' | 'amo_moe'
  statut: string
  statut_updated_at: string
  notes_consultant: string | null
  created_at: string
  actif: Actif
  documents: DocumentResume[]
  consultant: { prenom: string; nom: string } | null
}

// ─── Référentiels ─────────────────────────────────────────────────────────────

const STATUT_LABEL: Record<string, string> = {
  dossier_ouvert:               "Dossier ouvert",
  eligibilite_en_cours:         "Vérification d'éligibilité en cours",
  eligible_confirme:            "Éligibilité confirmée",
  non_eligible:                 "Non éligible au dispositif",
  dossier_etudes_a_constituer:  "Constitution du dossier Études",
  complement_demande:           "Complément de pièces demandé",
  dossier_etudes_depose:        "Dossier déposé en DDT",
  aide_etudes_accordee:         "Aide Études accordée",
  diagnostic_en_cours:          "Diagnostic de vulnérabilité en cours",
  diagnostic_valide:            "Diagnostic validé",
  diagnostic_non_concluant:     "Diagnostic non concluant",
  dossier_travaux_a_constituer: "Constitution du dossier Travaux",
  dossier_travaux_depose:       "Dossier Travaux déposé en DDT",
  aide_travaux_accordee:        "Aide Travaux accordée",
  travaux_en_cours:             "Travaux en cours",
  reception_travaux:            "Réception des travaux",
  dossier_cloture:              "Dossier clôturé",
}

const STATUT_COULEUR: Record<string, { bg: string; border: string; texte: string; icone: string }> = {
  dossier_ouvert:               { bg: "#F8F7F4", border: "#E5E1DA", texte: "#78716C", icone: "ti-folder" },
  eligibilite_en_cours:         { bg: "#FFF7ED", border: "#D97706", texte: "#92400E", icone: "ti-hourglass" },
  eligible_confirme:            { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-circle-check" },
  non_eligible:                 { bg: "#FEF2F2", border: "#B91C1C", texte: "#7F1D1D", icone: "ti-circle-x" },
  complement_demande:           { bg: "#FFF7ED", border: "#D97706", texte: "#92400E", icone: "ti-alert-triangle" },
  dossier_etudes_a_constituer:  { bg: "#F8F7F4", border: "#78716C", texte: "#44403C", icone: "ti-clipboard-list" },
  dossier_etudes_depose:        { bg: "#EFF6FF", border: "#0369A1", texte: "#1E3A5F", icone: "ti-send" },
  aide_etudes_accordee:         { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-circle-check" },
  diagnostic_en_cours:          { bg: "#EFF6FF", border: "#0369A1", texte: "#1E3A5F", icone: "ti-search" },
  diagnostic_valide:            { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-circle-check" },
  diagnostic_non_concluant:     { bg: "#FEF2F2", border: "#B91C1C", texte: "#7F1D1D", icone: "ti-circle-x" },
  dossier_travaux_a_constituer: { bg: "#F8F7F4", border: "#78716C", texte: "#44403C", icone: "ti-clipboard-list" },
  dossier_travaux_depose:       { bg: "#EFF6FF", border: "#0369A1", texte: "#1E3A5F", icone: "ti-send" },
  aide_travaux_accordee:        { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-circle-check" },
  travaux_en_cours:             { bg: "#FFF7ED", border: "#D97706", texte: "#92400E", icone: "ti-tools" },
  reception_travaux:            { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-home-check" },
  dossier_cloture:              { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-archive" },
}

const CATEGORIE_DOC_LABEL: Record<string, string> = {
  eligibilite: "Éligibilité",
  etudes:      "Études",
  travaux:     "Travaux",
  age:         "Document AGE",
}

const STATUT_DOC_STYLE: Record<string, { label: string; color: string }> = {
  depose: { label: "Déposé",  color: "#78716C" },
  lu:     { label: "Lu",      color: "#0369A1" },
  valide: { label: "Validé",  color: "#1D9E75" },
}

const EXPOSITION_RGA: Record<string, { label: string; couleur: string }> = {
  forte:      { label: "Zone exposition forte",   couleur: "#B91C1C" },
  moyenne:    { label: "Zone exposition moyenne", couleur: "#D97706" },
  faible:     { label: "Zone exposition faible",  couleur: "#0369A1" },
  non_expose: { label: "Non exposé",              couleur: "#78716C" },
}

// ─── Timeline : séquence selon type_mission ──────────────────────────────────

const SEQUENCE_TRONC = [
  "dossier_ouvert",
  "eligibilite_en_cours",
  "eligible_confirme",
]

const SEQUENCE_AMO = [
  "dossier_etudes_a_constituer",
  "complement_demande",
  "dossier_etudes_depose",
  "aide_etudes_accordee",
  "diagnostic_en_cours",
  "diagnostic_valide",
]

const SEQUENCE_MOE = [
  "dossier_travaux_a_constituer",
  "dossier_travaux_depose",
  "aide_travaux_accordee",
  "travaux_en_cours",
  "reception_travaux",
  "dossier_cloture",
]

const TERMINAUX_NEGATIFS = ["non_eligible", "diagnostic_non_concluant"]

function buildSequence(type_mission: string): string[] {
  const base = [...SEQUENCE_TRONC]
  if (type_mission === "amo")     return [...base, ...SEQUENCE_AMO]
  if (type_mission === "moe")     return [...base, ...SEQUENCE_MOE]
  if (type_mission === "amo_moe") return [...base, ...SEQUENCE_AMO, ...SEQUENCE_MOE]
  return base
}

function getStatutIndex(sequence: string[], statut: string): number {
  const idx = sequence.indexOf(statut)
  return idx >= 0 ? idx : -1
}

// ─── Composant Timeline ───────────────────────────────────────────────────────

function Timeline({ sequence, statutCourant }: { sequence: string[]; statutCourant: string }) {
  const currentIdx = getStatutIndex(sequence, statutCourant)
  const isNegatif  = TERMINAUX_NEGATIFS.includes(statutCourant)

  // Sections pour séparer tronc / AMO / MOE visuellement
  const getSectionLabel = (statut: string): string | null => {
    if (statut === "dossier_etudes_a_constituer") return "Phase Études"
    if (statut === "dossier_travaux_a_constituer") return "Phase Travaux"
    if (statut === "dossier_ouvert") return "Éligibilité"
    return null
  }

  return (
    <div style={{ position: "relative" }}>
      {sequence.map((statut, idx) => {
        const estComplete = idx < currentIdx
        const estCourant  = idx === currentIdx
        const estFutur    = idx > currentIdx
        const couleur     = STATUT_COULEUR[statut] || STATUT_COULEUR["dossier_ouvert"]
        const sectionLabel = getSectionLabel(statut)

        return (
          <div key={statut}>
            {/* Séparateur de section */}
            {sectionLabel && (
              <div style={{
                fontSize: "10px", fontWeight: 700, color: "#94A3B8",
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginBottom: "8px", marginTop: idx === 0 ? 0 : "16px",
                paddingLeft: "32px",
              }}>
                {sectionLabel}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: idx < sequence.length - 1 ? "0" : "0" }}>
              {/* Colonne icône + trait vertical */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0 }}>
                {/* Cercle statut */}
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: estComplete ? "#1D9E75" : estCourant ? couleur.border : "#E5E1DA",
                  border: estCourant ? `2px solid ${couleur.border}` : "none",
                  transition: "all 0.2s",
                }}>
                  {estComplete && <i className="ti ti-check" style={{ fontSize: "11px", color: "white" }} aria-hidden="true" />}
                  {estCourant  && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                  {estFutur    && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4BDB6" }} />}
                </div>
                {/* Trait vertical */}
                {idx < sequence.length - 1 && (
                  <div style={{
                    width: 2, flexGrow: 1, minHeight: "28px",
                    background: idx < currentIdx ? "#1D9E75" : "#E5E1DA",
                    margin: "2px 0",
                  }} />
                )}
              </div>

              {/* Contenu étape */}
              <div style={{
                flex: 1,
                padding: estCourant ? "10px 12px" : "4px 0",
                background: estCourant ? couleur.bg : "transparent",
                borderRadius: estCourant ? "8px" : "0",
                borderLeft: estCourant ? `3px solid ${couleur.border}` : "none",
                marginBottom: "8px",
              }}>
                <div style={{
                  fontSize: "13px",
                  fontWeight: estCourant ? 600 : 400,
                  color: estComplete ? "#1D9E75" : estCourant ? couleur.texte : estFutur ? "#C4BDB6" : "#0F172A",
                }}>
                  {STATUT_LABEL[statut] || statut}
                </div>
                {estCourant && isNegatif && (
                  <div style={{ fontSize: "11px", color: "#B91C1C", marginTop: "4px" }}>
                    Contactez votre consultant AGE pour la suite.
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Étape terminale négative hors séquence */}
      {isNegatif && !sequence.includes(statutCourant) && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#B91C1C", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-x" style={{ fontSize: "11px", color: "white" }} aria-hidden="true" />
          </div>
          <div style={{ padding: "10px 12px", background: "#FEF2F2", borderRadius: "8px", borderLeft: "3px solid #B91C1C", flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#7F1D1D" }}>{STATUT_LABEL[statutCourant] || statutCourant}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DossierRGA() {
  const navigate        = useNavigate()
  const { id }          = useParams<{ id: string }>()
  const [dossier, setDossier] = useState<DossierRGADetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur]   = useState<string | null>(null)

  useEffect(() => { if (id) charger(id) }, [id])

  async function charger(dossierId: string) {
    setLoading(true)

    const { data, error } = await supabase
      .from("dossiers_rga")
      .select(`
        id,
        type_mission,
        statut,
        statut_updated_at,
        notes_consultant,
        created_at,
        actif:actif_id (
          nom, adresse, ville, code_postal,
          exposition_rga, annee_construction, surface, photo_batiment
        ),
        consultant:consultant_id (
          prenom, nom
        )
      `)
      .eq("id", dossierId)
      .single()

    if (error || !data) {
      setErreur("Dossier introuvable.")
      setLoading(false)
      return
    }

    // Charger les 3 derniers documents
    const { data: docs } = await supabase
      .from("documents_rga")
      .select("id, nom_fichier, categorie, created_at, statut_doc")
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: false })
      .limit(3)

    setDossier({
      ...data,
      actif: data.actif as unknown as Actif,
      consultant: data.consultant as unknown as { prenom: string; nom: string } | null,
      documents: (docs || []) as DocumentResume[],
    })
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94A3B8", fontSize: "14px" }}>
      Chargement du dossier…
    </div>
  )

  if (erreur || !dossier) return (
    <div style={{ background: "#FEF2F2", border: "1px solid #B91C1C", borderRadius: "12px", padding: "24px", color: "#7F1D1D", fontSize: "14px" }}>
      {erreur || "Dossier introuvable."}
    </div>
  )

  const sequence   = buildSequence(dossier.type_mission)
  const couleur    = STATUT_COULEUR[dossier.statut] || STATUT_COULEUR["dossier_ouvert"]
  const expo       = dossier.actif?.exposition_rga ? EXPOSITION_RGA[dossier.actif.exposition_rga] : null
  const missionLabel = { amo: "AMO Études", moe: "MOE Travaux", amo_moe: "AMO + MOE Travaux" }[dossier.type_mission] || dossier.type_mission

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Bouton retour */}
      <button
        onClick={() => navigate("/client")}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748B", fontSize: "13px", cursor: "pointer", padding: 0, fontFamily: "inherit", width: "fit-content" }}
      >
        <i className="ti ti-arrow-left" style={{ fontSize: "15px" }} aria-hidden="true" />
        Retour au tableau de bord
      </button>

      {/* En-tête bien */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="ti ti-home" style={{ fontSize: "24px", color: "#B25C2A" }} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#0F172A", margin: 0, marginBottom: "4px" }}>
                {dossier.actif?.nom || "Bien immobilier"}
              </h2>
              <div style={{ fontSize: "13px", color: "#64748B" }}>
                {dossier.actif?.adresse}, {dossier.actif?.code_postal} {dossier.actif?.ville}
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                {expo && (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: expo.couleur, background: expo.couleur + "14", padding: "3px 8px", borderRadius: "4px", border: `1px solid ${expo.couleur}30` }}>
                    {expo.label}
                  </span>
                )}
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#B25C2A", background: "#FFF7ED", padding: "3px 8px", borderRadius: "4px", border: "1px solid #F5D0B0" }}>
                  {missionLabel}
                </span>
                {dossier.actif?.surface && (
                  <span style={{ fontSize: "11px", color: "#78716C", background: "#F8F7F4", padding: "3px 8px", borderRadius: "4px", border: "1px solid #E5E1DA" }}>
                    {dossier.actif.surface} m²
                  </span>
                )}
                {dossier.actif?.annee_construction && (
                  <span style={{ fontSize: "11px", color: "#78716C", background: "#F8F7F4", padding: "3px 8px", borderRadius: "4px", border: "1px solid #E5E1DA" }}>
                    Construit en {dossier.actif.annee_construction}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={() => navigate(`/client/documents-rga/${dossier.id}`)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-paperclip" style={{ fontSize: "14px" }} aria-hidden="true" />
              Documents
            </button>
            <button
              onClick={() => navigate("/client/messagerie")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-message" style={{ fontSize: "14px" }} aria-hidden="true" />
              Messagerie
            </button>
          </div>
        </div>
      </div>

      {/* Message consultant */}
      {dossier.notes_consultant && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BAD5F5", borderRadius: "12px", padding: "18px 22px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ width: 36, height: 36, borderRadius: "8px", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-message-dots" style={{ fontSize: "18px", color: "#0369A1" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#0369A1", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Message de votre consultant
              {dossier.consultant && ` — ${dossier.consultant.prenom} ${dossier.consultant.nom}`}
            </div>
            <div style={{ fontSize: "13px", color: "#1E3A5F", lineHeight: 1.6 }}>
              {dossier.notes_consultant}
            </div>
          </div>
        </div>
      )}

      {/* Statut courant + Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>

        {/* Statut courant */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>
            Statut actuel
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: couleur.bg, borderRadius: "10px", borderLeft: `3px solid ${couleur.border}`, marginBottom: "16px" }}>
            <i className={`ti ${couleur.icone}`} style={{ fontSize: "20px", color: couleur.border, flexShrink: 0 }} aria-hidden="true" />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: couleur.texte }}>
                {STATUT_LABEL[dossier.statut] || dossier.statut}
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                Mis à jour le {new Date(dossier.statut_updated_at).toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "4px" }}>Ouverture du dossier</div>
          <div style={{ fontSize: "13px", color: "#0F172A", marginBottom: "16px" }}>
            {new Date(dossier.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>

          {dossier.consultant && (
            <>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "4px" }}>Consultant AGE référent</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-user" style={{ fontSize: "14px", color: "#1D9E75" }} aria-hidden="true" />
                </div>
                <span style={{ fontSize: "13px", color: "#0F172A", fontWeight: 500 }}>
                  {dossier.consultant.prenom} {dossier.consultant.nom}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Timeline */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "16px" }}>
            Avancement du dossier
          </div>
          <Timeline sequence={sequence} statutCourant={dossier.statut} />
        </div>
      </div>

      {/* Documents récents */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Documents récents
          </div>
          <button
            onClick={() => navigate(`/client/documents-rga/${dossier.id}`)}
            style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", color: "#B25C2A", fontSize: "12px", fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
          >
            Voir tous les documents
            <i className="ti ti-arrow-right" style={{ fontSize: "13px" }} aria-hidden="true" />
          </button>
        </div>

        {dossier.documents.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#F8F7F4", borderRadius: "8px" }}>
            <i className="ti ti-file-off" style={{ fontSize: "18px", color: "#C4BDB6" }} aria-hidden="true" />
            <div style={{ fontSize: "13px", color: "#78716C" }}>Aucun document déposé pour l'instant.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dossier.documents.map(doc => {
              const statutDoc = STATUT_DOC_STYLE[doc.statut_doc] || STATUT_DOC_STYLE["depose"]
              return (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#F8F7F4", borderRadius: "8px", border: "1px solid #E5E1DA" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <i className="ti ti-file" style={{ fontSize: "16px", color: "#B25C2A" }} aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{doc.nom_fichier}</div>
                      <div style={{ fontSize: "11px", color: "#78716C", marginTop: "2px" }}>
                        {CATEGORIE_DOC_LABEL[doc.categorie] || doc.categorie} · {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: statutDoc.color }}>
                    {statutDoc.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Bouton dépôt document */}
        <button
          onClick={() => navigate(`/client/documents-rga/${dossier.id}`)}
          style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "14px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
        >
          <i className="ti ti-upload" style={{ fontSize: "15px", color: "#B25C2A" }} aria-hidden="true" />
          Déposer un document
        </button>
      </div>

    </div>
  )
}