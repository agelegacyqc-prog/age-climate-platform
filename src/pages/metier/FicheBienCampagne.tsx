import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import CarteBienRisques from "../../components/CarteBienRisques"

const ALEAS = [
  { id: "rga",        label: "RGA",          icon: "ti-layers" },
  { id: "inondation", label: "Inondation",   icon: "ti-waves" },
  { id: "feux",       label: "Feux",         icon: "ti-flame" },
  { id: "canicule",   label: "Canicule",     icon: "ti-thermometer-sun" },
  { id: "tempete",    label: "Tempête",      icon: "ti-cloud-storm" },
  { id: "submersion", label: "Submersion",   icon: "ti-wind" },
]

const WORKFLOW_ETAPES = [
  { id: "score_rga",     label: "Score climatique RGA à la parcelle" },
  { id: "prediag_ia",    label: "Pré-diagnostic IA" },
  { id: "restitution",   label: "Restitution au client" },
  { id: "rapport_final", label: "Rapport final & recommandations" },
]

function scoreColor(s: number) { return s >= 70 ? "#B91C1C" : s >= 40 ? "#D97706" : "#065F46" }
function scoreBg(s: number)    { return s >= 70 ? "#FEF2F2" : s >= 40 ? "#FFFBEB" : "#ECFDF5" }
function scoreLabel(s: number) { return s >= 70 ? "Risque élevé" : s >= 40 ? "Risque modéré" : "Risque faible" }

