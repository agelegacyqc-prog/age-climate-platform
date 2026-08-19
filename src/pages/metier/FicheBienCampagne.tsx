import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import CarteBienRisques from "../../components/CarteBienRisques"
import { fetchAndStoreGeorisques } from "../../lib/fetchGeorisques"
import { fetchAndStoreRga } from "../../lib/fetchRga"
import { detecterAleas, type AleaDetecte } from "../../lib/aleasGeorisques"

const WORKFLOW_ETAPES = [
  { id: "score_rga",     label: "Score climatique RGA" },
  { id: "prediag_ia",    label: "Pre-diagnostic IA" },
  { id: "restitution",   label: "Restitution client" },
  { id: "rapport_final", label: "Rapport final" },
]

export default function FicheBienCampagne() {
  const { id, bienId } = useParams()
  const navigate = useNavigate()

  const [bien, setBien] = useState<any>(null)
  const [reglementations, setReglementations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analyseLoading, setAnalyseLoading] = useState(false)
  const [georisquesData, setGeorisquesData] = useState<any>(null)
  const [aleasDetectes, setAleasDetectes] = useState<AleaDetecte[]>([])
  const [savingRga, setSavingRga] = useState(false)
  const [workflow, setWorkflow] = useState<Record<string, boolean>>({})
  const [noteConsultant, setNoteConsultant] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => { load() }, [bienId])

  async function load() {
    const { data: bienData } = await supabase.from("actifs").select("*").eq("id", bienId).single()
    const { data: reglData } = await supabase.from("actifs_reglementaire").select("*").eq("actif_id", bienId)
    setBien(bienData)
    setReglementations(reglData || [])
    setNoteConsultant(bienData?.note_consultant || "")
    if (bienData?.workflow_age) setWorkflow(bienData.workflow_age)
    setLoading(false)

    if (bienData) {
      if (!bienData.georisques_data) {
        // Pas de donnees stockees -> on va les chercher (met aussi a jour actifs.georisques_data)
        const data = await fetchAndStoreGeorisques(bienData)
        setGeorisquesData(data)
        setAleasDetectes(detecterAleas(data, bienData.exposition_rga ?? null))
      } else {
        // Donnees deja stockees -> pas de refetch, juste redetection
        setGeorisquesData(bienData.georisques_data)
        setAleasDetectes(detecterAleas(bienData.georisques_data, bienData.exposition_rga ?? null))
      }
    }
  }

  async function lancerAnalyse() {
    if (!bien) return
    setAnalyseLoading(true)

    // Vraie relance : on re-interroge Georisques (via la source officielle
    // fetchAndStoreGeorisques, deja utilisee par NouvelActif.tsx) et on
    // redetecte les alea a partir de la reponse fraiche.
  const data = await fetchAndStoreGeorisques(bien)
    const niveauRgaAuto = await fetchAndStoreRga(bien)
    setGeorisquesData(data)
    setAleasDetectes(detecterAleas(data, niveauRgaAuto))

    const newWorkflow = { ...workflow, score_rga: true, prediag_ia: true }
    await supabase.from("actifs").update({
      statut_analyse: "en_cours",
      workflow_age: newWorkflow,
    }).eq("id", bien.id)
    setBien({ ...bien, statut_analyse: "en_cours" })
    setWorkflow(newWorkflow)
    setAnalyseLoading(false)
  }

  async function toggleEtape(etapeId: string) {
    const newWorkflow = { ...workflow, [etapeId]: !workflow[etapeId] }
    setWorkflow(newWorkflow)
    await supabase.from("actifs").update({ workflow_age: newWorkflow }).eq("id", bien.id)
  }

  async function sauvegarderNote() {
    setSavingNote(true)
    await supabase.from("actifs").update({ note_consultant: noteConsultant }).eq("id", bien.id)
    setSavingNote(false)
  }

  const nbEtapesCompletes = WORKFLOW_ETAPES.filter(e => workflow[e.id]).length
  const pctWorkflow = Math.round((nbEtapesCompletes / WORKFLOW_ETAPES.length) * 100)

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement...</div>
  if (!bien) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Bien introuvable</div>

  // Badge par alea — memes libelles/couleurs que NouvelActif.tsx (etape 4),
  // aucune valeur inventee ici.
  function badgeAlea(a: AleaDetecte): { label: string; bg: string; color: string } {
    if (a.alea === "rga") {
      return a.niveau
        ? { label: `RGA ${a.niveau}`, bg: a.niveau === "forte" ? "#FEF2F2" : a.niveau === "moyenne" ? "#FFFBEB" : "#F0FDF4", color: a.niveau === "forte" ? "#B91C1C" : a.niveau === "moyenne" ? "#D97706" : "#2F7D5C" }
        : { label: "Non renseigné", bg: "#F4F3F0", color: "#78716C" }
    }
    if (!a.automatise) return { label: "À évaluer", bg: "#F4F3F0", color: "#78716C" }
    if (a.present === null) return { label: "Non disponible", bg: "#F4F3F0", color: "#78716C" }
if (a.present) return { label: "Présent", bg: "#FEF2F2", color: "#B91C1C" }
    return { label: "Non détecté", bg: "#F0FDF4", color: "#2F7D5C" }
  }

  async function updateExpositionRga(valeur: string) {
    if (!bien) return
    setSavingRga(true)
    const { error } = await supabase.from("actifs").update({ exposition_rga: valeur || null }).eq("id", bien.id)
    if (!error) {
      const bienMaj = { ...bien, exposition_rga: valeur || null }
      setBien(bienMaj)
      setAleasDetectes(detecterAleas(georisquesData, valeur || null))
    }
    setSavingRga(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <button
        onClick={() => navigate("/metier/campagnes/" + id)}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit", width: "fit-content" }}
      >
        <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
      </button>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "9px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-building" style={{ fontSize: "22px", color: "#94A3B8" }} />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>
              {bien.nom_proprietaire ? bien.nom_proprietaire + " - " : ""}{bien.nom}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              {bien.adresse}, {bien.ville} {bien.code_postal}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={lancerAnalyse}
            disabled={analyseLoading}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="ti ti-player-play" style={{ fontSize: "14px" }} />
            {analyseLoading ? "Analyse..." : aleasDetectes.length > 0 ? "Relancer" : "Lancer l'analyse"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Coordonnees</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {bien.nom_proprietaire && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0F172A" }}>
                  <i className="ti ti-user" style={{ fontSize: "14px", color: "#94A3B8" }} />
                  {bien.nom_proprietaire}
                </div>
              )}
              {bien.telephone_client ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0369A1" }}>
                  <i className="ti ti-phone" style={{ fontSize: "14px", color: "#94A3B8" }} />
                  {bien.telephone_client}
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>Tel non renseigne</div>
              )}
              {bien.email_client ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0369A1" }}>
                  <i className="ti ti-mail" style={{ fontSize: "14px", color: "#94A3B8" }} />
                  {bien.email_client}
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>Email non renseigne</div>
              )}
            </div>
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Caracteristiques</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {([
                ["Type", bien.type_batiment || "-"],
                ["Surface", bien.surface ? bien.surface + " m2" : "-"],
                ["Annee", String(bien.annee_construction || "-")],
                ["Secteur", bien.secteur_activite || "-"],
                ["Valeur", bien.valeur_marche ? bien.valeur_marche.toLocaleString("fr-FR") + " EUR" : "-"],
                ["Type bien", bien.type_bien || "-"],
              ] as [string, string][]).map(([k, v], i) => (
                <div key={i}>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>{k}</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <span>Donnees Georisques</span><a href={"https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi?adresse=" + encodeURIComponent((bien.adresse || "") + " " + (bien.code_postal || "") + " " + (bien.ville || ""))} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#0369A1", textDecoration: "none", fontWeight: 400 }}>Voir sur Georisques</a>
            </div>
            {georisquesData ? (
              <div style={{ fontSize: "12px", color: "#064F36", background: "#ECFDF5", padding: "8px 12px", borderRadius: "6px" }}>
                Donnees recuperees
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>Chargement...</div>
            )}
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Aléas climatiques</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
       {aleasDetectes.map((a, i) => {
                const badge = badgeAlea(a)
                return (
                  <div key={i} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", marginBottom: "6px" }}>{a.label}</div>
                    {a.alea === "rga" ? (
                      <select
                        value={bien.exposition_rga || ""}
                        onChange={e => updateExpositionRga(e.target.value)}
                        disabled={savingRga}
                        style={{ fontSize: "11px", fontWeight: 700, padding: "3px 6px", borderRadius: "6px", border: "1px solid #E2E8F0", background: badge.bg, color: badge.color, cursor: savingRga ? "wait" : "pointer", fontFamily: "inherit" }}
                      >
                        <option value="">Non renseigné</option>
                        <option value="forte">Forte</option>
                        <option value="moyenne">Moyenne</option>
                        <option value="faible">Faible</option>
                        <option value="non_expose">Non exposé</option>
                      </select>
                    ) : (
                      <span style={{ display: "inline-block", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "10px", lineHeight: 1.5 }}>
              Chaleur, sécheresse et épisodes froids ne sont pas détectables automatiquement — évaluation complète lors d'une mission AGE.
            </div>
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Workflow AGE</div>
              <span style={{ fontSize: "12px", color: "#64748B" }}>{nbEtapesCompletes}/{WORKFLOW_ETAPES.length} - {pctWorkflow}%</span>
            </div>
            <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "6px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ background: "#0F6E56", width: pctWorkflow + "%", height: "100%", borderRadius: "3px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {WORKFLOW_ETAPES.map((etape, i) => {
                const done = workflow[etape.id]
                return (
                  <div
                    key={i}
                    onClick={() => toggleEtape(etape.id)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: done ? "#ECFDF5" : "#F8FAFC", borderRadius: "8px", border: "1px solid " + (done ? "#A7F3D0" : "#E2E8F0"), cursor: "pointer" }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#0F6E56" : "#E2E8F0" }}>
                      {done
                        ? <i className="ti ti-check" style={{ fontSize: "11px", color: "white" }} />
                        : <span style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8" }}>{i + 1}</span>
                      }
                    </div>
                    <span style={{ flex: 1, fontSize: "12px", color: done ? "#065F46" : "#0F172A" }}>{etape.label}</span>
                    {done && <span style={{ fontSize: "11px", color: "#065F46" }}>OK</span>}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "8px" }}>Note consultant</div>
          <textarea
            rows={6}
            value={noteConsultant}
            onChange={e => setNoteConsultant(e.target.value)}
            placeholder="Observations..."
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const }}
          />
          <button
            onClick={sauvegarderNote}
            disabled={savingNote}
            style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", padding: "6px 14px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="ti ti-device-floppy" style={{ fontSize: "13px" }} />
            {savingNote ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>
            Localisation
          </div>
          <CarteBienRisques
            adresse={bien.adresse || ""}
            ville={bien.ville || ""}
            codePostal={bien.code_postal || ""}
          />
        </div>

      </div>

    </div>
  )
}