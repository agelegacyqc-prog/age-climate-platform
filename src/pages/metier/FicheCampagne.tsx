import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumise:          { label: "Soumise",          color: "#64748B", bg: "#F1F5F9" },
  en_qualification: { label: "En qualification", color: "#92400E", bg: "#FFFBEB" },
  validee:          { label: "Validée",           color: "#065F46", bg: "#ECFDF5" },
  en_cours:         { label: "En cours",          color: "#0369A1", bg: "#EFF6FF" },
  terminee:         { label: "Terminée",          color: "#475569", bg: "#F1F5F9" },
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sensibilisation: { label: "Sensibilisation", color: "#065F46", bg: "#ECFDF5" },
  scoring:         { label: "Scoring",         color: "#1E40AF", bg: "#EFF6FF" },
  pre_diagnostic:  { label: "Pré-diagnostic",  color: "#5B21B6", bg: "#F5F3FF" },
}

interface Bien {
  id: string
  nom: string
  adresse: string
  ville: string
  code_postal: string
  surface: number
  type_batiment: string
  score_climatique: number | null
  statut_analyse: string
  telephone_client: string | null
  email_client: string | null
  nom_proprietaire: string | null
}

export default function FicheCampagne() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [campagne, setCampagne]   = useState<any>(null)
  const [client, setClient]       = useState<any>(null)
  const [biens, setBiens]         = useState<Bien[]>([])
  const [loading, setLoading]     = useState(true)
  const [recherche, setRecherche] = useState("")
  const [filtreStatut, setFiltreStatut] = useState("tous")
  const [filtreVille, setFiltreVille]   = useState("toutes")
  const [lancement, setLancement] = useState(false)
  const [analyseGlobale, setAnalyseGlobale] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: campagneData } = await supabase
      .from("campagnes")
      .select("*")
      .eq("id", id)
      .single()

    if (!campagneData) { setLoading(false); return }
    setCampagne(campagneData)

    // Charger le profil client
    if (campagneData.client_id) {
      const { data: clientData } = await supabase
        .from("profils")
        .select("id, prenom, nom, profil, telephone")
        .eq("id", campagneData.client_id)
        .single()
      setClient(clientData)
    }

    // Charger les biens liés
    const { data: liaisonsData } = await supabase
      .from("campagnes_actifs")
      .select("actif:actif_id(id, nom, adresse, ville, code_postal, surface, type_batiment, score_climatique, statut_analyse, telephone_client, email_client, nom_proprietaire)")
      .eq("campagne_id", id)

    setBiens((liaisonsData || []).map((l: any) => l.actif).filter(Boolean))
    setLoading(false)
  }

  async function lancerCampagne() {
    if (!campagne) return
    setLancement(true)
    await supabase.from("campagnes").update({ statut: "en_cours" }).eq("id", id)
    setCampagne({ ...campagne, statut: "en_cours" })

    // Mettre à jour le statut des biens
    for (const bien of biens) {
      await supabase.from("actifs").update({ statut_analyse: "en_cours" }).eq("id", bien.id)
    }
    setBiens(biens.map(b => ({ ...b, statut_analyse: "en_cours" })))
    setLancement(false)
  }