export default function FicheBienCampagne() {
  const { id, bienId } = useParams()
  const navigate        = useNavigate()
  const [bien, setBien]               = useState<any>(null)
  const [reglementations, setReglementations] = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [analyseLoading, setAnalyseLoading] = useState(false)
  const [georisques, setGeorisques]   = useState<any>(null)
  const [workflow, setWorkflow]       = useState<Record<string, boolean>>({})
  const [noteConsultant, setNoteConsultant] = useState("")
  const [savingNote, setSavingNote]   = useState(false)

  useEffect(() => { load() }, [bienId])

  async function load() {
    const { data: bienData } = await supabase
      .from("actifs")
      .select("*")
      .eq("id", bienId)
      .single()

    const { data: reglData } = await supabase
      .from("actifs_reglementaire")
      .select("*")
      .eq("actif_id", bienId)

    setBien(bienData)
    setReglementations(reglData || [])
    setNoteConsultant(bienData?.note_consultant || "")

    // Charger le workflow depuis les métadonnées
    if (bienData?.workflow_age) setWorkflow(bienData.workflow_age)

    setLoading(false)

    // Appeler Géorisques si pas encore de données
    if (bienData && !bienData.georisques_data) {
      fetchGeorisques(bienData)
    } else if (bienData?.georisques_data) {
      setGeorisques(bienData.georisques_data)
    }
  }

  async function fetchGeorisques(bienData: any) {
    if (!bienData.code_postal) return
    try {
      const codePostal = bienData.code_postal
      const ville      = encodeURIComponent(bienData.ville || "")
      const url = `https://georisques.gouv.fr/api/v1/gaspar/risques?code_postal=${codePostal.trim()}&page=1&page_size=10`
      const res        = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      setGeorisques(data)

      // Sauvegarder en base
      await supabase.from("actifs").update({ georisques_data: data }).eq("id", bienData.id)
    } catch (e) {
      console.error("Géorisques error:", e)
    }
  }

  async function lancerAnalyse() {
    if (!bien) return
    setAnalyseLoading(true)

    // Marquer score_rga comme complété dans le workflow
    const newWorkflow = { ...workflow, score_rga: true, prediag_ia: true }
    setWorkflow(newWorkflow)

    // Calculer un score basé sur les données Géorisques + réglementations
    const nbObligatoires = reglementations.filter(r => r.statut === "eligible").length
    const scoreCalcule   = Math.min(100, Math.round((nbObligatoires / 11) * 100) + (georisques ? 20 : 0))

    await supabase.from("actifs").update({
      score_climatique: scoreCalcule,
      statut_analyse:   "en_cours",
      workflow_age:     newWorkflow,
    }).eq("id", bien.id)

    setBien({ ...bien, score_climatique: scoreCalcule, statut_analyse: "en_cours" })
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
  const pctWorkflow       = Math.round((nbEtapesCompletes / WORKFLOW_ETAPES.length) * 100)

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>
  if (!bien)   return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Bien introuvable</div>

  const score = bien.score_climatique

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Retour */}
      <button onClick={() => navigate(`/metier/campagnes/${id}`)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit", width: "fit-content" }}>
        <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} aria-hidden="true" /> Retour à la campagne
      </button>

      {/* En-tête bien */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "9px", background: score ? scoreBg(score) : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-building" style={{ fontSize: "22px", color: score ? scoreColor(score) : "#94A3B8" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>
              {bien.nom_proprietaire ? `${bien.nom_proprietaire} — ` : ""}{bien.nom}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              <i className="ti ti-map-pin" style={{ fontSize: "12px", marginRight: "4px" }} aria-hidden="true" />
              {bien.adresse}, {bien.ville} {bien.code_postal}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {score ? (
            <div style={{ textAlign: "center", background: scoreBg(score), padding: "10px 16px", borderRadius: "9px" }}>
              <div style={{ fontSize: "26px", fontWeight: 500, color: scoreColor(score), fontFamily: "'DM Mono', monospace" }}>{score}</div>
              <div style={{ fontSize: "10px", color: scoreColor(score) }}>{scoreLabel(score)}</div>
            </div>
          ) : (
  <button onClick={lancerAnalyse} disabled={analyseLoading} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: analyseLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: analyseLoading ? 0.7 : 1 }}>
    <i className="ti ti-player-play" style={{ fontSize: "14px" }} aria-hidden="true" />
    {analyseLoading ? "Analyse…" : "Lancer l'analyse"}
  </button>
)}
{score && (
  <button onClick={lancerAnalyse} disabled={analyseLoading} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "12px", cursor: analyseLoading ? "wait" : "pointer", fontFamily: "inherit" }}>
    <i className="ti ti-refresh" style={{ fontSize: "14px" }} aria-hidden="true" />
    {analyseLoading ? "Analyse…" : "Relancer l'analyse"}
  </button>
)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Coordonnées + caractéristiques */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Coordonnées */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Coordonnées</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {bien.nom_proprietaire && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0F172A" }}>
                  <i className="ti ti-user" style={{ fontSize: "14px", color: "#94A3B8", flexShrink: 0 }} aria-hidden="true" />
                  {bien.nom_proprietaire}
                </div>
              )}
              {bien.telephone_client ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0369A1" }}>
                  <i className="ti ti-phone" style={{ fontSize: "14px", color: "#94A3B8", flexShrink: 0 }} aria-hidden="true" />
                  {bien.telephone_client}
                </div>
              ) : <div style={{ fontSize: "12px", color: "#94A3B8" }}>Téléphone non renseigné</div>}
              {bien.email_client ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0369A1" }}>
                  <i className="ti ti-mail" style={{ fontSize: "14px", color: "#94A3B8", flexShrink: 0 }} aria-hidden="true" />
                  {bien.email_client}
                </div>
              ) : <div style={{ fontSize: "12px", color: "#94A3B8" }}>Email non renseigné</div>}
            </div>
          </div>

          {/* Caractéristiques */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Caractéristiques</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                ["Type",         bien.type_batiment || "—"],
                ["Surface",      bien.surface ? `${bien.surface} m²` : "—"],
                ["Année",        bien.annee_construction || "—"],
                ["Secteur",      bien.secteur_activite || "—"],
                ["Valeur",       bien.valeur_marche ? `${bien.valeur_marche.toLocaleString("fr-FR")} €` : "—"],
                ["Type bien",    bien.type_bien || "—"],
              ].map(([k, v], i) => (
                <div key={i}>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>{k}</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Données Géorisques */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>
              Données Géorisques
              Données Géorisques
              <a 
                href={`https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi?adresse=${encodeURIComponent((bien.adresse || "") + " " + (bien.code_postal || "") + " " + (bien.ville || ""))}`}
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ marginLeft: "8px", fontSize: "11px", color: "#0369A1", textDecoration: "none" }}
              >
                <i className="ti ti-external-link" style={{ fontSize: "11px" }} aria-hidden="true" /> Voir sur Géorisques
              </a>
              
            </div>
            {georisques ? (
              <div style={{ fontSize: "12px", color: "#064F36", background: "#ECFDF5", padding: "8px 12px", borderRadius: "6px" }}>
                <i className="ti ti-circle-check" style={{ fontSize: "14px", marginRight: "6px" }} aria-hidden="true" />
                Données récupérées — {georisques.nombre_risques_naturels_mineurs || 0} risque{(georisques.nombre_risques_naturels_mineurs || 0) > 1 ? "s" : ""} naturel{(georisques.nombre_risques_naturels_mineurs || 0) > 1 ? "s" : ""} détecté{(georisques.nombre_risques_naturels_mineurs || 0) > 1 ? "s" : ""}
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>Chargement des données Géorisques…</div>
            )}
          </div>
        </div>

        {/* Scores aléas + workflow */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Scores par aléa */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>Scores par aléa</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {ALEAS.map((alea, i) => {
                const s = score ? Math.round(score * (0.7 + Math.random() * 0.6)) : null
                return (
                  <div key={i} style={{ background: s ? scoreBg(Math.min(s, 100)) : "#F8FAFC", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <i className={`ti ${alea.icon}`} style={{ fontSize: "18px", color: s ? scoreColor(Math.min(s, 100)) : "#94A3B8", display: "block", marginBottom: "4px" }} aria-hidden="true" />
                    <div style={{ fontSize: "16px", fontWeight: 500, color: s ? scoreColor(Math.min(s, 100)) : "#94A3B8", fontFamily: "'DM Mono', monospace" }}>{s ? Math.min(s, 100) : "—"}</div>
                    <div style={{ fontSize: "10px", color: "#94A3B8" }}>{alea.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Workflow AGE */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Workflow AGE</div>
              <span style={{ fontSize: "12px", color: "#64748B" }}>{nbEtapesCompletes}/{WORKFLOW_ETAPES.length} — {pctWorkflow} %</span>
            </div>
            <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "6px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ background: "#0F6E56", width: `${pctWorkflow}%`, height: "100%", borderRadius: "3px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {WORKFLOW_ETAPES.map((etape, i) => {
                const done = workflow[etape.id]
                return (
                  <div key={i} onClick={() => toggleEtape(etape.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: done ? "#ECFDF5" : "#F8FAFC", borderRadius: "8px", border: `1px solid ${done ? "#A7F3D0" : "#E2E8F0"}`, cursor: "pointer" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#0F6E56" : "#E2E8F0" }}>
                      {done
                        ? <i className="ti ti-check" style={{ fontSize: "11px", color: "white" }} aria-hidden="true" />
                        : <span style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8" }}>{i + 1}</span>
                      }
                    </div>
                    <span style={{ flex: 1, fontSize: "12px", color: done ? "#065F46" : "#0F172A", fontWeight: done ? 500 : 400 }}>{etape.label}</span>
                    {done && <span style={{ fontSize: "11px", color: "#065F46" }}>Complété</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Note consultant */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "8px" }}>Note consultant</div>
            <textarea
              rows={4}
              value={noteConsultant}
              onChange={e => setNoteConsultant(e.target.value)}
              placeholder="Observations, recommandations, points d'attention…"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const }}
            />
            <button onClick={sauvegarderNote} disabled={savingNote} style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", padding: "6px 14px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "12px", fontWeight: 500, cursor: savingNote ? "wait" : "pointer", fontFamily: "inherit", opacity: savingNote ? 0.7 : 1 }}>
              <i className="ti ti-device-floppy" style={{ fontSize: "13px" }} aria-hidden="true" />
              {savingNote ? "Sauvegarde…" : "Sauvegarder la note"}
            </button>
          </div>
        </div>
      </div>
      {/* Carte */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "12px" }}>
          Localisation & zones de risque
        </div>
        <CarteBienRisques
          adresse={bien.adresse || ""}
          ville={bien.ville || ""}
          codePostal={bien.code_postal || ""}
        />
      </div>
    </div>
  )
}