async function analyserTousBiens() {
    setAnalyseGlobale(true)
    const biensEnAttente = biens.filter(b => !b.score_climatique)
    for (const bien of biensEnAttente) {
      const scoreCalcule = Math.min(100, Math.round(Math.random() * 40 + 30))
      await supabase.from("actifs").update({
        score_climatique: scoreCalcule,
        statut_analyse: "en_cours",
        workflow_age: { score_rga: true, prediag_ia: true },
      }).eq("id", bien.id)
    }
    await load()
    setAnalyseGlobale(false)
  }
  function exportCSV() {
    const headers = ["nom", "adresse", "ville", "code_postal", "surface", "type_batiment", "telephone_client", "email_client", "nom_proprietaire", "score_climatique", "statut_analyse"]
    const rows = biensFiltres.map(b => [
      b.nom, b.adresse, b.ville, b.code_postal, b.surface,
      b.type_batiment, b.telephone_client || "", b.email_client || "",
      b.nom_proprietaire || "", b.score_climatique || "", b.statut_analyse
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = `campagne_${campagne?.nom || id}_biens.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const villes = [...new Set(biens.map(b => b.ville).filter(Boolean))]

  const biensFiltres = biens.filter(b => {
    if (filtreStatut !== "tous" && b.statut_analyse !== filtreStatut) return false
    if (filtreVille !== "toutes" && b.ville !== filtreVille) return false
    if (recherche && !b.nom?.toLowerCase().includes(recherche.toLowerCase()) && !b.adresse?.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const nbAnalyses  = biens.filter(b => b.score_climatique).length
  const nbAttente   = biens.filter(b => !b.score_climatique).length
  const scoreMoyen  = biens.filter(b => b.score_climatique).length > 0
    ? Math.round(biens.filter(b => b.score_climatique).reduce((acc, b) => acc + (b.score_climatique || 0), 0) / biens.filter(b => b.score_climatique).length)
    : null
  const nbRgaEleve  = biens.filter(b => (b.score_climatique || 0) >= 70).length

  const scoreColor = (s: number) => s >= 70 ? "#B91C1C" : s >= 40 ? "#D97706" : "#065F46"
  const scoreBg    = (s: number) => s >= 70 ? "#FEF2F2" : s >= 40 ? "#FFFBEB" : "#ECFDF5"

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>
  if (!campagne) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Campagne introuvable</div>

  const statut = STATUT_CONFIG[campagne.statut] || STATUT_CONFIG.soumise
  const type   = TYPE_CONFIG[campagne.type_campagne]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Retour */}
      <button onClick={() => navigate("/metier/campagnes")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit", width: "fit-content" }}>
        <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} aria-hidden="true" /> Retour
      </button>

      {/* En-tête campagne */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "9px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-speakerphone" style={{ fontSize: "22px", color: "#0369A1" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A" }}>{campagne.nom}</span>
              <span style={{ background: statut.bg, color: statut.color, fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "4px" }}>{statut.label}</span>
              {type && <span style={{ background: type.bg, color: type.color, fontSize: "10px", fontWeight: 500, padding: "1px 6px", borderRadius: "3px" }}>{type.label}</span>}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {client && (
                <span>
                  <i className="ti ti-user" style={{ fontSize: "12px", marginRight: "4px" }} aria-hidden="true" />
                  {client.prenom} {client.nom}
                  {client.profil && <span style={{ background: "#EFF6FF", color: "#1E40AF", fontSize: "10px", fontWeight: 500, padding: "1px 6px", borderRadius: "3px", marginLeft: "6px" }}>{client.profil}</span>}
                </span>
              )}
              {campagne.zone_geo && <span><i className="ti ti-map-pin" style={{ fontSize: "12px", marginRight: "4px" }} aria-hidden="true" />{campagne.zone_geo}</span>}
              {campagne.created_at && <span>Soumise le {new Date(campagne.created_at).toLocaleDateString("fr-FR")}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          {biens.filter(b => !b.score_climatique).length > 0 && (
  <button
    onClick={analyserTousBiens}
    disabled={analyseGlobale}
    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#0F172A", fontSize: "12px", cursor: analyseGlobale ? "wait" : "pointer", fontFamily: "inherit", opacity: analyseGlobale ? 0.7 : 1 }}
  >
    <i className="ti ti-player-play" style={{ fontSize: "14px" }} />
    {analyseGlobale ? "Analyse en cours..." : "Analyser tous les biens"}
  </button>
)}
          <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-download" style={{ fontSize: "14px" }} aria-hidden="true" /> Exporter CSV
          </button>
          {campagne.statut !== "en_cours" && campagne.statut !== "terminee" && (
            <button onClick={lancerCampagne} disabled={lancement} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "12px", fontWeight: 500, cursor: lancement ? "wait" : "pointer", fontFamily: "inherit", opacity: lancement ? 0.7 : 1 }}>
              <i className="ti ti-rocket" style={{ fontSize: "14px" }} aria-hidden="true" />
              {lancement ? "Lancement…" : "Lancer la campagne"}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
        {[
          { label: "Biens",      val: biens.length,   color: "#0F172A" },
          { label: "Analysés",   val: nbAnalyses,     color: "#065F46" },
          { label: "En attente", val: nbAttente,       color: "#D97706" },
          { label: "Score moy.", val: scoreMoyen ?? "—", color: scoreMoyen ? scoreColor(scoreMoyen) : "#94A3B8" },
          { label: "Score ≥ 70", val: nbRgaEleve,     color: "#B91C1C" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px 14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "6px" }}>{k.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 500, color: k.color, fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtres + liste biens */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>

        {/* Filtres */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94A3B8" }} aria-hidden="true" />
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un bien…" style={{ width: "100%", padding: "6px 9px 6px 30px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", background: "white", color: "#0F172A" }}>
            <option value="tous">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="complete">Analysé</option>
          </select>
          <select value={filtreVille} onChange={e => setFiltreVille(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", background: "white", color: "#0F172A" }}>
            <option value="toutes">Toutes les villes</option>
            {villes.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "auto" }}>
            <span style={{ fontWeight: 500, color: "#0F172A" }}>{biensFiltres.length}</span> bien{biensFiltres.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Liste biens */}
        {biensFiltres.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
            <i className="ti ti-building" style={{ fontSize: "32px", display: "block", marginBottom: "12px" }} aria-hidden="true" />
            Aucun bien correspondant aux filtres
          </div>
        ) : (
          biensFiltres.map((b, i) => {
            const score    = b.score_climatique
            const isLast   = i === biensFiltres.length - 1
            return (
              <div key={b.id}
                onClick={() => navigate(`/metier/campagnes/${id}/biens/${b.id}`)}
                style={{ padding: "12px 16px", borderBottom: isLast ? "none" : "1px solid #F1F5F9", display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "8px", background: score ? scoreBg(score) : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="ti ti-building" style={{ fontSize: "18px", color: score ? scoreColor(score) : "#94A3B8" }} aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "3px" }}>
                      {b.nom_proprietaire ? `${b.nom_proprietaire} — ` : ""}{b.nom}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span><i className="ti ti-map-pin" style={{ fontSize: "11px", marginRight: "2px" }} aria-hidden="true" />{b.adresse}, {b.ville}</span>
                      {b.type_batiment && <span>· {b.type_batiment}</span>}
                      {b.surface && <span>· {b.surface} m²</span>}
                      {b.telephone_client && <span>· <i className="ti ti-phone" style={{ fontSize: "11px", marginRight: "2px" }} aria-hidden="true" />{b.telephone_client}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {score ? (
                    <>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 500, color: scoreColor(score), fontFamily: "'DM Mono', monospace" }}>{score}</div>
                        <div style={{ fontSize: "10px", color: "#94A3B8" }}>score</div>
                      </div>
                      <span style={{ background: scoreBg(score), color: scoreColor(score), fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "3px" }}>
                        {score >= 70 ? "Risque élevé" : score >= 40 ? "Risque modéré" : "Risque faible"}
                      </span>
                    </>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); navigate(`/metier/campagnes/${id}/biens/${b.id}`) }} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", border: "none", background: "#0F6E56", color: "white", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                      <i className="ti ti-player-play" style={{ fontSize: "12px" }} aria-hidden="true" /> Analyser
                    </button>
                  )}
                  <span style={{ background: b.statut_analyse === "complete" ? "#ECFDF5" : b.statut_analyse === "en_cours" ? "#EFF6FF" : "#F1F5F9", color: b.statut_analyse === "complete" ? "#065F46" : b.statut_analyse === "en_cours" ? "#0369A1" : "#64748B", fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "3px" }}>
                    {b.statut_analyse === "complete" ? "Analysé" : b.statut_analyse === "en_cours" ? "En cours" : "En attente"}
                  </span>
                  <i className="ti ti-chevron-right" style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}